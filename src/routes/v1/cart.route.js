import express from 'express'

import { authMiddleware } from '../../middlewares/auth.middleware.js'
import { bookingCartsController } from '../../controllers/booking_carts.controller.js'

const Router = express.Router()
const protectedRoute = authMiddleware.protectedRoute
const customerOnly = authMiddleware.requireRoles('CUSTOMER')

Router.get('/', protectedRoute, customerOnly, bookingCartsController.getCart)
Router.post('/items', protectedRoute, customerOnly, bookingCartsController.addCartItem)
Router.put('/items/:itemId', protectedRoute, customerOnly, bookingCartsController.updateCartItem)
Router.delete('/items/:itemId', protectedRoute, customerOnly, bookingCartsController.deleteCartItem)
Router.delete('/', protectedRoute, customerOnly, bookingCartsController.clearCart)

export const cartRoute = Router


