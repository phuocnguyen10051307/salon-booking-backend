import express from 'express'

import { authMiddleware } from '../../middlewares/auth.middleware.js'
import { notificationsController } from '../../controllers/notifications.controller.js'

const Router = express.Router()
const protectedRoute = authMiddleware.protectedRoute

Router.get('/', protectedRoute, notificationsController.listNotifications)
Router.patch('/:id/read', protectedRoute, notificationsController.markNotificationRead)
Router.patch('/read-all', protectedRoute, notificationsController.markAllNotificationsRead)
Router.post('/', protectedRoute, notificationsController.createNotification)
Router.delete('/:id', protectedRoute, notificationsController.deleteNotification)

export const notificationsRoute = Router
