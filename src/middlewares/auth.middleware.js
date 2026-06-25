import jwt from 'jsonwebtoken'
import { StatusCodes } from 'http-status-codes'

import { env } from '../config/environment.js'
import { prisma } from '../config/prisma.js'
import { authService } from '../services/auth.service.js'

// authorization - verify who the current user is
export const protectedRoute = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1] // Bearer <token>

    if (!token) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Access token is missing' })
    }

    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET)
    const user = await prisma.users.findUnique({ where: { user_id: decoded._id } })

    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'User not found' })
    }

    if (!user.is_active) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'User is not available' })
    }

    req.user = authService.mapUserResponse(user)
    next()
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      console.error(error)
      return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Access token expired' })
    }

    if (['JsonWebTokenError', 'NotBeforeError'].includes(error.name)) {
      console.error(error)
      return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'Invalid access token' })
    }

    console.error('Protected route error:', error)
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error' })
  }
}

// Role guard used after protectedRoute has attached the current user.
export const requireRoles = (...allowedRoles) => (req, res, next) => {
  const currentRole = req.user?.role?.toUpperCase()
  const normalizedAllowedRoles = allowedRoles.map((role) => role.toUpperCase())

  if (!currentRole) {
    return res.status(StatusCodes.UNAUTHORIZED).json({ message: 'User role is missing' })
  }

  if (!normalizedAllowedRoles.includes(currentRole)) {
    return res.status(StatusCodes.FORBIDDEN).json({ message: 'You do not have permission to access this resource' })
  }

  next()
}

export const authMiddleware = {
  protectedRoute,
  requireRoles,
}

