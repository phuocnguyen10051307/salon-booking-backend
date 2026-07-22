import asyncHandler from 'express-async-handler'
import { StatusCodes } from 'http-status-codes'

import { prisma } from '../config/prisma.js'
import { env } from '../config/environment.js'
import ApiError from '../utils/ApiError.js'
import { getPromotionId, resolvePromotionDiscount } from '../services/promotion.service.js'
import { payosService } from '../services/payos.service.js'
import { billingInclude, createBillingCode, getUserId, getUserRole, ok } from './helpers.js'
import { stylistService } from '../services/stylist.service.js'

const SUPPORTED_STAFF_PAYMENT_METHODS = new Set(['CASH', 'BANK_TRANSFER'])

const normalizePaymentMethod = (value) => (value ? value.toUpperCase() : 'CASH')

const assertStaffPaymentMethod = (value) => {
  const paymentMethod = normalizePaymentMethod(value)
  if (!SUPPORTED_STAFF_PAYMENT_METHODS.has(paymentMethod)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Chi ho tro CASH va BANK_TRANSFER trong quy trinh thanh toan cua nhan vien')
  }
  return paymentMethod
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
  if (!booking) throw new ApiError(StatusCodes.NOT_FOUND, 'Khong tim thay lich hen')
  return booking
}

const buildPayOSCheckoutUrl = (paymentLinkId) =>
  paymentLinkId ? `https://pay.payos.vn/web/${paymentLinkId}` : ''

const collectMissingPaymentFields = (payment) => {
  const missing = []
  if (!payment.checkoutUrl) missing.push('checkoutUrl')
  if (!payment.qrCode) missing.push('qrCode')
  if (!payment.orderCode) missing.push('orderCode')
  if (!payment.amount || payment.amount <= 0) missing.push('amount')
  return missing
}

const createPayOSPaymentPayload = (billing, paymentLink) => {
  const paymentLinkId = paymentLink?.paymentLinkId?.toString() || paymentLink?.id?.toString() || ''
  const checkoutUrl = paymentLink?.checkoutUrl?.toString() || buildPayOSCheckoutUrl(paymentLinkId)

  const payment = {
    provider: 'PAYOS',
    bankBin: paymentLink?.bin?.toString() || env.BANK_QR_BANK_BIN || '',
    bankName: paymentLink?.bin?.toString() ? 'PayOS' : env.BANK_QR_BANK_NAME || 'PayOS',
    qrCode: paymentLink?.qrCode?.toString() || '',
    accountName: paymentLink?.accountName?.toString() || env.BANK_QR_ACCOUNT_NAME || '',
    accountNumber: paymentLink?.accountNumber?.toString() || env.BANK_QR_ACCOUNT_NUMBER || '',
    amount: Number(paymentLink?.amount ?? billing.total_amount ?? 0),
    transferContent: paymentLink?.description?.toString() || `TT ${billing.billing_code}`,
    checkoutUrl,
    orderCode: paymentLink?.orderCode?.toString() || payosService.buildOrderCode(billing).toString(),
    paymentLinkId,
    status: paymentLink?.status?.toString() || (billing.status === 'PAID' ? 'PAID' : 'PENDING'),
  }

  const missingFields = collectMissingPaymentFields(payment)
  return {
    ...payment,
    missingFields,
    isUsable: missingFields.length === 0,
    diagnosticMessage:
      missingFields.length === 0
        ? ''
        : `Phien thanh toan PayOS dang thieu du lieu: ${missingFields.join(', ')}`,
  }
}

