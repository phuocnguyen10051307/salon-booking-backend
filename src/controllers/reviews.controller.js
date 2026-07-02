import asyncHandler from 'express-async-handler'
import { StatusCodes } from 'http-status-codes'

import { prisma } from '../config/prisma.js'
import ApiError from '../utils/ApiError.js'
import { getUserId, ok } from './helpers.js'

const reviewInclude = {
  users: true,
  services: true,
}

const normalizeRating = (value) => {
  const rating = Number(value)
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Rating must be an integer from 1 to 5')
  }
  return rating
}

const findReviewableBilling = async (billingId, userId) => {
  const billing = await prisma.billings.findFirst({
    where: { billing_id: billingId, user_id: userId },
    include: {
      bookings: {
        include: {
          booking_items: true,
          service_reviews: true,
        },
      },
    },
  })

  if (!billing) throw new ApiError(StatusCodes.NOT_FOUND, 'Billing not found')
  if (billing.status !== 'PAID') throw new ApiError(StatusCodes.BAD_REQUEST, 'Only paid billings can be reviewed')

  return billing
}

const listBillingReviews = asyncHandler(async (req, res) => {
  const userId = getUserId(req)
  const billing = await findReviewableBilling(req.params.billingId, userId)

  const reviews = await prisma.service_reviews.findMany({
    where: {
      booking_id: billing.booking_id,
      user_id: userId,
    },
    include: reviewInclude,
    orderBy: { created_at: 'desc' },
  })

  ok(res, 'Lay danh sach danh gia thanh cong', { reviews })
})

const createOrUpdateBillingReview = asyncHandler(async (req, res) => {
  const userId = getUserId(req)
  const billing = await findReviewableBilling(req.params.billingId, userId)
  const serviceId = req.body.service_id || req.body.serviceId
  const comment = req.body.comment?.toString().trim() || null
  const rating = normalizeRating(req.body.rating)

  if (!serviceId) throw new ApiError(StatusCodes.BAD_REQUEST, 'Service ID is required')

  const hasService = billing.bookings?.booking_items.some((item) => item.service_id === serviceId)
  if (!hasService) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'This service does not belong to the selected billing')
  }

  const review = await prisma.service_reviews.upsert({
    where: {
      booking_id_service_id_user_id: {
        booking_id: billing.booking_id,
        service_id: serviceId,
        user_id: userId,
      },
    },
    update: {
      rating,
      comment,
      updated_at: new Date(),
    },
    create: {
      booking_id: billing.booking_id,
      service_id: serviceId,
      user_id: userId,
      rating,
      comment,
    },
    include: reviewInclude,
  })

  ok(res, 'Danh gia dich vu thanh cong', { review }, StatusCodes.CREATED)
})

export const reviewsController = {
  listBillingReviews,
  createOrUpdateBillingReview,
}

