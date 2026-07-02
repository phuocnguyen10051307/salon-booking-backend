import asyncHandler from 'express-async-handler'
import { StatusCodes } from 'http-status-codes'

import { prisma } from '../config/prisma.js'
import ApiError from '../utils/ApiError.js'
import { stylistService } from '../services/stylist.service.js'
import {
  billingInclude,
  bookingInclude,
  createBillingCode,
  createBookingCode,
  getUserId,
  getUserRole,
  ok,
  parseDate,
  parseTime,
} from './helpers.js'


const getTodayBookingDate = () => {
  const timeZone = process.env.APP_TIME_ZONE || 'Asia/Ho_Chi_Minh'
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return parseDate(`${values.year}-${values.month}-${values.day}`)
}

const getRequestedBookingDate = (value) => {
  if (!value) return getTodayBookingDate()
  return parseDate(value)
}

const requireScheduleInput = (body) => {
  const bookingDateInput = body.booking_date || body.bookingDate
  const bookingTimeInput = body.booking_time || body.bookingTime

  if (!bookingDateInput) throw new ApiError(StatusCodes.BAD_REQUEST, 'Booking date is required')
  if (!bookingTimeInput) throw new ApiError(StatusCodes.BAD_REQUEST, 'Booking time is required')

  return {
    bookingDate: parseDate(bookingDateInput),
    bookingTime: parseTime(bookingTimeInput),
  }
}

const normalizeCartItemIds = (input) => {
  if (!input) return []
  if (Array.isArray(input)) return input.map((item) => item?.toString()).filter(Boolean)
  return [input.toString()].filter(Boolean)
}

const resolveBookingItems = async (userId, bodyItems = [], cartItemIds = []) => {
  let items = bodyItems

  if (!items.length) {
    const cart = await prisma.booking_carts.findFirst({
      where: { user_id: userId },
      include: { booking_cart_items: { include: { services: true } } },
    })

    const filteredCartItems = cart?.booking_cart_items.filter((item) =>
      !cartItemIds.length ? true : cartItemIds.includes(item.cart_item_id)
    )

    items =
      filteredCartItems?.map((item) => ({
        service_id: item.service_id,
        quantity: item.quantity,
        price: item.services?.price,
      })) || []
  }

  if (!items.length) throw new ApiError(StatusCodes.BAD_REQUEST, 'Booking items are required')

  const serviceIds = items.map((item) => item.service_id || item.serviceId).filter(Boolean)
  const services = await prisma.services.findMany({ where: { service_id: { in: serviceIds } } })
  const serviceById = new Map(services.map((service) => [service.service_id, service]))

  const normalizedItems = items.map((item) => {
    const serviceId = item.service_id || item.serviceId
    const service = serviceById.get(serviceId)

    if (!serviceId || !service) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'One or more services are invalid')
    }

    return {
      service_id: serviceId,
      quantity: Math.max(Number(item.quantity) || 1, 1),
      price: Number(item.price || service.price || 0),
    }
  })

  const totalAmount = normalizedItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

  return { items: normalizedItems, totalAmount }
}

const findOwnedBooking = async (bookingId, userId) => {
  const booking = await prisma.bookings.findFirst({
    where: { booking_id: bookingId, user_id: userId },
    include: bookingInclude,
  })

  if (!booking) throw new ApiError(StatusCodes.NOT_FOUND, 'Booking not found')
  return booking
}

const clearUserCart = async (tx, userId, cartItemIds = []) => {
  const cart = await tx.booking_carts.findFirst({ where: { user_id: userId } })
  if (cart) {
    await tx.booking_cart_items.deleteMany({
      where: {
        cart_id: cart.cart_id,
        ...(cartItemIds.length ? { cart_item_id: { in: cartItemIds } } : {}),
      },
    })
  }
}

const createBooking = asyncHandler(async (req, res) => {
  const userId = getUserId(req)
  const { bookingDate, bookingTime } = requireScheduleInput(req.body)
  const cartItemIds = normalizeCartItemIds(req.body.cart_item_ids || req.body.cartItemIds)
  const { items, totalAmount } = await resolveBookingItems(userId, req.body.items || [], cartItemIds)

  const bookingId = await prisma.$transaction(async (tx) => {
    const createdBooking = await tx.bookings.create({
      data: {
        booking_code: req.body.booking_code || req.body.bookingCode || createBookingCode(),
        user_id: userId,
        stylist_id: req.body.stylist_id || req.body.stylistId,
        booking_date: bookingDate,
        booking_time: bookingTime,
        note: req.body.note,
        total_amount: totalAmount,
        booking_items: {
          create: items.map((item) => ({
            service_id: item.service_id,
            quantity: item.quantity,
            price: item.price,
          })),
        },
      },
    })

    await clearUserCart(tx, userId, cartItemIds)
    return createdBooking.booking_id
  })

  const booking = await prisma.bookings.findUnique({
    where: { booking_id: bookingId },
    include: bookingInclude,
  })

  ok(res, 'Tao lich dat thanh cong', { booking }, StatusCodes.CREATED)
})