const ensureUsablePayOSPayment = (billing, paymentLink, payment) => {
  return payment
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
  if (!bookingId) throw new ApiError(StatusCodes.BAD_REQUEST, 'Thieu ma lich hen')

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

const createTransferSession = async (existing) => {
  const billing = await prepareBillingForTransfer(existing)
  const paymentLink = await payosService.getOrCreatePaymentLink(billing)

  if (payosService.isPaidStatus(paymentLink?.status) && billing.status !== 'PAID') {
    const paidBilling = await collectPayment(billing, 'BANK_TRANSFER')
    const payment = createPayOSPaymentPayload(paidBilling, paymentLink)
    return { billing: paidBilling, payment: ensureUsablePayOSPayment(paidBilling, paymentLink, payment) }
  }

  const payment = createPayOSPaymentPayload(billing, paymentLink)
  return { billing, payment: ensureUsablePayOSPayment(billing, paymentLink, payment) }
}

const getBookingPaymentStatus = asyncHandler(async (req, res) => {
  const existing = await findStaffOrAdminBilling(req, { booking_id: req.params.bookingId })

  if (existing.status === 'PAID') {
    ok(res, 'Lay trang thai thanh toan thanh cong', { billing: existing })
    return
  }

  if (normalizePaymentMethod(existing.payment_method) !== 'BANK_TRANSFER') {
    ok(res, 'Lay trang thai thanh toan thanh cong', { billing: existing })
    return
  }

  const paymentLink = await payosService.getOrCreatePaymentLink(existing)

  if (payosService.isPaidStatus(paymentLink.status)) {
    const billing = await collectPayment(existing, 'BANK_TRANSFER')
    const payment = createPayOSPaymentPayload(billing, paymentLink)
    ok(res, 'Thanh toan PayOS da hoan tat', {
      billing,
      payment: ensureUsablePayOSPayment(billing, paymentLink, payment),
    })
    return
  }

  const payment = createPayOSPaymentPayload(existing, paymentLink)
  ok(res, 'Lay trang thai thanh toan thanh cong', {
    billing: existing,
    payment: ensureUsablePayOSPayment(existing, paymentLink, payment),
  })
})

const confirmBookingTransferPayment = asyncHandler(async (req, res) => {
  const existing = await findStaffOrAdminBilling(req, { booking_id: req.params.bookingId })
  const paymentMethod = assertStaffPaymentMethod(req.body.payment_method || req.body.paymentMethod || 'BANK_TRANSFER')
  if (paymentMethod !== 'BANK_TRANSFER') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Chi ho tro xac nhan thu cong voi thanh toan BANK_TRANSFER')
  }

  if (normalizePaymentMethod(existing.payment_method) !== 'BANK_TRANSFER') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Hoa don nay khong o trang thai cho xac nhan BANK_TRANSFER')
  }

  const paymentLink = await payosService.getPaymentLink(existing)
  if (!paymentLink) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Hoa don nay chua tao phien thanh toan PayOS')
  }

  if (!payosService.isPaidStatus(paymentLink.status)) {
    throw new ApiError(StatusCodes.CONFLICT, 'PayOS chua xac nhan giao dich chuyen khoan nay')
  }

  const billing = await collectPayment(existing, paymentMethod)
  ok(res, 'Staff da xac nhan da nhan tien chuyen khoan thanh cong', { billing })
})

const cancelBookingTransferPayment = asyncHandler(async (req, res) => {
  const existing = await findStaffOrAdminBilling(req, { booking_id: req.params.bookingId })

  if (existing.status === 'PAID') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Khong the huy phien thanh toan da hoan tat')
  }

  if (normalizePaymentMethod(existing.payment_method) !== 'BANK_TRANSFER') {
    ok(res, 'Hoa don khong co phien BANK_TRANSFER dang cho', { billing: existing })
    return
  }

  const billing = await prisma.billings.update({
    where: { billing_id: existing.billing_id },
    data: {
      payment_method: null,
      updated_at: new Date(),
    },
    include: billingInclude,
  })

  ok(res, 'Da huy phien thanh toan BANK_TRANSFER', { billing })
})

const collectBillingPayment = asyncHandler(async (req, res) => {
  const existing = await findStaffOrAdminBilling(req, { billing_id: req.params.id })
  const paymentMethod = assertStaffPaymentMethod(req.body.payment_method || req.body.paymentMethod)

  if (paymentMethod === 'BANK_TRANSFER') {
    const result = await createTransferSession(existing)
    ok(res, 'Tao QR PayOS thanh cong', result)
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
    ok(res, 'Tao QR PayOS thanh cong', result)
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

export const billingsControllerInternals = {
  collectMissingPaymentFields,
}

export const billingsController = {
  listBillings,
  createBilling,
  getBilling,
  getBillingByBooking,
  getBookingPaymentStatus,
  collectBillingPayment,
  collectBookingPayment,
  confirmBookingTransferPayment,
  cancelBookingTransferPayment,
  updateBillingStatus,
}

