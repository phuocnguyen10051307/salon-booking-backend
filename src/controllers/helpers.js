import { StatusCodes } from 'http-status-codes'

export const ok = (res, message, data = null, statusCode = StatusCodes.OK) =>
  res.status(statusCode).json({
    success: true,
    message,
    ...(data !== null ? { data } : {}),
  })

export const getUserId = (req) => req.user?._id

export const parseDate = (value) => (value ? new Date(`${value}T00:00:00.000Z`) : undefined)

export const parseTime = (value) =>
  value ? new Date(`1970-01-01T${value.length === 5 ? `${value}:00` : value}.000Z`) : undefined

export const bookingInclude = {
  users: true,
  stylists: true,
  booking_items: { include: { services: true } },
  booking_reschedules: true,
}

export const billingInclude = {
  users: true,
  bookings: {
    include: {
      stylists: true,
      booking_items: { include: { services: true } },
    },
  },
}

export const createBookingCode = () => `BK${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 90 + 10)}`

export const createBillingCode = () => `BL${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 90 + 10)}`
