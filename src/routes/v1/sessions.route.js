import express from 'express'

import { authMiddleware } from '../../middlewares/auth.middleware.js'
import { sessionsController } from '../../controllers/sessions.controller.js'

const Router = express.Router()
const protectedRoute = authMiddleware.protectedRoute

Router.get('/', protectedRoute, sessionsController.listSessions)
Router.delete('/:id', protectedRoute, sessionsController.deleteSession)
Router.delete('/', protectedRoute, sessionsController.deleteAllSessions)

export const sessionsRoute = Router
