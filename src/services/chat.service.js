import { StatusCodes } from 'http-status-codes'

import { prisma } from '../config/prisma.js'
import ApiError from '../utils/ApiError.js'

export const CHAT_MESSAGE_MAX_LENGTH = 4000

const messageInclude = {
  sender: {
    select: {
      user_id: true,
      full_name: true,
      avatar_url: true,
      role: true,
    },
  },
}

const normalizeRole = (role) => role?.toString().toUpperCase()
const userIdOf = (user) => user?._id || user?.user_id
const roleOf = (user) => normalizeRole(user?.role)

const assertChatRole = (user) => {
  if (!['CUSTOMER', 'STAFF'].includes(roleOf(user))) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Chat is available only to customers and staff', 'ROLE_FORBIDDEN')
  }
}

const assertConversationAccess = (conversation, user) => {
  assertChatRole(user)
  if (roleOf(user) === 'CUSTOMER' && conversation.customer_id !== userIdOf(user)) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You do not have access to this conversation', 'FORBIDDEN')
  }
}

const hasReadThrough = (lastReadMessage, message) =>
  Boolean(
    lastReadMessage &&
    (lastReadMessage.created_at > message.created_at ||
      (lastReadMessage.created_at.getTime() === message.created_at.getTime() &&
        lastReadMessage.message_id >= message.message_id))
  )

const encodeCursor = (conversation) =>
  Buffer.from(
    JSON.stringify({
      updatedAt: conversation.updated_at.toISOString(),
      id: conversation.conversation_id,
    })
  ).toString('base64url')

const decodeCursor = (cursor) => {
  if (!cursor) return null
  try {
    const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'))
    const updatedAt = new Date(decoded.updatedAt)
    if (!decoded.id || Number.isNaN(updatedAt.getTime())) throw new Error('Invalid cursor')
    return { updatedAt, id: decoded.id }
  } catch {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid conversation cursor', 'VALIDATION_ERROR')
  }
}

const mapUser = (user, fallbackRole = null) => ({
  id: user?.user_id ?? null,
  displayName: user?.full_name ?? (fallbackRole === 'STAFF' ? 'Salon staff' : 'Unknown user'),
  avatarUrl: user?.avatar_url ?? null,
  role: normalizeRole(user?.role) ?? fallbackRole,
})

const mapMessage = (message) => ({
  id: message.message_id,
  conversationId: message.conversation_id,
  clientMessageId: message.client_message_id,
  content: message.content,
  senderRole: normalizeRole(message.sender_role),
  sender: mapUser(message.sender, normalizeRole(message.sender_role)),
  createdAt: message.created_at,
})

const conversationInclude = {
  customer: {
    select: {
      user_id: true,
      full_name: true,
      avatar_url: true,
      role: true,
    },
  },
  messages: {
    take: 1,
    orderBy: [{ created_at: 'desc' }, { message_id: 'desc' }],
    include: messageInclude,
  },
  participants: {
    include: {
      user: {
        select: { user_id: true, role: true },
      },
      last_read_message: {
        select: { created_at: true, message_id: true },
      },
    },
  },
}

const unreadCount = async (conversation, user) => {
  const userId = userIdOf(user)
  const participant = conversation.participants.find((item) => item.user_id === userId)
  return prisma.messages.count({
    where: {
      conversation_id: conversation.conversation_id,
      sender_id: { not: userId },
      ...(participant?.last_read_message
        ? {
            OR: [
              { created_at: { gt: participant.last_read_message.created_at } },
              {
                created_at: participant.last_read_message.created_at,
                message_id: { gt: participant.last_read_message.message_id },
              },
            ],
          }
        : {}),
    },
  })
}

const mapConversation = async (conversation, user) => {
  const customerRead = conversation.participants.find((item) => normalizeRole(item.user.role) === 'CUSTOMER')
  const staffReads = conversation.participants
    .filter((item) => normalizeRole(item.user.role) === 'STAFF' && item.last_read_at)
    .map((item) => item.last_read_at)

  return {
    id: conversation.conversation_id,
    customer: mapUser(conversation.customer, 'CUSTOMER'),
    title: roleOf(user) === 'CUSTOMER' ? 'Salon Support' : conversation.customer.full_name,
    lastMessage: conversation.messages[0] ? mapMessage(conversation.messages[0]) : null,
    unreadCount: await unreadCount(conversation, user),
    lastActivityAt: conversation.updated_at,
    createdAt: conversation.created_at,
    updatedAt: conversation.updated_at,
    readSummary: {
      customerReadAt: customerRead?.last_read_at ?? null,
      staffReadAt: staffReads.length ? new Date(Math.max(...staffReads.map((date) => date.getTime()))) : null,
    },
  }
}

