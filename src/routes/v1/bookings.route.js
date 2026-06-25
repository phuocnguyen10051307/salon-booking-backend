import express from 'express'

import { authMiddleware } from '../../middlewares/auth.middleware.js'
import { bookingsController } from '../../controllers/bookings.controller.js'

const Router = express.Router()
const protectedRoute = authMiddleware.protectedRoute
const customerOnly = authMiddleware.requireRoles('CUSTOMER')
const staffOrAdmin = authMiddleware.requireRoles('STAFF', 'ADMIN')

Router.get('/staff/today', protectedRoute, staffOrAdmin, bookingsController.listStaffTodayBookings)
Router.post('/checkout', protectedRoute, customerOnly, bookingsController.checkoutBooking)
Router.post('/', protectedRoute, customerOnly, bookingsController.createBooking)
Router.get('/', protectedRoute, customerOnly, bookingsController.listBookings)
Router.get('/:id', protectedRoute, customerOnly, bookingsController.getBooking)
Router.post('/:id/cancel', protectedRoute, customerOnly, bookingsController.cancelBooking)
Router.post('/:id/reschedule', protectedRoute, customerOnly, bookingsController.rescheduleBooking)
Router.get('/:id/reschedules', protectedRoute, customerOnly, bookingsController.getBookingReschedules)

export const bookingsRoute = Router
