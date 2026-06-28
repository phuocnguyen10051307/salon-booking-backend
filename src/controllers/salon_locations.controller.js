import asyncHandler from 'express-async-handler'
import { StatusCodes } from 'http-status-codes'

import { prisma } from '../config/prisma.js'
import ApiError from '../utils/ApiError.js'
import { ok } from './helpers.js'

const parseCoordinate = (value, field) => {
  if (value === undefined || value === null || value === '') return undefined

  const coordinate = Number(value)
  if (!Number.isFinite(coordinate)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, `${field} must be a valid number`)
  }

  if (field === 'latitude' && (coordinate < -90 || coordinate > 90)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'latitude must be between -90 and 90')
  }

  if (field === 'longitude' && (coordinate < -180 || coordinate > 180)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'longitude must be between -180 and 180')
  }

  return coordinate
}

const locationData = (body) => ({
  salon_name: body.salon_name || body.salonName || body.name,
  address: body.address,
  hotline: body.hotline,
  opening_hours: body.opening_hours || body.openingHours,
  latitude: parseCoordinate(body.latitude, 'latitude'),
  longitude: parseCoordinate(body.longitude, 'longitude'),
})

const mapLocationResponse = (location) => ({
  location_id: location.location_id,
  salon_name: location.salon_name,
  address: location.address,
  hotline: location.hotline,
  opening_hours: location.opening_hours,
  latitude: location.latitude === null || location.latitude === undefined ? null : Number(location.latitude),
  longitude: location.longitude === null || location.longitude === undefined ? null : Number(location.longitude),
})

const listLocations = asyncHandler(async (req, res) => {
  const locations = await prisma.salon_locations.findMany({ orderBy: { created_at: 'desc' } })
  ok(res, 'Lay danh sach chi nhanh thanh cong', { locations })
})

const listMapLocations = asyncHandler(async (req, res) => {
  const locations = await prisma.salon_locations.findMany({
    where: {
      latitude: { not: null },
      longitude: { not: null },
    },
    orderBy: { created_at: 'desc' },
  })

  ok(res, 'Lay vi tri ban do thanh cong', { locations: locations.map(mapLocationResponse) })
})

const getLocation = asyncHandler(async (req, res) => {
  const location = await prisma.salon_locations.findUnique({ where: { location_id: req.params.id } })
  if (!location) throw new ApiError(StatusCodes.NOT_FOUND, 'Location not found')
  ok(res, 'Lay chi nhanh thanh cong', { location })
})

const createLocation = asyncHandler(async (req, res) => {
  const data = locationData(req.body)
  if (data.latitude === undefined || data.longitude === undefined) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'latitude and longitude are required')
  }

  const location = await prisma.salon_locations.create({ data })
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
  listMapLocations,
  getLocation,
  createLocation,
  updateLocation,
  deleteLocation,
}
