import express from 'express'

import { authMiddleware } from '../../middlewares/auth.middleware.js'
import { promotionsController } from '../../controllers/promotions.controller.js'

const Router = express.Router()
const protectedRoute = authMiddleware.protectedRoute

Router.get('/', promotionsController.listPromotions)
Router.get('/active', promotionsController.listActivePromotions)
Router.get('/:id', promotionsController.getPromotion)
Router.post('/', protectedRoute, promotionsController.createPromotion)
Router.put('/:id', protectedRoute, promotionsController.updatePromotion)
Router.delete('/:id', protectedRoute, promotionsController.deletePromotion)

export const promotionsRoute = Router
