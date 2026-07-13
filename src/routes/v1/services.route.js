import express from 'express'

import { authMiddleware } from '../../middlewares/auth.middleware.js'
import { servicesController } from '../../controllers/services.controller.js'

const Router = express.Router()
const protectedRoute = authMiddleware.protectedRoute
const adminOnly = authMiddleware.requireRoles('ADMIN')

Router.get('/', servicesController.listServices)
Router.get('/:id', servicesController.getService)
Router.post('/', protectedRoute, adminOnly, servicesController.createService)
Router.put('/:id', protectedRoute, adminOnly, servicesController.updateService)
Router.delete('/:id', protectedRoute, adminOnly, servicesController.deleteService)

export const servicesRoute = Router


