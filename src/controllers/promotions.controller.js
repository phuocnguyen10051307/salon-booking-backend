import asyncHandler from 'express-async-handler'
import { StatusCodes } from 'http-status-codes'

import { prisma } from '../config/prisma.js'
import ApiError from '../utils/ApiError.js'
import { ok, parseDate, promotionInclude } from './helpers.js'

const PROMOTION_SCOPE = {
  ALL_SERVICES: 'ALL_SERVICES',
  SELECTED_SERVICES: 'SELECTED_SERVICES',
}

const activePromotionWhere = (now = new Date()) => ({
  is_active: true,
  OR: [{ start_date: null }, { start_date: { lte: now } }],
  AND: [{ OR: [{ end_date: null }, { end_date: { gte: now } }] }],
})

const normalizePromotionScope = (value) => {
  if (!value) return undefined
  const scope = value.toString().trim().toUpperCase()
  if (!Object.values(PROMOTION_SCOPE).includes(scope)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid promotion scope')
  }
  return scope
}

const normalizeServiceIds = (input) => {
  if (!input) return []
  if (Array.isArray(input)) return input.map((value) => value?.toString()).filter(Boolean)
  return [input.toString()].filter(Boolean)
}

const serializePromotion = (promotion) => ({
  ...promotion,
  service_ids: promotion.promotion_services?.map((item) => item.service_id) || [],
  services: promotion.promotion_services?.map((item) => item.services).filter(Boolean) || [],
})

const ensureValidScopeInput = (scope, serviceIds) => {
  if (scope === PROMOTION_SCOPE.SELECTED_SERVICES && !serviceIds.length) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Selected-services promotions require at least one service')
  }
}

const ensureServicesExist = async (serviceIds) => {
  if (!serviceIds.length) return

  const uniqueServiceIds = [...new Set(serviceIds)]
  const services = await prisma.services.findMany({
    where: { service_id: { in: uniqueServiceIds } },
    select: { service_id: true },
  })

  if (services.length !== uniqueServiceIds.length) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'One or more services are invalid')
  }
}

const promotionData = (body) => ({
  title: body.title,
  description: body.description,
  discount_percent: body.discount_percent || body.discountPercent,
  start_date: parseDate(body.start_date || body.startDate),
  end_date: parseDate(body.end_date || body.endDate),
  is_active: body.is_active ?? body.isActive,
  scope: normalizePromotionScope(body.scope),
})

const listPromotions = asyncHandler(async (req, res) => {
  const promotions = await prisma.promotions.findMany({
    include: promotionInclude,
    orderBy: { created_at: 'desc' },
  })
  ok(res, 'Lay danh sach khuyen mai thanh cong', { promotions: promotions.map(serializePromotion) })
})

const listActivePromotions = asyncHandler(async (req, res) => {
  const promotions = await prisma.promotions.findMany({
    where: activePromotionWhere(),
    include: promotionInclude,
    orderBy: { created_at: 'desc' },
  })
  ok(res, 'Lay khuyen mai dang hoat dong thanh cong', { promotions: promotions.map(serializePromotion) })
})

const listActivePromotionsByService = asyncHandler(async (req, res) => {
  const serviceId = req.params.serviceId || req.query.serviceId
  if (!serviceId) throw new ApiError(StatusCodes.BAD_REQUEST, 'Service ID is required')

  const promotions = await prisma.promotions.findMany({
    where: {
      ...activePromotionWhere(),
      OR: [
        { scope: PROMOTION_SCOPE.ALL_SERVICES },
        {
          scope: PROMOTION_SCOPE.SELECTED_SERVICES,
          promotion_services: {
            some: { service_id: serviceId },
          },
        },
      ],
    },
    include: promotionInclude,
    orderBy: { created_at: 'desc' },
  })

  ok(res, 'Lay khuyen mai theo dich vu thanh cong', { promotions: promotions.map(serializePromotion) })
})

const getPromotion = asyncHandler(async (req, res) => {
  const promotion = await prisma.promotions.findUnique({
    where: { promotion_id: req.params.id },
    include: promotionInclude,
  })
  if (!promotion) throw new ApiError(StatusCodes.NOT_FOUND, 'Promotion not found')
  ok(res, 'Lay khuyen mai thanh cong', { promotion: serializePromotion(promotion) })
})

const createPromotion = asyncHandler(async (req, res) => {
  const serviceIds = normalizeServiceIds(req.body.service_ids || req.body.serviceIds)
  const data = promotionData(req.body)
  const scope = data.scope || (serviceIds.length ? PROMOTION_SCOPE.SELECTED_SERVICES : PROMOTION_SCOPE.ALL_SERVICES)

  ensureValidScopeInput(scope, serviceIds)
  await ensureServicesExist(serviceIds)

  const promotion = await prisma.promotions.create({
    data: {
      ...data,
      scope,
      promotion_services:
        scope === PROMOTION_SCOPE.SELECTED_SERVICES
          ? {
              create: [...new Set(serviceIds)].map((service_id) => ({ service_id })),
            }
          : undefined,
    },
    include: promotionInclude,
  })

  ok(res, 'Tao khuyen mai thanh cong', { promotion: serializePromotion(promotion) }, StatusCodes.CREATED)
})

const updatePromotion = asyncHandler(async (req, res) => {
  const existing = await prisma.promotions.findUnique({
    where: { promotion_id: req.params.id },
    include: { promotion_services: true },
  })
  if (!existing) throw new ApiError(StatusCodes.NOT_FOUND, 'Promotion not found')

  const rawData = Object.fromEntries(Object.entries(promotionData(req.body)).filter(([, value]) => value !== undefined))
  const hasServiceIdsInput = Object.prototype.hasOwnProperty.call(req.body, 'service_ids') || Object.prototype.hasOwnProperty.call(req.body, 'serviceIds')
  const serviceIds = hasServiceIdsInput
    ? normalizeServiceIds(req.body.service_ids || req.body.serviceIds)
    : existing.promotion_services.map((item) => item.service_id)
  const scope =
    rawData.scope ||
    (hasServiceIdsInput
      ? serviceIds.length
        ? PROMOTION_SCOPE.SELECTED_SERVICES
        : PROMOTION_SCOPE.ALL_SERVICES
      : existing.scope)

  ensureValidScopeInput(scope, serviceIds)
  await ensureServicesExist(serviceIds)

  const promotion = await prisma.$transaction(async (tx) => {
    await tx.promotions.update({
      where: { promotion_id: req.params.id },
      data: { ...rawData, scope },
    })

    if (hasServiceIdsInput || scope !== existing.scope) {
      await tx.promotion_services.deleteMany({ where: { promotion_id: req.params.id } })

      if (scope === PROMOTION_SCOPE.SELECTED_SERVICES && serviceIds.length) {
        await tx.promotion_services.createMany({
          data: [...new Set(serviceIds)].map((service_id) => ({
            promotion_id: req.params.id,
            service_id,
          })),
        })
      }
    }

    return tx.promotions.findUnique({
      where: { promotion_id: req.params.id },
      include: promotionInclude,
    })
  })

  ok(res, 'Cap nhat khuyen mai thanh cong', { promotion: serializePromotion(promotion) })
})

const deletePromotion = asyncHandler(async (req, res) => {
  await prisma.promotions.delete({ where: { promotion_id: req.params.id } })
  ok(res, 'Xoa khuyen mai thanh cong')
})

export const promotionsController = {
  listPromotions,
  listActivePromotions,
  listActivePromotionsByService,
  getPromotion,
  createPromotion,
  updatePromotion,
  deletePromotion,
}
