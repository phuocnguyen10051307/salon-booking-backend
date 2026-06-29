import express from 'express'

import { authMiddleware } from '../../middlewares/auth.middleware.js'
import { salonLocationsController } from '../../controllers/salon_locations.controller.js'

const Router = express.Router()
const protectedRoute = authMiddleware.protectedRoute
const adminOnly = authMiddleware.requireRoles('ADMIN')

Router.get('/', salonLocationsController.getLocation)
Router.get('/map', salonLocationsController.getMapLocation)
Router.post('/', protectedRoute, adminOnly, salonLocationsController.createLocation)
Router.put('/', protectedRoute, adminOnly, salonLocationsController.updateLocation)
Router.delete('/', protectedRoute, adminOnly, salonLocationsController.deleteLocation)

export const locationsRoute = Router
