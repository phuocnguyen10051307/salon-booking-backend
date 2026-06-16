import express from 'express'

import { authMiddleware } from '../../middlewares/auth.middleware.js'
import { servicesController } from '../../controllers/services.controller.js'

const Router = express.Router()
const protectedRoute = authMiddleware.protectedRoute

Router.get('/', servicesController.listServices)
Router.get('/:id', servicesController.getService)
Router.post('/', protectedRoute, servicesController.createService)
Router.put('/:id', protectedRoute, servicesController.updateService)
Router.delete('/:id', protectedRoute, servicesController.deleteService)

export const servicesRoute = Router
