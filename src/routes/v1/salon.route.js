import express from 'express'

import { authMiddleware } from '../../middlewares/auth.middleware.js'
import { adminController } from '../../controllers/admin.controller.js'
import { bookingCartsController } from '../../controllers/booking_carts.controller.js'
import { bookingsController } from '../../controllers/bookings.controller.js'
import { categoriesController } from '../../controllers/categories.controller.js'
import { chatMessagesController } from '../../controllers/chat_messages.controller.js'
import { notificationsController } from '../../controllers/notifications.controller.js'
import { promotionsController } from '../../controllers/promotions.controller.js'
import { salonLocationsController } from '../../controllers/salon_locations.controller.js'
import { servicesController } from '../../controllers/services.controller.js'
import { sessionsController } from '../../controllers/sessions.controller.js'
import { stylistsController } from '../../controllers/stylists.controller.js'
import { usersController } from '../../controllers/users.controller.js'

const Router = express.Router()

const protectedRoute = authMiddleware.protectedRoute

Router.get('/users/profile', protectedRoute, usersController.getProfile)
Router.put('/users/profile', protectedRoute, usersController.updateProfile)
Router.put('/users/change-password', protectedRoute, usersController.changePassword)

Router.get('/categories', categoriesController.listCategories)
Router.get('/categories/:id', categoriesController.getCategory)
Router.post('/categories', protectedRoute, categoriesController.createCategory)
Router.put('/categories/:id', protectedRoute, categoriesController.updateCategory)
Router.delete('/categories/:id', protectedRoute, categoriesController.deleteCategory)

Router.get('/services', servicesController.listServices)
Router.get('/services/:id', servicesController.getService)
Router.post('/services', protectedRoute, servicesController.createService)
Router.put('/services/:id', protectedRoute, servicesController.updateService)
Router.delete('/services/:id', protectedRoute, servicesController.deleteService)

Router.get('/stylists', stylistsController.listStylists)
Router.get('/stylists/:id', stylistsController.getStylist)
Router.get('/stylists/:id/services', stylistsController.getStylistServices)
Router.post('/stylists', protectedRoute, stylistsController.createStylist)
Router.put('/stylists/:id', protectedRoute, stylistsController.updateStylist)
Router.delete('/stylists/:id', protectedRoute, stylistsController.deleteStylist)
Router.post('/stylists/:id/services', protectedRoute, stylistsController.addStylistService)
Router.delete('/stylists/:id/services/:serviceId', protectedRoute, stylistsController.removeStylistService)

Router.get('/cart', protectedRoute, bookingCartsController.getCart)
Router.post('/cart/items', protectedRoute, bookingCartsController.addCartItem)
Router.put('/cart/items/:itemId', protectedRoute, bookingCartsController.updateCartItem)
Router.delete('/cart/items/:itemId', protectedRoute, bookingCartsController.deleteCartItem)
Router.delete('/cart', protectedRoute, bookingCartsController.clearCart)

Router.post('/bookings', protectedRoute, bookingsController.createBooking)
Router.get('/bookings', protectedRoute, bookingsController.listBookings)
Router.get('/bookings/:id', protectedRoute, bookingsController.getBooking)
Router.post('/bookings/:id/cancel', protectedRoute, bookingsController.cancelBooking)
Router.post('/bookings/:id/reschedule', protectedRoute, bookingsController.rescheduleBooking)
Router.get('/bookings/:id/reschedules', protectedRoute, bookingsController.getBookingReschedules)

Router.get('/admin/bookings', protectedRoute, bookingsController.listAdminBookings)
Router.get('/admin/bookings/:id', protectedRoute, bookingsController.getBooking)
Router.patch('/admin/bookings/:id/status', protectedRoute, bookingsController.updateBookingStatus)

Router.get('/notifications', protectedRoute, notificationsController.listNotifications)
Router.patch('/notifications/:id/read', protectedRoute, notificationsController.markNotificationRead)
Router.patch('/notifications/read-all', protectedRoute, notificationsController.markAllNotificationsRead)
Router.post('/notifications', protectedRoute, notificationsController.createNotification)
Router.delete('/notifications/:id', protectedRoute, notificationsController.deleteNotification)

Router.get('/promotions', promotionsController.listPromotions)
Router.get('/promotions/active', promotionsController.listActivePromotions)
Router.get('/promotions/:id', promotionsController.getPromotion)
Router.post('/promotions', protectedRoute, promotionsController.createPromotion)
Router.put('/promotions/:id', protectedRoute, promotionsController.updatePromotion)
Router.delete('/promotions/:id', protectedRoute, promotionsController.deletePromotion)

Router.get('/locations', salonLocationsController.listLocations)
Router.get('/locations/:id', salonLocationsController.getLocation)
Router.post('/locations', protectedRoute, salonLocationsController.createLocation)
Router.put('/locations/:id', protectedRoute, salonLocationsController.updateLocation)
Router.delete('/locations/:id', protectedRoute, salonLocationsController.deleteLocation)

Router.get('/sessions', protectedRoute, sessionsController.listSessions)
Router.delete('/sessions/:id', protectedRoute, sessionsController.deleteSession)
Router.delete('/sessions', protectedRoute, sessionsController.deleteAllSessions)

Router.get('/chat/messages', protectedRoute, chatMessagesController.listChatMessages)
Router.post('/chat/messages', protectedRoute, chatMessagesController.createChatMessage)
Router.delete('/chat/messages/:id', protectedRoute, chatMessagesController.deleteChatMessage)

Router.get('/admin/dashboard', protectedRoute, adminController.dashboard)
Router.get('/admin/statistics/bookings', protectedRoute, adminController.bookingStatistics)
Router.get('/admin/statistics/revenue', protectedRoute, adminController.revenueStatistics)
Router.get('/admin/statistics/services', protectedRoute, adminController.serviceStatistics)
Router.get('/admin/statistics/customers', protectedRoute, adminController.customerStatistics)

Router.get('/admin/users', protectedRoute, usersController.listAdminUsers)
Router.get('/admin/users/:id', protectedRoute, usersController.getAdminUser)
Router.post('/admin/users', protectedRoute, usersController.createAdminUser)
Router.put('/admin/users/:id', protectedRoute, usersController.updateAdminUser)
Router.patch('/admin/users/:id/status', protectedRoute, usersController.updateAdminUserStatus)
Router.delete('/admin/users/:id', protectedRoute, usersController.deleteAdminUser)

Router.get('/admin/reports/revenue', protectedRoute, adminController.revenueStatistics)
Router.get('/admin/reports/bookings', protectedRoute, adminController.bookingStatistics)
Router.get('/admin/reports/services', protectedRoute, adminController.serviceStatistics)
Router.get('/admin/reports/customers', protectedRoute, adminController.customerStatistics)

export const salonRoute = Router
