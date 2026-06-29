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

const getSingletonLocation = () =>
  prisma.salon_locations.findFirst({
    orderBy: { created_at: 'desc' },
  })

const getLocation = asyncHandler(async (req, res) => {
  const location = await getSingletonLocation()
  if (!location) throw new ApiError(StatusCodes.NOT_FOUND, 'Location not found')
  ok(res, 'Lay dia chi salon thanh cong', { location })
})

const getMapLocation = asyncHandler(async (req, res) => {
  const location = await prisma.salon_locations.findFirst({
    where: {
      latitude: { not: null },
      longitude: { not: null },
    },
    orderBy: { created_at: 'desc' },
  })

  if (!location) throw new ApiError(StatusCodes.NOT_FOUND, 'Location not found')
  ok(res, 'Lay vi tri salon thanh cong', { location: mapLocationResponse(location) })
})

const createLocation = asyncHandler(async (req, res) => {
  const data = locationData(req.body)
  const existingLocation = await getSingletonLocation()
  if (existingLocation) {
    throw new ApiError(StatusCodes.CONFLICT, 'Salon location already exists')
  }

  if (data.latitude === undefined || data.longitude === undefined) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'latitude and longitude are required')
  }

  const location = await prisma.salon_locations.create({ data })
  ok(res, 'Tao dia chi salon thanh cong', { location }, StatusCodes.CREATED)
})

const updateLocation = asyncHandler(async (req, res) => {
  const data = Object.fromEntries(Object.entries(locationData(req.body)).filter(([, value]) => value !== undefined))
  const existingLocation = await getSingletonLocation()

  if (!existingLocation) {
    if (data.latitude === undefined || data.longitude === undefined) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'latitude and longitude are required to create the salon location')
    }

    const location = await prisma.salon_locations.create({ data })
    return ok(res, 'Tao dia chi salon thanh cong', { location }, StatusCodes.CREATED)
  }

  const location = await prisma.salon_locations.update({
    where: { location_id: existingLocation.location_id },
    data,
  })

  await prisma.salon_locations.deleteMany({
    where: {
      NOT: { location_id: existingLocation.location_id },
    },
  })

  ok(res, 'Cap nhat dia chi salon thanh cong', { location })
})

const deleteLocation = asyncHandler(async (req, res) => {
  const existingLocation = await getSingletonLocation()
  if (!existingLocation) throw new ApiError(StatusCodes.NOT_FOUND, 'Location not found')

  await prisma.salon_locations.deleteMany()
  ok(res, 'Xoa dia chi salon thanh cong')
})

export const salonLocationsController = {
  getLocation,
  getMapLocation,
  createLocation,
  updateLocation,
  deleteLocation,
}
