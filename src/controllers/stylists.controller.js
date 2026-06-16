import asyncHandler from 'express-async-handler'
import { StatusCodes } from 'http-status-codes'

import { prisma } from '../config/prisma.js'
import ApiError from '../utils/ApiError.js'
import { ok } from './helpers.js'

const stylistData = (body) => ({
  full_name: body.full_name || body.fullName || body.name,
  phone: body.phone,
  email: body.email,
  avatar_url: body.avatar_url || body.avatarUrl,
  experience_years: body.experience_years || body.experienceYears,
  bio: body.bio,
  is_active: body.is_active ?? body.isActive,
})

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

const addStylistService = asyncHandler(async (req, res) => {
  const serviceId = req.body.service_id || req.body.serviceId
  const stylistService = await prisma.stylist_services.create({
    data: { stylist_id: req.params.id, service_id: serviceId },
  })
  ok(res, 'Them dich vu cho stylist thanh cong', { stylistService }, StatusCodes.CREATED)
})

const removeStylistService = asyncHandler(async (req, res) => {
  await prisma.stylist_services.delete({
    where: { stylist_id_service_id: { stylist_id: req.params.id, service_id: req.params.serviceId } },
  })
  ok(res, 'Xoa dich vu khoi stylist thanh cong')
})

export const stylistsController = {
  listStylists,
  getStylist,
  getStylistServices,
  createStylist,
  updateStylist,
  deleteStylist,
  addStylistService,
  removeStylistService,
}
