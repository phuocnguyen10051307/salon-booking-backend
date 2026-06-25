import express from 'express'

import { authMiddleware } from '../../middlewares/auth.middleware.js'
import { salonLocationsController } from '../../controllers/salon_locations.controller.js'

const Router = express.Router()
const protectedRoute = authMiddleware.protectedRoute
const adminOnly = authMiddleware.requireRoles('ADMIN')

Router.get('/', salonLocationsController.listLocations)
Router.get('/:id', salonLocationsController.getLocation)
Router.post('/', protectedRoute, adminOnly, salonLocationsController.createLocation)
Router.put('/:id', protectedRoute, adminOnly, salonLocationsController.updateLocation)
Router.delete('/:id', protectedRoute, adminOnly, salonLocationsController.deleteLocation)

export const locationsRoute = Router


