import express from 'express'

import { authMiddleware } from '../../middlewares/auth.middleware.js'
import { adminController } from '../../controllers/admin.controller.js'
import { bookingsController } from '../../controllers/bookings.controller.js'
import { usersController } from '../../controllers/users.controller.js'

const Router = express.Router()
const protectedRoute = authMiddleware.protectedRoute

Router.get('/bookings', protectedRoute, bookingsController.listAdminBookings)
Router.get('/bookings/:id', protectedRoute, bookingsController.getBooking)
Router.patch('/bookings/:id/status', protectedRoute, bookingsController.updateBookingStatus)

Router.get('/dashboard', protectedRoute, adminController.dashboard)
Router.get('/statistics/bookings', protectedRoute, adminController.bookingStatistics)
Router.get('/statistics/revenue', protectedRoute, adminController.revenueStatistics)
Router.get('/statistics/services', protectedRoute, adminController.serviceStatistics)
Router.get('/statistics/customers', protectedRoute, adminController.customerStatistics)

Router.get('/users', protectedRoute, usersController.listAdminUsers)
Router.get('/users/:id', protectedRoute, usersController.getAdminUser)
Router.post('/users', protectedRoute, usersController.createAdminUser)
Router.put('/users/:id', protectedRoute, usersController.updateAdminUser)
Router.patch('/users/:id/status', protectedRoute, usersController.updateAdminUserStatus)
Router.delete('/users/:id', protectedRoute, usersController.deleteAdminUser)

Router.get('/reports/revenue', protectedRoute, adminController.revenueStatistics)
Router.get('/reports/bookings', protectedRoute, adminController.bookingStatistics)
Router.get('/reports/services', protectedRoute, adminController.serviceStatistics)
Router.get('/reports/customers', protectedRoute, adminController.customerStatistics)

export const adminRoute = Router
