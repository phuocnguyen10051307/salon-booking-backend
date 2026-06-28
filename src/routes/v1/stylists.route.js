import express from 'express'

import { authMiddleware } from '../../middlewares/auth.middleware.js'
import { stylistsController } from '../../controllers/stylists.controller.js'

const Router = express.Router()
const protectedRoute = authMiddleware.protectedRoute
const adminOnly = authMiddleware.requireRoles('ADMIN')
const staffOnly = authMiddleware.requireRoles('STAFF')
const adminOrStaff = authMiddleware.requireRoles('ADMIN', 'STAFF')

Router.get('/', stylistsController.listStylists)
Router.post('/sync-staff', protectedRoute, adminOnly, stylistsController.syncStaffStylists)
Router.get('/me', protectedRoute, staffOnly, stylistsController.getMyStylist)
Router.get('/me/services', protectedRoute, staffOnly, stylistsController.getMyStylistServices)
Router.post('/me/services', protectedRoute, staffOnly, stylistsController.addStylistService)
Router.put('/me/services', protectedRoute, staffOnly, stylistsController.setStylistServices)
Router.delete('/me/services/:serviceId', protectedRoute, staffOnly, stylistsController.removeStylistService)
Router.get('/:id', stylistsController.getStylist)
Router.get('/:id/services', stylistsController.getStylistServices)
Router.post('/', protectedRoute, adminOnly, stylistsController.createStylist)
Router.put('/:id', protectedRoute, adminOnly, stylistsController.updateStylist)
Router.delete('/:id', protectedRoute, adminOnly, stylistsController.deleteStylist)
Router.post('/:id/services', protectedRoute, adminOrStaff, stylistsController.addStylistService)
Router.put('/:id/services', protectedRoute, adminOrStaff, stylistsController.setStylistServices)
Router.delete('/:id/services/:serviceId', protectedRoute, adminOrStaff, stylistsController.removeStylistService)

export const stylistsRoute = Router
