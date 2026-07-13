import express from 'express'

import { authMiddleware } from '../../middlewares/auth.middleware.js'
import { categoriesController } from '../../controllers/categories.controller.js'

const Router = express.Router()
const protectedRoute = authMiddleware.protectedRoute
const adminOnly = authMiddleware.requireRoles('ADMIN')

Router.get('/', categoriesController.listCategories)
Router.get('/:id', categoriesController.getCategory)
Router.post('/', protectedRoute, adminOnly, categoriesController.createCategory)
Router.put('/:id', protectedRoute, adminOnly, categoriesController.updateCategory)
Router.delete('/:id', protectedRoute, adminOnly, categoriesController.deleteCategory)

export const categoriesRoute = Router


