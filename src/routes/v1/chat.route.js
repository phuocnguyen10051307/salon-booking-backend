import express from 'express'

import { chatMessagesController } from '../../controllers/chat_messages.controller.js'
import { authMiddleware } from '../../middlewares/auth.middleware.js'
import { validate } from '../../middlewares/validation.middleware.js'
import { chatValidation } from '../../validations/chat.validation.js'

const Router = express.Router()
const protectedRoute = authMiddleware.protectedRoute
const staffOrCustomer = authMiddleware.requireRoles('STAFF', 'CUSTOMER')
const staffOnly = authMiddleware.requireRoles('STAFF')

Router.use(protectedRoute, staffOrCustomer)

Router.post(
  '/conversations',
  validate(chatValidation.createConversationSchema),
  chatMessagesController.createConversation
)
Router.get(
  '/conversations',
  validate(chatValidation.listConversationsQuerySchema, 'query'),
  chatMessagesController.listConversations
)
Router.get(
  '/conversations/:id/messages',
  validate(chatValidation.conversationParamsSchema, 'params'),
  validate(chatValidation.messageHistoryQuerySchema, 'query'),
  chatMessagesController.getMessages
)
Router.patch(
  '/conversations/:id/read',
  validate(chatValidation.conversationParamsSchema, 'params'),
  validate(chatValidation.markReadSchema),
  chatMessagesController.markRead
)

Router.get(
  '/messages',
  validate(chatValidation.legacyListQuerySchema, 'query'),
  chatMessagesController.listChatMessages
)
Router.post('/messages', validate(chatValidation.legacyCreateSchema), chatMessagesController.createChatMessage)
Router.delete(
  '/messages/:id',
  staffOnly,
  validate(chatValidation.conversationParamsSchema, 'params'),
  chatMessagesController.deleteChatMessage
)

export const chatRoute = Router
