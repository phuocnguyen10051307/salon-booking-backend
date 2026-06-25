import express from 'express'

import { authMiddleware } from '../../middlewares/auth.middleware.js'
import { billingsController } from '../../controllers/billings.controller.js'

const Router = express.Router()
const protectedRoute = authMiddleware.protectedRoute
const customerOnly = authMiddleware.requireRoles('CUSTOMER')
const adminOnly = authMiddleware.requireRoles('ADMIN')

Router.get('/', protectedRoute, customerOnly, billingsController.listBillings)
Router.post('/', protectedRoute, customerOnly, billingsController.createBilling)
Router.get('/booking/:bookingId', protectedRoute, customerOnly, billingsController.getBillingByBooking)
Router.get('/:id', protectedRoute, customerOnly, billingsController.getBilling)
Router.patch('/:id/pay', protectedRoute, customerOnly, billingsController.payBilling)
Router.patch('/:id/status', protectedRoute, adminOnly, billingsController.updateBillingStatus)

export const billingRoute = Router

