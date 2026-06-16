import express from 'express'

import { authMiddleware } from '../../middlewares/auth.middleware.js'
import { bookingCartsController } from '../../controllers/booking_carts.controller.js'

const Router = express.Router()
const protectedRoute = authMiddleware.protectedRoute

Router.get('/', protectedRoute, bookingCartsController.getCart)
Router.post('/items', protectedRoute, bookingCartsController.addCartItem)
Router.put('/items/:itemId', protectedRoute, bookingCartsController.updateCartItem)
Router.delete('/items/:itemId', protectedRoute, bookingCartsController.deleteCartItem)
Router.delete('/', protectedRoute, bookingCartsController.clearCart)

export const cartRoute = Router
