import express from 'express'

import { authMiddleware } from '../../middlewares/auth.middleware.js'
import { promotionsController } from '../../controllers/promotions.controller.js'

const Router = express.Router()
const protectedRoute = authMiddleware.protectedRoute
const adminOnly = authMiddleware.requireRoles('ADMIN')

Router.get('/', promotionsController.listPromotions)
Router.get('/active', promotionsController.listActivePromotions)
Router.get('/active/service/:serviceId', promotionsController.listActivePromotionsByService)
Router.get('/:id', promotionsController.getPromotion)
Router.post('/', protectedRoute, adminOnly, promotionsController.createPromotion)
Router.put('/:id', protectedRoute, adminOnly, promotionsController.updatePromotion)
Router.delete('/:id', protectedRoute, adminOnly, promotionsController.deletePromotion)

export const promotionsRoute = Router
