import express from 'express'

import { authMiddleware } from '../../middlewares/auth.middleware.js'
import { salonLocationsController } from '../../controllers/salon_locations.controller.js'

const Router = express.Router()
const protectedRoute = authMiddleware.protectedRoute

Router.get('/', salonLocationsController.listLocations)
Router.get('/:id', salonLocationsController.getLocation)
Router.post('/', protectedRoute, salonLocationsController.createLocation)
Router.put('/:id', protectedRoute, salonLocationsController.updateLocation)
Router.delete('/:id', protectedRoute, salonLocationsController.deleteLocation)

export const locationsRoute = Router
