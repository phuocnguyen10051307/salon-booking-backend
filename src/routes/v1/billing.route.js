import express from 'express'

import { authMiddleware } from '../../middlewares/auth.middleware.js'
import { billingsController } from '../../controllers/billings.controller.js'

const Router = express.Router()
const protectedRoute = authMiddleware.protectedRoute

Router.get('/', protectedRoute, billingsController.listBillings)
Router.post('/', protectedRoute, billingsController.createBilling)
Router.get('/booking/:bookingId', protectedRoute, billingsController.getBillingByBooking)
Router.get('/:id', protectedRoute, billingsController.getBilling)
Router.patch('/:id/pay', protectedRoute, billingsController.payBilling)
Router.patch('/:id/status', protectedRoute, billingsController.updateBillingStatus)

export const billingRoute = Router
