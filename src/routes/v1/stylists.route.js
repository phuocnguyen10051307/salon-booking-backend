import express from 'express'

import { authMiddleware } from '../../middlewares/auth.middleware.js'
import { stylistsController } from '../../controllers/stylists.controller.js'

const Router = express.Router()
const protectedRoute = authMiddleware.protectedRoute

Router.get('/', stylistsController.listStylists)
Router.get('/:id', stylistsController.getStylist)
Router.get('/:id/services', stylistsController.getStylistServices)
Router.post('/', protectedRoute, stylistsController.createStylist)
Router.put('/:id', protectedRoute, stylistsController.updateStylist)
Router.delete('/:id', protectedRoute, stylistsController.deleteStylist)
Router.post('/:id/services', protectedRoute, stylistsController.addStylistService)
Router.delete('/:id/services/:serviceId', protectedRoute, stylistsController.removeStylistService)

export const stylistsRoute = Router
