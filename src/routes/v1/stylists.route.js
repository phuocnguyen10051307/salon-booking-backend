import express from 'express'

import { authMiddleware } from '../../middlewares/auth.middleware.js'
import { stylistsController } from '../../controllers/stylists.controller.js'

const Router = express.Router()
const protectedRoute = authMiddleware.protectedRoute
const adminOnly = authMiddleware.requireRoles('ADMIN')

Router.get('/', stylistsController.listStylists)
Router.get('/:id', stylistsController.getStylist)
Router.get('/:id/services', stylistsController.getStylistServices)
Router.post('/', protectedRoute, adminOnly, stylistsController.createStylist)
Router.put('/:id', protectedRoute, adminOnly, stylistsController.updateStylist)
Router.delete('/:id', protectedRoute, adminOnly, stylistsController.deleteStylist)
Router.post('/:id/services', protectedRoute, adminOnly, stylistsController.addStylistService)
Router.delete('/:id/services/:serviceId', protectedRoute, adminOnly, stylistsController.removeStylistService)

export const stylistsRoute = Router


