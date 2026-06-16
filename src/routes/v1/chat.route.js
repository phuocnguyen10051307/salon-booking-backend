import express from 'express'

import { authMiddleware } from '../../middlewares/auth.middleware.js'
import { chatMessagesController } from '../../controllers/chat_messages.controller.js'

const Router = express.Router()
const protectedRoute = authMiddleware.protectedRoute

Router.get('/messages', protectedRoute, chatMessagesController.listChatMessages)
Router.post('/messages', protectedRoute, chatMessagesController.createChatMessage)
Router.delete('/messages/:id', protectedRoute, chatMessagesController.deleteChatMessage)

export const chatRoute = Router
