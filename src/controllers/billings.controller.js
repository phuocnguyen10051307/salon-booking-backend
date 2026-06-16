import asyncHandler from 'express-async-handler'
import { StatusCodes } from 'http-status-codes'

import { prisma } from '../config/prisma.js'
import ApiError from '../utils/ApiError.js'
import { billingInclude, createBillingCode, getUserId, ok } from './helpers.js'

const normalizePaymentMethod = (value) => (value ? value.toUpperCase() : 'CASH')
const normalizeBillingStatus = (value) => (value ? value.toUpperCase() : 'UNPAID')

const calculateSubtotal = (booking) => {
  if (booking.total_amount !== null && booking.total_amount !== undefined) return Number(booking.total_amount)

  return booking.booking_items.reduce((sum, item) => {
    return sum + Number(item.price || 0) * (item.quantity || 1)
  }, 0)
}

const findUserBooking = async (bookingId, userId) => {
  const booking = await prisma.bookings.findFirst({
    where: { booking_id: bookingId, user_id: userId },
    include: { booking_items: true },
  })
  if (!booking) throw new ApiError(StatusCodes.NOT_FOUND, 'Booking not found')
  return booking
}

const listBillings = asyncHandler(async (req, res) => {
  const billings = await prisma.billings.findMany({
    where: { user_id: getUserId(req) },
    include: billingInclude,
    orderBy: { created_at: 'desc' },
  })
  ok(res, 'Lay danh sach hoa don thanh cong', { billings })
})

const createBilling = asyncHandler(async (req, res) => {
  const userId = getUserId(req)
  const bookingId = req.body.booking_id || req.body.bookingId
  if (!bookingId) throw new ApiError(StatusCodes.BAD_REQUEST, 'Booking ID is required')

  const existedBilling = await prisma.billings.findFirst({
    where: { booking_id: bookingId, user_id: userId },
    include: billingInclude,
  })
  if (existedBilling) {
    ok(res, 'Hoa don da ton tai', { billing: existedBilling })
    return
  }

  const booking = await findUserBooking(bookingId, userId)
  const subtotal = calculateSubtotal(booking)
  const discountAmount = Number(req.body.discount_amount || req.body.discountAmount || 0)
  const totalAmount = Math.max(subtotal - discountAmount, 0)

  const billing = await prisma.billings.create({
    data: {
      billing_code: req.body.billing_code || req.body.billingCode || createBillingCode(),
      booking_id: booking.booking_id,
      user_id: userId,
      subtotal,
      discount_amount: discountAmount,
      total_amount: totalAmount,
      payment_method: normalizePaymentMethod(req.body.payment_method || req.body.paymentMethod),
      status: normalizeBillingStatus(req.body.status),
    },
    include: billingInclude,
  })

  ok(res, 'Tao hoa don thanh cong', { billing }, StatusCodes.CREATED)
})

const getBilling = asyncHandler(async (req, res) => {
  const billing = await prisma.billings.findFirst({
    where: { billing_id: req.params.id, user_id: getUserId(req) },
    include: billingInclude,
  })
  if (!billing) throw new ApiError(StatusCodes.NOT_FOUND, 'Billing not found')
  ok(res, 'Lay hoa don thanh cong', { billing })
})

const getBillingByBooking = asyncHandler(async (req, res) => {
  const billing = await prisma.billings.findFirst({
    where: { booking_id: req.params.bookingId, user_id: getUserId(req) },
    include: billingInclude,
  })
  if (!billing) throw new ApiError(StatusCodes.NOT_FOUND, 'Billing not found')
  ok(res, 'Lay hoa don theo lich dat thanh cong', { billing })
})

const payBilling = asyncHandler(async (req, res) => {
  const existing = await prisma.billings.findFirst({
    where: { billing_id: req.params.id, user_id: getUserId(req) },
  })
  if (!existing) throw new ApiError(StatusCodes.NOT_FOUND, 'Billing not found')
  if (existing.status === 'PAID') throw new ApiError(StatusCodes.BAD_REQUEST, 'Billing is already paid')

  const billing = await prisma.billings.update({
    where: { billing_id: req.params.id },
    data: {
      status: 'PAID',
      payment_method: normalizePaymentMethod(req.body.payment_method || req.body.paymentMethod || existing.payment_method),
      paid_at: new Date(),
      updated_at: new Date(),
    },
    include: billingInclude,
  })

  ok(res, 'Thanh toan hoa don thanh cong', { billing })
})

const updateBillingStatus = asyncHandler(async (req, res) => {
  const existing = await prisma.billings.findFirst({
    where: { billing_id: req.params.id, user_id: getUserId(req) },
  })
  if (!existing) throw new ApiError(StatusCodes.NOT_FOUND, 'Billing not found')

  const status = normalizeBillingStatus(req.body.status)
  const billing = await prisma.billings.update({
    where: { billing_id: req.params.id },
    data: {
      status,
      paid_at: status === 'PAID' ? existing.paid_at || new Date() : existing.paid_at,
      updated_at: new Date(),
    },
    include: billingInclude,
  })

  ok(res, 'Cap nhat trang thai hoa don thanh cong', { billing })
})

export const billingsController = {
  listBillings,
  createBilling,
  getBilling,
  getBillingByBooking,
  payBilling,
  updateBillingStatus,
}
