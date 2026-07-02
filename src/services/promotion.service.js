import { StatusCodes } from 'http-status-codes'

import { prisma } from '../config/prisma.js'
import ApiError from '../utils/ApiError.js'

const PROMOTION_SCOPE = {
  ALL_SERVICES: 'ALL_SERVICES',
  SELECTED_SERVICES: 'SELECTED_SERVICES',
}

export const getPromotionId = (input = {}) => input.promotion_id || input.promotionId || null

const activePromotionWhere = (now = new Date()) => ({
  is_active: true,
  OR: [{ start_date: null }, { start_date: { lte: now } }],
  AND: [{ OR: [{ end_date: null }, { end_date: { gte: now } }] }],
})

const calculateItemsSubtotal = (items = []) =>
  items.reduce((sum, item) => sum + Number(item.price || 0) * (Number(item.quantity) || 1), 0)

export const resolvePromotionDiscount = async ({ promotionId, items = [], subtotal, tx = prisma }) => {
  if (!promotionId) {
    return {
      promotion: null,
      discountAmount: 0,
      eligibleSubtotal: 0,
    }
  }

  const promotion = await tx.promotions.findFirst({
    where: {
      promotion_id: promotionId,
      ...activePromotionWhere(),
    },
    include: { promotion_services: true },
  })

  if (!promotion) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Promotion is invalid or inactive')
  }

  const normalizedItems = items.map((item) => ({
    service_id: item.service_id || item.serviceId,
    quantity: Number(item.quantity) || 1,
    price: Number(item.price) || 0,
  }))

  const resolvedSubtotal = subtotal ?? calculateItemsSubtotal(normalizedItems)

  let eligibleSubtotal = resolvedSubtotal
  if (promotion.scope === PROMOTION_SCOPE.SELECTED_SERVICES) {
    const allowedServiceIds = new Set(promotion.promotion_services.map((item) => item.service_id))
    eligibleSubtotal = normalizedItems.reduce((sum, item) => {
      if (!allowedServiceIds.has(item.service_id)) return sum
      return sum + item.price * item.quantity
    }, 0)

    if (!eligibleSubtotal) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Promotion does not apply to the selected services')
    }
  }

  const discountPercent = Math.max(Number(promotion.discount_percent || 0), 0)
  const discountAmount = Math.min(Number((eligibleSubtotal * discountPercent) / 100), resolvedSubtotal)

  return {
    promotion,
    discountAmount,
    eligibleSubtotal,
  }
}
