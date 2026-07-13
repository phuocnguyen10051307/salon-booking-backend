import asyncHandler from 'express-async-handler'
import { StatusCodes } from 'http-status-codes'

import { prisma } from '../config/prisma.js'
import ApiError from '../utils/ApiError.js'
import { stylistService } from '../services/stylist.service.js'
import { getUserId, getUserRole, ok } from './helpers.js'

const stylistData = (body) => ({
  full_name: body.full_name || body.fullName || body.name,
  phone: body.phone,
  email: body.email,
  avatar_url: body.avatar_url || body.avatarUrl,
  experience_years: body.experience_years || body.experienceYears,
  bio: body.bio,
  is_active: body.is_active ?? body.isActive,
})

const readServiceIds = (body) => {
  const serviceIds = body.service_ids || body.serviceIds || body.services || body.service_id || body.serviceId
  if (!serviceIds) return []
  return (Array.isArray(serviceIds) ? serviceIds : [serviceIds]).map((id) => id?.toString()).filter(Boolean)
}

const getManagedStylistId = async (req) => {
  if (getUserRole(req) === 'ADMIN') return req.params.id

  const stylist = await stylistService.getStylistForStaffUser(getUserId(req))
  if (!stylist) throw new ApiError(StatusCodes.NOT_FOUND, 'Staff stylist profile not found')
  if (req.params.id && req.params.id !== stylist.stylist_id) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Staff can only manage their own stylist services')
  }

  return stylist.stylist_id
}

const listStylists = asyncHandler(async (req, res) => {
  const stylists = await prisma.stylists.findMany({
    include: { stylist_services: { include: { services: true } } },
    orderBy: { created_at: 'desc' },
  })
  ok(res, 'Lay danh sach stylist thanh cong', { stylists })
})

const getStylist = asyncHandler(async (req, res) => {
  const stylist = await prisma.stylists.findUnique({
    where: { stylist_id: req.params.id },
    include: { stylist_services: { include: { services: true } } },
  })
  if (!stylist) throw new ApiError(StatusCodes.NOT_FOUND, 'Stylist not found')
  ok(res, 'Lay stylist thanh cong', { stylist })
})

const createStylist = asyncHandler(async (req, res) => {
  const stylist = await prisma.stylists.create({ data: stylistData(req.body) })
  ok(res, 'Tao stylist thanh cong', { stylist }, StatusCodes.CREATED)
})

const updateStylist = asyncHandler(async (req, res) => {
  const data = Object.fromEntries(Object.entries(stylistData(req.body)).filter(([, value]) => value !== undefined))
  const stylist = await prisma.stylists.update({ where: { stylist_id: req.params.id }, data })
  ok(res, 'Cap nhat stylist thanh cong', { stylist })
})

const deleteStylist = asyncHandler(async (req, res) => {
  await prisma.stylists.delete({ where: { stylist_id: req.params.id } })
  ok(res, 'Xoa stylist thanh cong')
})

const getStylistServices = asyncHandler(async (req, res) => {
  const services = await prisma.stylist_services.findMany({
    where: { stylist_id: req.params.id },
    include: { services: true },
  })
  ok(res, 'Lay dich vu cua stylist thanh cong', { services: services.map((item) => item.services) })
})

const getMyStylist = asyncHandler(async (req, res) => {
  const stylist = await stylistService.getStylistForStaffUser(getUserId(req))
  if (!stylist) throw new ApiError(StatusCodes.NOT_FOUND, 'Staff stylist profile not found')
  ok(res, 'Lay stylist cua staff thanh cong', { stylist })
})

const syncStaffStylists = asyncHandler(async (req, res) => {
  const stylists = await stylistService.syncStaffUsersToStylists()
  ok(res, 'Dong bo tai khoan staff thanh stylist thanh cong', { stylists, count: stylists.length })
})

const getMyStylistServices = asyncHandler(async (req, res) => {
  const stylistId = await getManagedStylistId(req)
  const services = await prisma.stylist_services.findMany({
    where: { stylist_id: stylistId },
    include: { services: true },
  })
  ok(res, 'Lay dich vu cua stylist thanh cong', { services: services.map((item) => item.services) })
})

const addStylistService = asyncHandler(async (req, res) => {
  const stylistId = await getManagedStylistId(req)
  const serviceId = req.body.service_id || req.body.serviceId
  if (!serviceId) throw new ApiError(StatusCodes.BAD_REQUEST, 'Service id is required')

  const stylistService = await prisma.stylist_services.upsert({
    where: { stylist_id_service_id: { stylist_id: stylistId, service_id: serviceId } },
    update: {},
    create: { stylist_id: stylistId, service_id: serviceId },
  })
  ok(res, 'Them dich vu cho stylist thanh cong', { stylistService }, StatusCodes.CREATED)
})

const setStylistServices = asyncHandler(async (req, res) => {
  const stylistId = await getManagedStylistId(req)
  const serviceIds = [...new Set(readServiceIds(req.body))]
  if (!serviceIds.length) throw new ApiError(StatusCodes.BAD_REQUEST, 'Service ids are required')

  const services = await prisma.services.findMany({ where: { service_id: { in: serviceIds } } })
  if (services.length !== serviceIds.length) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'One or more services are invalid')
  }

  await prisma.$transaction(async (tx) => {
    await tx.stylist_services.deleteMany({ where: { stylist_id: stylistId } })
    for (const serviceId of serviceIds) {
      await tx.stylist_services.create({ data: { stylist_id: stylistId, service_id: serviceId } })
    }
  })

  const stylistServices = await prisma.stylist_services.findMany({
    where: { stylist_id: stylistId },
    include: { services: true },
  })
  ok(res, 'Cap nhat day du dich vu cua stylist thanh cong', {
    services: stylistServices.map((item) => item.services),
  })
})

const removeStylistService = asyncHandler(async (req, res) => {
  const stylistId = await getManagedStylistId(req)
  await prisma.stylist_services.delete({
    where: { stylist_id_service_id: { stylist_id: stylistId, service_id: req.params.serviceId } },
  })
  ok(res, 'Xoa dich vu khoi stylist thanh cong')
})

export const stylistsController = {
  listStylists,
  getStylist,
  getStylistServices,
  getMyStylist,
  getMyStylistServices,
  syncStaffStylists,
  createStylist,
  updateStylist,
  deleteStylist,
  addStylistService,
  setStylistServices,
  removeStylistService,
}
