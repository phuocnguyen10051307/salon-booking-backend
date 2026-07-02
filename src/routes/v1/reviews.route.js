import express from 'express'

import { reviewsController } from '../../controllers/reviews.controller.js'
import { authMiddleware } from '../../middlewares/auth.middleware.js'

const Router = express.Router()
const protectedRoute = authMiddleware.protectedRoute
const customerOnly = authMiddleware.requireRoles('CUSTOMER')

Router.get('/billing/:billingId', protectedRoute, customerOnly, reviewsController.listBillingReviews)
Router.post('/billing/:billingId', protectedRoute, customerOnly, reviewsController.createOrUpdateBillingReview)

export const reviewsRoute = Router
