import asyncHandler from 'express-async-handler'
import { StatusCodes } from 'http-status-codes'

import { prisma } from '../config/prisma.js'
import { env } from '../config/environment.js'
import ApiError from '../utils/ApiError.js'
import { getPromotionId, resolvePromotionDiscount } from '../services/promotion.service.js'
import { billingInclude, createBillingCode, getUserId, getUserRole, ok } from './helpers.js'
import { stylistService } from '../services/stylist.service.js'

const SUPPORTED_STAFF_PAYMENT_METHODS = new Set(['CASH', 'BANK_TRANSFER'])

const normalizePaymentMethod = (value) => (value ? value.toUpperCase() : 'CASH')

const assertStaffPaymentMethod = (value) => {
  const paymentMethod = normalizePaymentMethod(value)
  if (!SUPPORTED_STAFF_PAYMENT_METHODS.has(paymentMethod)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Only CASH and BANK_TRANSFER are supported in staff payment flow')
  }
  return paymentMethod
}

const ensureBankQrConfigured = () => {
  if (!env.BANK_QR_BANK_BIN || !env.BANK_QR_ACCOUNT_NUMBER || !env.BANK_QR_ACCOUNT_NAME) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Bank QR is not configured. Please set BANK_QR_BANK_BIN, BANK_QR_ACCOUNT_NUMBER, and BANK_QR_ACCOUNT_NAME',
    )
  }
}

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
  const promotionId = getPromotionId(req.body)
  const { discountAmount } = await resolvePromotionDiscount({
    promotionId,
    items: booking.booking_items,
    subtotal,
  })
  const totalAmount = Math.max(subtotal - discountAmount, 0)

  const billing = await prisma.billings.create({
    data: {
      billing_code: req.body.billing_code || req.body.billingCode || createBillingCode(),
      booking_id: booking.booking_id,
      user_id: userId,
      promotion_id: promotionId,
      subtotal,
      discount_amount: discountAmount,
      total_amount: totalAmount,
      payment_method: null,
      status: 'UNPAID',
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

const findStaffOrAdminBilling = async (req, where) => {
  const role = getUserRole(req)
  const billing = await prisma.billings.findFirst({
    where,
    include: billingInclude,
  })
  if (!billing) throw new ApiError(StatusCodes.NOT_FOUND, 'Billing not found')

  if (role === 'STAFF') {
    const user = await prisma.users.findUnique({ where: { user_id: getUserId(req) } })
    const stylist = await stylistService.ensureStaffStylist(user)
    if (!stylist || billing.bookings?.stylist_id !== stylist.stylist_id) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'You can only collect payment for your own bookings')
    }
  }

  return billing
}

const collectPayment = async (existing, paymentMethod) => {
  if (existing.status === 'PAID') throw new ApiError(StatusCodes.BAD_REQUEST, 'Billing is already paid')

  return prisma.$transaction(async (tx) => {
    const billing = await tx.billings.update({
      where: { billing_id: existing.billing_id },
      data: {
        status: 'PAID',
        payment_method: normalizePaymentMethod(paymentMethod),
        paid_at: new Date(),
        updated_at: new Date(),
      },
      include: billingInclude,
    })

    await tx.bookings.update({
      where: { booking_id: existing.booking_id },
      data: { status: 'COMPLETED', updated_at: new Date() },
    })

    return billing
  })
}

const prepareBillingForTransfer = async (existing) => {
  if (existing.payment_method === 'BANK_TRANSFER') return existing

  return prisma.billings.update({
    where: { billing_id: existing.billing_id },
    data: {
      payment_method: 'BANK_TRANSFER',
      updated_at: new Date(),
    },
    include: billingInclude,
  })
}

const buildTransferContent = (billing) => `TT ${billing.billing_code}`

const buildBankQrUrl = ({ bankBin, accountNumber, template, amount, transferContent, accountName }) => {
  const encodedContent = encodeURIComponent(transferContent)
  const encodedName = encodeURIComponent(accountName)
  return `https://img.vietqr.io/image/${bankBin}-${accountNumber}-${template}.png?amount=${amount}&addInfo=${encodedContent}&accountName=${encodedName}`
}

const createTransferPaymentPayload = (billing) => {
  ensureBankQrConfigured()

  const amount = Math.max(Math.round(Number(billing.total_amount || 0)), 0)
  const transferContent = buildTransferContent(billing)

  return {
    provider: 'BANK_QR',
    bankBin: env.BANK_QR_BANK_BIN,
    bankName: env.BANK_QR_BANK_NAME || 'Bank transfer',
    accountName: env.BANK_QR_ACCOUNT_NAME,
    accountNumber: env.BANK_QR_ACCOUNT_NUMBER,
    amount,
    transferContent,
    qrCode: buildBankQrUrl({
      bankBin: env.BANK_QR_BANK_BIN,
      accountNumber: env.BANK_QR_ACCOUNT_NUMBER,
      template: env.BANK_QR_TEMPLATE,
      amount,
      transferContent,
      accountName: env.BANK_QR_ACCOUNT_NAME,
    }),
  }
}

const createTransferSession = async (existing) => {
  const billing = await prepareBillingForTransfer(existing)
  return { billing, payment: createTransferPaymentPayload(billing) }
}

const confirmBookingTransferPayment = asyncHandler(async (req, res) => {
  const existing = await findStaffOrAdminBilling(req, { booking_id: req.params.bookingId })
  const paymentMethod = assertStaffPaymentMethod(req.body.payment_method || req.body.paymentMethod || 'BANK_TRANSFER')
  const billing = await collectPayment(existing, paymentMethod)
  ok(res, 'Xac nhan thanh toan chuyen khoan thanh cong', { billing })
})

const collectBillingPayment = asyncHandler(async (req, res) => {
  const existing = await findStaffOrAdminBilling(req, { billing_id: req.params.id })
  const paymentMethod = assertStaffPaymentMethod(req.body.payment_method || req.body.paymentMethod)

  if (paymentMethod === 'BANK_TRANSFER') {
    const result = await createTransferSession(existing)
    ok(res, 'Tao QR chuyen khoan thanh cong', result)
    return
  }

  const billing = await collectPayment(existing, paymentMethod)
  ok(res, 'Thu tien hoa don thanh cong', { billing })
})

const collectBookingPayment = asyncHandler(async (req, res) => {
  const existing = await findStaffOrAdminBilling(req, { booking_id: req.params.bookingId })
  const paymentMethod = assertStaffPaymentMethod(req.body.payment_method || req.body.paymentMethod)

  if (paymentMethod === 'BANK_TRANSFER') {
    const result = await createTransferSession(existing)
    ok(res, 'Tao QR chuyen khoan thanh cong', result)
    return
  }

  const billing = await collectPayment(existing, paymentMethod)
  ok(res, 'Thu tien hoa don thanh cong', { billing })
})

const updateBillingStatus = asyncHandler(async (req, res) => {
  const role = getUserRole(req)
  const where = role === 'ADMIN' ? { billing_id: req.params.id } : { billing_id: req.params.id, user_id: getUserId(req) }

  const existing = await prisma.billings.findFirst({ where })
  if (!existing) throw new ApiError(StatusCodes.NOT_FOUND, 'Billing not found')

  const status = req.body.status ? req.body.status.toUpperCase() : 'UNPAID'
  const billing = await prisma.$transaction(async (tx) => {
    const updatedBilling = await tx.billings.update({
      where: { billing_id: req.params.id },
      data: {
        status,
        paid_at: status === 'PAID' ? existing.paid_at || new Date() : existing.paid_at,
        updated_at: new Date(),
      },
      include: billingInclude,
    })

    if (status === 'PAID') {
      await tx.bookings.update({
        where: { booking_id: existing.booking_id },
        data: { status: 'COMPLETED', updated_at: new Date() },
      })
    }

    return updatedBilling
  })

  ok(res, 'Cap nhat trang thai hoa don thanh cong', { billing })
})

export const billingsController = {
  listBillings,
  createBilling,
  getBilling,
  getBillingByBooking,
  collectBillingPayment,
  collectBookingPayment,
  confirmBookingTransferPayment,
  updateBillingStatus,
}
