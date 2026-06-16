import express from 'express'

import { authMiddleware } from '../../middlewares/auth.middleware.js'
import { usersController } from '../../controllers/users.controller.js'

const Router = express.Router()
const protectedRoute = authMiddleware.protectedRoute

Router.get('/profile', protectedRoute, usersController.getProfile)
Router.put('/profile', protectedRoute, usersController.updateProfile)
Router.put('/change-password', protectedRoute, usersController.changePassword)

export const usersRoute = Router
