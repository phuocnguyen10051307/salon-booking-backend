import asyncHandler from 'express-async-handler'
import { StatusCodes } from 'http-status-codes'

import { prisma } from '../config/prisma.js'
import { getUserId, ok } from './helpers.js'

const listChatMessages = asyncHandler(async (req, res) => {
  const messages = await prisma.chat_messages.findMany({
    where: { user_id: getUserId(req) },
    orderBy: { sent_at: 'asc' },
  })
  ok(res, 'Lay tin nhan thanh cong', { messages })
})

const createChatMessage = asyncHandler(async (req, res) => {
  const message = await prisma.chat_messages.create({
    data: {
      user_id: getUserId(req),
      sender_type: req.body.sender_type || req.body.senderType || 'CUSTOMER',
      message_content: req.body.message_content || req.body.content,
    },
  })
  ok(res, 'Gui tin nhan thanh cong', { message }, StatusCodes.CREATED)
})

const deleteChatMessage = asyncHandler(async (req, res) => {
  await prisma.chat_messages.delete({ where: { message_id: req.params.id } })
  ok(res, 'Xoa tin nhan thanh cong')
})

export const chatMessagesController = {
  listChatMessages,
  createChatMessage,
  deleteChatMessage,
}
