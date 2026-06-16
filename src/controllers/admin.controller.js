import asyncHandler from 'express-async-handler'

import { prisma } from '../config/prisma.js'
import { ok } from './helpers.js'

const dashboard = asyncHandler(async (req, res) => {
  const [users, bookings, services, revenue] = await Promise.all([
    prisma.users.count(),
    prisma.bookings.count(),
    prisma.services.count(),
    prisma.bookings.aggregate({ _sum: { total_amount: true } }),
  ])
  ok(res, 'Lay dashboard thanh cong', {
    dashboard: { users, bookings, services, revenue: revenue._sum.total_amount || 0 },
  })
})

const bookingStatistics = asyncHandler(async (req, res) => {
  const statistics = await prisma.bookings.groupBy({ by: ['status'], _count: { booking_id: true } })
  ok(res, 'Lay thong ke dat lich thanh cong', { statistics })
})

const revenueStatistics = asyncHandler(async (req, res) => {
  const statistics = await prisma.bookings.aggregate({ _sum: { total_amount: true }, _avg: { total_amount: true } })
  ok(res, 'Lay thong ke doanh thu thanh cong', { statistics })
})

const serviceStatistics = asyncHandler(async (req, res) => {
  const statistics = await prisma.booking_items.groupBy({
    by: ['service_id'],
    _sum: { quantity: true },
    _count: { booking_item_id: true },
  })
  ok(res, 'Lay thong ke dich vu thanh cong', { statistics })
})

const customerStatistics = asyncHandler(async (req, res) => {
  const statistics = await prisma.users.count()
  ok(res, 'Lay thong ke khach hang thanh cong', { statistics: { totalCustomers: statistics } })
})

export const adminController = {
  dashboard,
  bookingStatistics,
  revenueStatistics,
  serviceStatistics,
  customerStatistics,
}
