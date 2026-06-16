import asyncHandler from 'express-async-handler'
import { StatusCodes } from 'http-status-codes'

import { prisma } from '../config/prisma.js'
import ApiError from '../utils/ApiError.js'
import { bookingInclude, createBookingCode, getUserId, ok, parseDate, parseTime } from './helpers.js'

const createBooking = asyncHandler(async (req, res) => {
  const userId = getUserId(req)
  const bodyItems = req.body.items || []
  let items = bodyItems

  if (!items.length) {
    const cart = await prisma.booking_carts.findFirst({
      where: { user_id: userId },
      include: { booking_cart_items: { include: { services: true } } },
    })
    items =
      cart?.booking_cart_items.map((item) => ({
        service_id: item.service_id,
        quantity: item.quantity,
        price: item.services?.price,
      })) || []
  }

  if (!items.length) throw new ApiError(StatusCodes.BAD_REQUEST, 'Booking items are required')

  const serviceIds = items.map((item) => item.service_id || item.serviceId)
  const services = await prisma.services.findMany({ where: { service_id: { in: serviceIds } } })
  const serviceById = new Map(services.map((service) => [service.service_id, service]))
  const totalAmount = items.reduce((sum, item) => {
    const service = serviceById.get(item.service_id || item.serviceId)
    return sum + Number(item.price || service?.price || 0) * (item.quantity || 1)
  }, 0)

  const booking = await prisma.bookings.create({
    data: {
      booking_code: req.body.booking_code || req.body.bookingCode || createBookingCode(),
      user_id: userId,
      stylist_id: req.body.stylist_id || req.body.stylistId,
      booking_date: parseDate(req.body.booking_date || req.body.bookingDate),
      booking_time: parseTime(req.body.booking_time || req.body.bookingTime),
      note: req.body.note,
      total_amount: totalAmount,
      booking_items: {
        create: items.map((item) => {
          const serviceId = item.service_id || item.serviceId
          return {
            service_id: serviceId,
            quantity: item.quantity || 1,
            price: item.price || serviceById.get(serviceId)?.price || 0,
          }
        }),
      },
    },
    include: bookingInclude,
  })

  const cart = await prisma.booking_carts.findFirst({ where: { user_id: userId } })
  if (cart) await prisma.booking_cart_items.deleteMany({ where: { cart_id: cart.cart_id } })

  ok(res, 'Tao lich dat thanh cong', { booking }, StatusCodes.CREATED)
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
  const bookings = await prisma.bookings.findMany({ include: bookingInclude, orderBy: { created_at: 'desc' } })
  ok(res, 'Lay danh sach dat lich thanh cong', { bookings })
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
  const booking = await prisma.bookings.update({
    where: { booking_id: req.params.id },
    data: { status: 'CANCELLED', updated_at: new Date() },
    include: bookingInclude,
  })
  ok(res, 'Huy lich dat thanh cong', { booking })
})

const rescheduleBooking = asyncHandler(async (req, res) => {
  const existing = await prisma.bookings.findUnique({ where: { booking_id: req.params.id } })
  if (!existing) throw new ApiError(StatusCodes.NOT_FOUND, 'Booking not found')

  const newDate = parseDate(req.body.booking_date || req.body.bookingDate)
  const newTime = parseTime(req.body.booking_time || req.body.bookingTime)
  const booking = await prisma.bookings.update({
    where: { booking_id: req.params.id },
    data: {
      booking_date: newDate,
      booking_time: newTime,
      updated_at: new Date(),
      booking_reschedules: {
        create: {
          old_booking_date: existing.booking_date,
          old_booking_time: existing.booking_time,
          new_booking_date: newDate,
          new_booking_time: newTime,
          reason: req.body.reason,
        },
      },
    },
    include: bookingInclude,
  })
  ok(res, 'Doi lich dat thanh cong', { booking })
})

const getBookingReschedules = asyncHandler(async (req, res) => {
  const reschedules = await prisma.booking_reschedules.findMany({
    where: { booking_id: req.params.id },
    orderBy: { created_at: 'desc' },
  })
  ok(res, 'Lay lich su doi lich thanh cong', { reschedules })
})

export const bookingsController = {
  createBooking,
  listBookings,
  listAdminBookings,
  getBooking,
  updateBookingStatus,
  cancelBooking,
  rescheduleBooking,
  getBookingReschedules,
}
