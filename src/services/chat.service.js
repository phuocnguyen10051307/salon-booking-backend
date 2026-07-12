import { StatusCodes } from 'http-status-codes'

import { prisma } from '../config/prisma.js'
import { Prisma } from '../generated/prisma/client.js'
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

const unreadCounts = async (conversations, user) => {
  if (!conversations.length) return new Map()
  const userId = userIdOf(user)
  const ids = conversations.map((conversation) => conversation.conversation_id)
  const rows = await prisma.$queryRaw(Prisma.sql`
    SELECT c.conversation_id AS id, COUNT(m.message_id)::int AS count
    FROM conversations c
    LEFT JOIN conversation_participants cp
      ON cp.conversation_id = c.conversation_id AND cp.user_id = ${userId}::uuid
    LEFT JOIN messages last_read ON last_read.message_id = cp.last_read_message_id
    LEFT JOIN messages m
      ON m.conversation_id = c.conversation_id
      AND m.sender_id IS DISTINCT FROM ${userId}::uuid
      AND (
        last_read.message_id IS NULL
        OR m.created_at > last_read.created_at
        OR (m.created_at = last_read.created_at AND m.message_id > last_read.message_id)
      )
    WHERE c.conversation_id IN (${Prisma.join(ids)})
    GROUP BY c.conversation_id
  `)
  return new Map(rows.map((row) => [row.id, Number(row.count)]))
}

const mapConversation = (conversation, user, unreadCount = 0) => {
  const customerRead = conversation.participants.find((item) => normalizeRole(item.user.role) === 'CUSTOMER')
  const staffReads = conversation.participants
    .filter((item) => normalizeRole(item.user.role) === 'STAFF' && item.last_read_at)
    .map((item) => item.last_read_at)

  return {
    id: conversation.conversation_id,
    customer: mapUser(conversation.customer, 'CUSTOMER'),
    title: roleOf(user) === 'CUSTOMER' ? 'Salon Support' : conversation.customer.full_name,
    lastMessage: conversation.messages[0] ? mapMessage(conversation.messages[0]) : null,
    unreadCount,
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

const getConversationRecord = async (conversationId, user, { join = false, requireParticipant = false } = {}) => {
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
  if (requireParticipant && !conversation.participants.some((item) => item.user_id === userIdOf(user))) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Join this conversation before using real-time features', 'FORBIDDEN')
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
  const counts = await unreadCounts([conversation], user)
  return mapConversation(conversation, user, counts.get(conversation.conversation_id))
}

const getConversation = async (conversationId, user, options) => {
  const conversation = await getConversationRecord(conversationId, user, options)
  const counts = await unreadCounts([conversation], user)
  return mapConversation(conversation, user, counts.get(conversation.conversation_id))
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
  const counts = await unreadCounts(page, user)
  return {
    conversations: page.map((conversation) =>
      mapConversation(conversation, user, counts.get(conversation.conversation_id))
    ),
    pageInfo: {
      hasNextPage,
      nextCursor: hasNextPage ? encodeCursor(page[page.length - 1]) : null,
    },
  }
}

const getMessages = async (conversationId, user, { before, limit = 30 } = {}) => {
  await getConversationRecord(conversationId, user, { join: true })
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

const sendMessage = async (conversationId, user, content) => {
  const conversation = await getConversationRecord(conversationId, user, { join: true })
  const senderId = userIdOf(user)
  const normalizedContent = normalizeContent(content)
  const message = await prisma.$transaction(async (tx) => {
    const created = await tx.messages.create({
      data: {
        conversation_id: conversation.conversation_id,
        sender_id: senderId,
        sender_role: roleOf(user),
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

export const chatService = {
  getOrCreateCustomerConversation,
  getConversation,
  listConversations,
  getMessages,
  sendMessage,
  markRead,
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