const ensureParticipant = async (conversationId, userId) =>
  prisma.conversation_participants.upsert({
    where: { conversation_id_user_id: { conversation_id: conversationId, user_id: userId } },
    update: {},
    create: { conversation_id: conversationId, user_id: userId },
  })

const getConversationRecord = async (conversationId, user, { join = false } = {}) => {
  assertChatRole(user)
  const conversation = await prisma.conversations.findUnique({
    where: { conversation_id: conversationId },
    include: conversationInclude,
  })
  if (!conversation) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Conversation not found', 'NOT_FOUND')
  }
  assertConversationAccess(conversation, user)
  if (join) {
    await ensureParticipant(conversationId, userIdOf(user))
    return prisma.conversations.findUnique({
      where: { conversation_id: conversationId },
      include: conversationInclude,
    })
  }
  return conversation
}

const getOrCreateCustomerConversation = async (user) => {
  assertChatRole(user)
  if (roleOf(user) !== 'CUSTOMER') {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only customers can create support conversations', 'FORBIDDEN')
  }
  const userId = userIdOf(user)
  await prisma.conversations.upsert({
    where: { customer_id: userId },
    update: {},
    create: {
      customer_id: userId,
      participants: { create: { user_id: userId } },
    },
  })
  const conversation = await prisma.conversations.findUnique({
    where: { customer_id: userId },
    include: conversationInclude,
  })
  return mapConversation(conversation, user)
}

const getConversation = async (conversationId, user, options) => {
  const conversation = await getConversationRecord(conversationId, user, options)
  return mapConversation(conversation, user)
}

const listConversations = async (user, { cursor, limit = 20 } = {}) => {
  assertChatRole(user)
  const decodedCursor = decodeCursor(cursor)
  const where = {
    ...(roleOf(user) === 'CUSTOMER' ? { customer_id: userIdOf(user) } : {}),
    ...(decodedCursor
      ? {
          OR: [
            { updated_at: { lt: decodedCursor.updatedAt } },
            { updated_at: decodedCursor.updatedAt, conversation_id: { lt: decodedCursor.id } },
          ],
        }
      : {}),
  }
  const rows = await prisma.conversations.findMany({
    where,
    include: conversationInclude,
    orderBy: [{ updated_at: 'desc' }, { conversation_id: 'desc' }],
    take: limit + 1,
  })
  const hasNextPage = rows.length > limit
  const page = rows.slice(0, limit)
  return {
    conversations: await Promise.all(page.map((conversation) => mapConversation(conversation, user))),
    pageInfo: {
      hasNextPage,
      nextCursor: hasNextPage ? encodeCursor(page[page.length - 1]) : null,
    },
  }
}

const getMessages = async (conversationId, user, { before, limit = 30 } = {}) => {
  await getConversationRecord(conversationId, user)
  let beforeMessage = null
  if (before) {
    beforeMessage = await prisma.messages.findFirst({
      where: { message_id: before, conversation_id: conversationId },
      select: { message_id: true, created_at: true },
    })
    if (!beforeMessage) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid message cursor', 'VALIDATION_ERROR')
    }
  }
  const rows = await prisma.messages.findMany({
    where: {
      conversation_id: conversationId,
      ...(beforeMessage
        ? {
            OR: [
              { created_at: { lt: beforeMessage.created_at } },
              { created_at: beforeMessage.created_at, message_id: { lt: beforeMessage.message_id } },
            ],
          }
        : {}),
    },
    include: messageInclude,
    orderBy: [{ created_at: 'desc' }, { message_id: 'desc' }],
    take: limit + 1,
  })
  const hasMore = rows.length > limit
  const page = rows.slice(0, limit)
  const nextBefore = hasMore && page.length ? page[page.length - 1].message_id : null
  return {
    messages: page.reverse().map(mapMessage),
    pageInfo: {
      hasMore,
      nextBefore,
    },
  }
}