const checkoutBooking = asyncHandler(async (req, res) => {
  const userId = getUserId(req)
  const { bookingDate, bookingTime } = requireScheduleInput(req.body)
  const cartItemIds = normalizeCartItemIds(req.body.cart_item_ids || req.body.cartItemIds)
  const { items, totalAmount } = await resolveBookingItems(userId, req.body.items || [], cartItemIds)
  const discountAmount = Math.max(Number(req.body.discount_amount || req.body.discountAmount || 0), 0)

  const result = await prisma.$transaction(async (tx) => {
    const booking = await tx.bookings.create({
      data: {
        booking_code: req.body.booking_code || req.body.bookingCode || createBookingCode(),
        user_id: userId,
        stylist_id: req.body.stylist_id || req.body.stylistId,
        booking_date: bookingDate,
        booking_time: bookingTime,
        note: req.body.note,
        total_amount: totalAmount,
        booking_items: {
          create: items.map((item) => ({
            service_id: item.service_id,
            quantity: item.quantity,
            price: item.price,
          })),
        },
      },
    })

    const billing = await tx.billings.create({
      data: {
        billing_code: req.body.billing_code || req.body.billingCode || createBillingCode(),
        booking_id: booking.booking_id,
        user_id: userId,
        subtotal: totalAmount,
        discount_amount: discountAmount,
        total_amount: Math.max(totalAmount - discountAmount, 0),
        payment_method: null,
        status: 'UNPAID',
      },
    })

    await clearUserCart(tx, userId, cartItemIds)

    return { bookingId: booking.booking_id, billingId: billing.billing_id }
  })

  const [booking, billing] = await Promise.all([
    prisma.bookings.findUnique({
      where: { booking_id: result.bookingId },
      include: bookingInclude,
    }),
    prisma.billings.findUnique({
      where: { billing_id: result.billingId },
      include: billingInclude,
    }),
  ])

  ok(res, 'Tao lich dat va hoa don thanh cong', { booking, billing }, StatusCodes.CREATED)
})

const listBookings = asyncHandler(async (req, res) => {
  const bookings = await prisma.bookings.findMany({
    where: { user_id: getUserId(req) },
    include: bookingInclude,
    orderBy: { created_at: 'desc' },
  })
  ok(res, 'Lay danh sach dat lich thanh cong', { bookings })
})

const listAdminBookings = asyncHandler(async (req, res) => {
  const where = {
    ...(req.query.date ? { booking_date: parseDate(req.query.date) } : {}),
    ...(req.query.stylistId ? { stylist_id: req.query.stylistId } : {}),
    ...(req.query.status ? { status: req.query.status.toUpperCase() } : {}),
  }
  const bookings = await prisma.bookings.findMany({ where, include: bookingInclude, orderBy: { created_at: 'desc' } })
  ok(res, 'Lay danh sach dat lich thanh cong', { bookings })
})

const listStaffTodayBookings = asyncHandler(async (req, res) => {
  const user = await prisma.users.findUnique({ where: { user_id: getUserId(req) } })
  const bookingDate = getRequestedBookingDate(req.query.date)

  let stylistId = req.query.stylistId
  if (getUserRole(req) === 'STAFF') {
    const stylist = await stylistService.ensureStaffStylist(user)
    stylistId = stylist?.stylist_id
  }

  if (!stylistId) return ok(res, 'Lay lich lam hom nay thanh cong', { bookings: [] })

  const bookings = await prisma.bookings.findMany({
    where: {
      stylist_id: stylistId,
      booking_date: bookingDate,
      status: { in: ['PENDING', 'CONFIRMED'] },
    },
    include: bookingInclude,
    orderBy: { booking_time: 'asc' },
  })
  ok(res, 'Lay lich lam hom nay thanh cong', { bookings })
})

const getBooking = asyncHandler(async (req, res) => {
  const where = {
    booking_id: req.params.id,
    ...(req.originalUrl.includes('/admin/') ? {} : { user_id: getUserId(req) }),
  }
  const booking = await prisma.bookings.findFirst({ where, include: bookingInclude })
  if (!booking) throw new ApiError(StatusCodes.NOT_FOUND, 'Booking not found')
  ok(res, 'Lay dat lich thanh cong', { booking })
})

const updateBookingStatus = asyncHandler(async (req, res) => {
  const booking = await prisma.bookings.update({
    where: { booking_id: req.params.id },
    data: { status: req.body.status?.toUpperCase(), updated_at: new Date() },
    include: bookingInclude,
  })
  ok(res, 'Cap nhat trang thai dat lich thanh cong', { booking })
})

const cancelBooking = asyncHandler(async (req, res) => {
  await findOwnedBooking(req.params.id, getUserId(req))

  const booking = await prisma.bookings.update({
    where: { booking_id: req.params.id },
    data: { status: 'CANCELLED', updated_at: new Date() },
    include: bookingInclude,
  })
  ok(res, 'Huy lich dat thanh cong', { booking })
})

const rescheduleBooking = asyncHandler(async (req, res) => {
  const existing = await findOwnedBooking(req.params.id, getUserId(req))
  const { bookingDate, bookingTime } = requireScheduleInput(req.body)

  const booking = await prisma.bookings.update({
    where: { booking_id: req.params.id },
    data: {
      booking_date: bookingDate,
      booking_time: bookingTime,
      updated_at: new Date(),
      booking_reschedules: {
        create: {
          old_booking_date: existing.booking_date,
          old_booking_time: existing.booking_time,
          new_booking_date: bookingDate,
          new_booking_time: bookingTime,
          reason: req.body.reason,
        },
      },
    },
    include: bookingInclude,
  })
  ok(res, 'Doi lich dat thanh cong', { booking })
})

const getBookingReschedules = asyncHandler(async (req, res) => {
  await findOwnedBooking(req.params.id, getUserId(req))

  const reschedules = await prisma.booking_reschedules.findMany({
    where: { booking_id: req.params.id },
    orderBy: { created_at: 'desc' },
  })
  ok(res, 'Lay lich su doi lich thanh cong', { reschedules })
})

export const bookingsController = {
  createBooking,
  checkoutBooking,
  listBookings,
  listAdminBookings,
  listStaffTodayBookings,
  getBooking,
  updateBookingStatus,
  cancelBooking,
  rescheduleBooking,
  getBookingReschedules,
}

