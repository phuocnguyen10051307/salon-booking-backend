import asyncHandler from 'express-async-handler'
import { StatusCodes } from 'http-status-codes'

import { prisma } from '../config/prisma.js'
import ApiError from '../utils/ApiError.js'
import { ok } from './helpers.js'

const serviceData = (body) => ({
  category_id: body.category_id || body.categoryId,
  service_name: body.service_name || body.name,
  price: body.price,
  duration_minutes: body.duration_minutes || body.durationMinutes,
  description: body.description,
  image_url: body.image_url || body.imageUrl,
  is_active: body.is_active ?? body.isActive,
})

const listServices = asyncHandler(async (req, res) => {
  const where = {
    ...(req.query.categoryId ? { category_id: req.query.categoryId } : {}),
    ...(req.query.active !== undefined ? { is_active: req.query.active === 'true' } : {}),
  }
  const services = await prisma.services.findMany({
    where,
    include: { categories: true },
    orderBy: { created_at: 'desc' },
  })
  ok(res, 'Lay danh sach dich vu thanh cong', { services })
})

const getService = asyncHandler(async (req, res) => {
  const service = await prisma.services.findUnique({
    where: { service_id: req.params.id },
    include: { categories: true, stylist_services: { include: { stylists: true } } },
  })
  if (!service) throw new ApiError(StatusCodes.NOT_FOUND, 'Service not found')
  ok(res, 'Lay dich vu thanh cong', { service })
})

const createService = asyncHandler(async (req, res) => {
  const service = await prisma.services.create({ data: serviceData(req.body) })
  ok(res, 'Tao dich vu thanh cong', { service }, StatusCodes.CREATED)
})

const updateService = asyncHandler(async (req, res) => {
  const data = Object.fromEntries(Object.entries(serviceData(req.body)).filter(([, value]) => value !== undefined))
  const service = await prisma.services.update({
    where: { service_id: req.params.id },
    data: { ...data, updated_at: new Date() },
  })
  ok(res, 'Cap nhat dich vu thanh cong', { service })
})

const deleteService = asyncHandler(async (req, res) => {
  await prisma.services.delete({ where: { service_id: req.params.id } })
  ok(res, 'Xoa dich vu thanh cong')
})

export const servicesController = {
  listServices,
  getService,
  createService,
  updateService,
  deleteService,
}
