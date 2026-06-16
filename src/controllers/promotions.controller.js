import asyncHandler from 'express-async-handler'
import { StatusCodes } from 'http-status-codes'

import { prisma } from '../config/prisma.js'
import ApiError from '../utils/ApiError.js'
import { ok, parseDate } from './helpers.js'

const promotionData = (body) => ({
  title: body.title,
  description: body.description,
  discount_percent: body.discount_percent || body.discountPercent,
  start_date: parseDate(body.start_date || body.startDate),
  end_date: parseDate(body.end_date || body.endDate),
  is_active: body.is_active ?? body.isActive,
})

const listPromotions = asyncHandler(async (req, res) => {
  const promotions = await prisma.promotions.findMany({ orderBy: { created_at: 'desc' } })
  ok(res, 'Lay danh sach khuyen mai thanh cong', { promotions })
})

const listActivePromotions = asyncHandler(async (req, res) => {
  const now = new Date()
  const promotions = await prisma.promotions.findMany({
    where: {
      is_active: true,
      OR: [{ start_date: null }, { start_date: { lte: now } }],
      AND: [{ OR: [{ end_date: null }, { end_date: { gte: now } }] }],
    },
    orderBy: { created_at: 'desc' },
  })
  ok(res, 'Lay khuyen mai dang hoat dong thanh cong', { promotions })
})

const getPromotion = asyncHandler(async (req, res) => {
  const promotion = await prisma.promotions.findUnique({ where: { promotion_id: req.params.id } })
  if (!promotion) throw new ApiError(StatusCodes.NOT_FOUND, 'Promotion not found')
  ok(res, 'Lay khuyen mai thanh cong', { promotion })
})

const createPromotion = asyncHandler(async (req, res) => {
  const promotion = await prisma.promotions.create({ data: promotionData(req.body) })
  ok(res, 'Tao khuyen mai thanh cong', { promotion }, StatusCodes.CREATED)
})

const updatePromotion = asyncHandler(async (req, res) => {
  const data = Object.fromEntries(Object.entries(promotionData(req.body)).filter(([, value]) => value !== undefined))
  const promotion = await prisma.promotions.update({ where: { promotion_id: req.params.id }, data })
  ok(res, 'Cap nhat khuyen mai thanh cong', { promotion })
})

const deletePromotion = asyncHandler(async (req, res) => {
  await prisma.promotions.delete({ where: { promotion_id: req.params.id } })
  ok(res, 'Xoa khuyen mai thanh cong')
})

export const promotionsController = {
  listPromotions,
  listActivePromotions,
  getPromotion,
  createPromotion,
  updatePromotion,
  deletePromotion,
}
