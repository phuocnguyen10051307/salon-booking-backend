import express from 'express'

import { authMiddleware } from '../../middlewares/auth.middleware.js'
import { bookingsController } from '../../controllers/bookings.controller.js'

const Router = express.Router()
const protectedRoute = authMiddleware.protectedRoute

Router.post('/', protectedRoute, bookingsController.createBooking)
Router.get('/', protectedRoute, bookingsController.listBookings)
Router.get('/:id', protectedRoute, bookingsController.getBooking)
Router.post('/:id/cancel', protectedRoute, bookingsController.cancelBooking)
Router.post('/:id/reschedule', protectedRoute, bookingsController.rescheduleBooking)
Router.get('/:id/reschedules', protectedRoute, bookingsController.getBookingReschedules)

export const bookingsRoute = Router
