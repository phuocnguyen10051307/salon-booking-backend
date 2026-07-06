import asyncHandler from 'express-async-handler'
import { StatusCodes } from 'http-status-codes'

import { chatService } from '../services/chat.service.js'
import ApiError from '../utils/ApiError.js'
import { getUserRole, ok } from './helpers.js'

const createConversation = asyncHandler(async (req, res) => {
  const conversation = await chatService.getOrCreateCustomerConversation(req.user)
  ok(res, 'Lay cuoc tro chuyen thanh cong', { conversation }, StatusCodes.CREATED)
})

const listConversations = asyncHandler(async (req, res) => {
  const result = await chatService.listConversations(req.user, req.query)
  ok(res, 'Lay danh sach cuoc tro chuyen thanh cong', result)
})

const getMessages = asyncHandler(async (req, res) => {
  const result = await chatService.getMessages(req.params.id, req.user, req.query)
  ok(res, 'Lay tin nhan thanh cong', result)
})

const markRead = asyncHandler(async (req, res) => {
  const receipt = await chatService.markRead(req.params.id, req.user, req.body.messageId)
  ok(res, 'Danh dau tin nhan da doc thanh cong', { receipt })
})

const resolveLegacyConversationId = async (req) => {
  const supplied = req.query.conversation_id || req.body?.conversation_id || req.body?.conversationId
  if (supplied) return supplied
  if (getUserRole(req) === 'CUSTOMER') {
    const conversation = await chatService.getOrCreateCustomerConversation(req.user)
    return conversation.id
  }
  throw new ApiError(StatusCodes.BAD_REQUEST, 'conversation_id is required for staff chat requests', 'VALIDATION_ERROR')
}

const toLegacyMessage = (message) => ({
  message_id: message.id,
  user_id: message.sender.id,
  sender_type: message.senderRole,
  message_content: message.content,
  sent_at: message.createdAt,
  conversation_id: message.conversationId,
})

const listChatMessages = asyncHandler(async (req, res) => {
  const conversationId = await resolveLegacyConversationId(req)
  const result = await chatService.getMessages(conversationId, req.user, { limit: 100 })
  ok(res, 'Lay tin nhan thanh cong', { messages: result.messages.map(toLegacyMessage) })
})

const createChatMessage = asyncHandler(async (req, res) => {
  const conversationId = await resolveLegacyConversationId(req)
  const message = await chatService.sendMessage(conversationId, req.user, {
    content: req.body.message_content || req.body.content,
    clientMessageId: `legacy-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  })
  ok(res, 'Gui tin nhan thanh cong', { message: toLegacyMessage(message) }, StatusCodes.CREATED)
})

const deleteChatMessage = asyncHandler(async (req, res) => {
  await chatService.deleteMessage(req.params.id, req.user)
  ok(res, 'Xoa tin nhan thanh cong')
})

export const chatMessagesController = {
  createConversation,
  listConversations,
  getMessages,
  markRead,
  listChatMessages,
  createChatMessage,
  deleteChatMessage,
}
