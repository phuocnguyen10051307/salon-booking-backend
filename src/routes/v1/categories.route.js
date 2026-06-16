import express from 'express'

import { authMiddleware } from '../../middlewares/auth.middleware.js'
import { categoriesController } from '../../controllers/categories.controller.js'

const Router = express.Router()
const protectedRoute = authMiddleware.protectedRoute

Router.get('/', categoriesController.listCategories)
Router.get('/:id', categoriesController.getCategory)
Router.post('/', protectedRoute, categoriesController.createCategory)
Router.put('/:id', protectedRoute, categoriesController.updateCategory)
Router.delete('/:id', protectedRoute, categoriesController.deleteCategory)

export const categoriesRoute = Router
