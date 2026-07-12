import asyncHandler from 'express-async-handler'
import { StatusCodes } from 'http-status-codes'

import { chatService } from '../services/chat.service.js'
import { ok } from './helpers.js'

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

export const chatMessagesController = {
  createConversation,
  listConversations,
  getMessages,
  markRead,
}