const normalizeContent = (content) => {
  const normalized = content?.toString().trim() ?? ''
  if (!normalized) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Message content is required', 'VALIDATION_ERROR')
  }
  if (normalized.length > CHAT_MESSAGE_MAX_LENGTH) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Message content cannot exceed ${CHAT_MESSAGE_MAX_LENGTH} characters`,
      'VALIDATION_ERROR'
    )
  }
  return normalized
}

const sendMessage = async (conversationId, user, { content, clientMessageId }) => {
  const conversation = await getConversationRecord(conversationId, user, { join: true })
  const senderId = userIdOf(user)
  const normalizedClientId = clientMessageId?.toString().trim()
  if (!normalizedClientId || normalizedClientId.length > 100) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'A valid clientMessageId is required', 'VALIDATION_ERROR')
  }
  const normalizedContent = normalizeContent(content)

  const existing = await prisma.messages.findUnique({
    where: {
      conversation_id_sender_id_client_message_id: {
        conversation_id: conversationId,
        sender_id: senderId,
        client_message_id: normalizedClientId,
      },
    },
    include: messageInclude,
  })
  if (existing) return mapMessage(existing)

  let message
  try {
    message = await prisma.$transaction(async (tx) => {
      const created = await tx.messages.create({
        data: {
          conversation_id: conversation.conversation_id,
          sender_id: senderId,
          sender_role: roleOf(user),
          client_message_id: normalizedClientId,
          content: normalizedContent,
        },
        include: messageInclude,
      })
      await tx.conversations.update({
        where: { conversation_id: conversationId },
        data: { last_message_at: created.created_at, updated_at: created.created_at },
      })
      return created
    })
  } catch (error) {
    if (error.code !== 'P2002') throw error
    message = await prisma.messages.findUnique({
      where: {
        conversation_id_sender_id_client_message_id: {
          conversation_id: conversationId,
          sender_id: senderId,
          client_message_id: normalizedClientId,
        },
      },
      include: messageInclude,
    })
    if (!message) throw error
  }
  return mapMessage(message)
}

const markRead = async (conversationId, user, messageId) => {
  await getConversationRecord(conversationId, user, { join: true })
  const message = await prisma.messages.findFirst({
    where: { message_id: messageId, conversation_id: conversationId },
    select: { message_id: true, created_at: true },
  })
  if (!message) throw new ApiError(StatusCodes.NOT_FOUND, 'Message not found', 'NOT_FOUND')

  const userId = userIdOf(user)
  const current = await prisma.conversation_participants.findUnique({
    where: { conversation_id_user_id: { conversation_id: conversationId, user_id: userId } },
    include: { last_read_message: { select: { created_at: true, message_id: true } } },
  })
  const isOlder = hasReadThrough(current?.last_read_message, message)
  const readAt = isOlder ? current.last_read_at : new Date()
  if (!isOlder) {
    await prisma.conversation_participants.update({
      where: { conversation_id_user_id: { conversation_id: conversationId, user_id: userId } },
      data: { last_read_message_id: messageId, last_read_at: readAt },
    })
  }
  return {
    conversationId,
    userId,
    role: roleOf(user),
    messageId: isOlder ? current.last_read_message_id : messageId,
    readAt,
  }
}

const deleteMessage = async (messageId, user) => {
  if (roleOf(user) !== 'STAFF') {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only staff can delete chat messages', 'FORBIDDEN')
  }
  const message = await prisma.messages.findUnique({ where: { message_id: messageId } })
  if (!message) throw new ApiError(StatusCodes.NOT_FOUND, 'Message not found', 'NOT_FOUND')
  await getConversationRecord(message.conversation_id, user)
  await prisma.messages.delete({ where: { message_id: messageId } })
  const latest = await prisma.messages.findFirst({
    where: { conversation_id: message.conversation_id },
    orderBy: [{ created_at: 'desc' }, { message_id: 'desc' }],
  })
  await prisma.conversations.update({
    where: { conversation_id: message.conversation_id },
    data: { last_message_at: latest?.created_at ?? null, updated_at: new Date() },
  })
}

export const chatService = {
  getOrCreateCustomerConversation,
  getConversation,
  listConversations,
  getMessages,
  sendMessage,
  markRead,
  deleteMessage,
  mapMessage,
  assertChatRole,
}

export const chatServiceInternals = {
  encodeCursor,
  decodeCursor,
  normalizeContent,
  assertConversationAccess,
  hasReadThrough,
}
