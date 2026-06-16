import asyncHandler from 'express-async-handler'
import { StatusCodes } from 'http-status-codes'

import { prisma } from '../config/prisma.js'
import ApiError from '../utils/ApiError.js'
import { ok } from './helpers.js'

const listCategories = asyncHandler(async (req, res) => {
  const categories = await prisma.categories.findMany({ orderBy: { created_at: 'desc' } })
  ok(res, 'Lay danh sach danh muc thanh cong', { categories })
})

const getCategory = asyncHandler(async (req, res) => {
  const category = await prisma.categories.findUnique({
    where: { category_id: req.params.id },
    include: { services: true },
  })
  if (!category) throw new ApiError(StatusCodes.NOT_FOUND, 'Category not found')
  ok(res, 'Lay danh muc thanh cong', { category })
})

const createCategory = asyncHandler(async (req, res) => {
  const category = await prisma.categories.create({
    data: {
      category_name: req.body.category_name || req.body.name,
      description: req.body.description,
    },
  })
  ok(res, 'Tao danh muc thanh cong', { category }, StatusCodes.CREATED)
})

const updateCategory = asyncHandler(async (req, res) => {
  const category = await prisma.categories.update({
    where: { category_id: req.params.id },
    data: {
      category_name: req.body.category_name || req.body.name,
      description: req.body.description,
    },
  })
  ok(res, 'Cap nhat danh muc thanh cong', { category })
})

const deleteCategory = asyncHandler(async (req, res) => {
  await prisma.categories.delete({ where: { category_id: req.params.id } })
  ok(res, 'Xoa danh muc thanh cong')
})

export const categoriesController = {
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
}
