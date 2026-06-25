import express from 'express'

import { authMiddleware } from '../../middlewares/auth.middleware.js'
import { adminController } from '../../controllers/admin.controller.js'
import { bookingsController } from '../../controllers/bookings.controller.js'
import { usersController } from '../../controllers/users.controller.js'

const Router = express.Router()
const protectedRoute = authMiddleware.protectedRoute
const adminOnly = authMiddleware.requireRoles('ADMIN')

Router.get('/bookings', protectedRoute, adminOnly, bookingsController.listAdminBookings)
Router.get('/bookings/:id', protectedRoute, adminOnly, bookingsController.getBooking)
Router.patch('/bookings/:id/status', protectedRoute, adminOnly, bookingsController.updateBookingStatus)

Router.get('/dashboard', protectedRoute, adminOnly, adminController.dashboard)
Router.get('/statistics/bookings', protectedRoute, adminOnly, adminController.bookingStatistics)
Router.get('/statistics/revenue', protectedRoute, adminOnly, adminController.revenueStatistics)
Router.get('/statistics/services', protectedRoute, adminOnly, adminController.serviceStatistics)
Router.get('/statistics/customers', protectedRoute, adminOnly, adminController.customerStatistics)

Router.get('/users', protectedRoute, adminOnly, usersController.listAdminUsers)
Router.get('/users/:id', protectedRoute, adminOnly, usersController.getAdminUser)
Router.post('/users', protectedRoute, adminOnly, usersController.createAdminUser)
Router.put('/users/:id', protectedRoute, adminOnly, usersController.updateAdminUser)
Router.patch('/users/:id/status', protectedRoute, adminOnly, usersController.updateAdminUserStatus)
Router.delete('/users/:id', protectedRoute, adminOnly, usersController.deleteAdminUser)

Router.get('/reports/revenue', protectedRoute, adminOnly, adminController.revenueStatistics)
Router.get('/reports/bookings', protectedRoute, adminOnly, adminController.bookingStatistics)
Router.get('/reports/services', protectedRoute, adminOnly, adminController.serviceStatistics)
Router.get('/reports/customers', protectedRoute, adminOnly, adminController.customerStatistics)

export const adminRoute = Router


