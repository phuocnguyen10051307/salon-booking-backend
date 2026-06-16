import asyncHandler from 'express-async-handler'
import { StatusCodes } from 'http-status-codes'

import { prisma } from '../config/prisma.js'
import ApiError from '../utils/ApiError.js'
import { ok } from './helpers.js'

const locationData = (body) => ({
  salon_name: body.salon_name || body.salonName || body.name,
  address: body.address,
  hotline: body.hotline,
  opening_hours: body.opening_hours || body.openingHours,
  latitude: body.latitude,
  longitude: body.longitude,
})

const listLocations = asyncHandler(async (req, res) => {
  const locations = await prisma.salon_locations.findMany({ orderBy: { created_at: 'desc' } })
  ok(res, 'Lay danh sach chi nhanh thanh cong', { locations })
})

const getLocation = asyncHandler(async (req, res) => {
  const location = await prisma.salon_locations.findUnique({ where: { location_id: req.params.id } })
  if (!location) throw new ApiError(StatusCodes.NOT_FOUND, 'Location not found')
  ok(res, 'Lay chi nhanh thanh cong', { location })
})

const createLocation = asyncHandler(async (req, res) => {
  const location = await prisma.salon_locations.create({ data: locationData(req.body) })
  ok(res, 'Tao chi nhanh thanh cong', { location }, StatusCodes.CREATED)
})

const updateLocation = asyncHandler(async (req, res) => {
  const data = Object.fromEntries(Object.entries(locationData(req.body)).filter(([, value]) => value !== undefined))
  const location = await prisma.salon_locations.update({ where: { location_id: req.params.id }, data })
  ok(res, 'Cap nhat chi nhanh thanh cong', { location })
})

const deleteLocation = asyncHandler(async (req, res) => {
  await prisma.salon_locations.delete({ where: { location_id: req.params.id } })
  ok(res, 'Xoa chi nhanh thanh cong')
})

export const salonLocationsController = {
  listLocations,
  getLocation,
  createLocation,
  updateLocation,
  deleteLocation,
}
