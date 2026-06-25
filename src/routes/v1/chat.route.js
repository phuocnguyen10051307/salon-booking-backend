import express from 'express'

import { authMiddleware } from '../../middlewares/auth.middleware.js'
import { chatMessagesController } from '../../controllers/chat_messages.controller.js'

const Router = express.Router()
const protectedRoute = authMiddleware.protectedRoute
const staffOrCustomer = authMiddleware.requireRoles('STAFF', 'CUSTOMER')
const staffOrAdmin = authMiddleware.requireRoles('STAFF', 'ADMIN')

Router.get('/messages', protectedRoute, staffOrCustomer, chatMessagesController.listChatMessages)
Router.post('/messages', protectedRoute, staffOrCustomer, chatMessagesController.createChatMessage)
Router.delete('/messages/:id', protectedRoute, staffOrAdmin, chatMessagesController.deleteChatMessage)

export const chatRoute = Router


