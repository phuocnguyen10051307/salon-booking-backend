import bcrypt from 'bcrypt'
import { StatusCodes } from 'http-status-codes'
import ms from 'ms'

import { env } from '../config/environment.js'
import { prisma } from '../config/prisma.js'

import { JwtProvider } from '../providers/jwt.provider.js'

import { pickUser } from '../utils/formatters.js'
import ApiError from '../utils/ApiError.js'

const signup = async (userData) => {
  const { phone, password, full_name, email } = userData
  if (!phone || !password || !full_name) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'All fields are required')
  }
  const existedUser = await prisma.users.findUnique({ where: { phone } })
  if (existedUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Phone number already exists')
  }

  if (email) {
    const existedEmail = await prisma.users.findUnique({ where: { email } })
    if (existedEmail) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Email already exists')
    }
  }

  const hashedPassword = await bcrypt.hash(password, 10)

  const createdUser = await prisma.users.create({
    data: {
      phone,
      email,
      password_hash: hashedPassword,
      full_name,
    },
  })

  const mapped = {
    _id: createdUser.user_id,
    phone: createdUser.phone,
    displayName: createdUser.full_name,
    role: createdUser.role || 'CUSTOMER',
    avatarUrl: createdUser.avatar_url,
    avatarId: createdUser.avatar_id,
    isActive: createdUser.is_active,
  }

  return pickUser(mapped)
}

const signin = async (userData) => {
  const { email, identifier, password } = userData
  const loginIdentifier = email || identifier
  if (!loginIdentifier || !password) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'All fields are required')
  }

  let user = null
  if (loginIdentifier.includes('@')) {
    user = await prisma.users.findUnique({ where: { email: loginIdentifier } })
    console.log('User found by email:', user)
  }
  if (!user) {
    user = await prisma.users.findUnique({ where: { phone: loginIdentifier } })
    console.log('User found by phone:', user)
  }
  if (!user) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid email or phone')
  }

  if (!user.is_active) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'User account is blocked')
  }

  const isMatch = await bcrypt.compare(password, user.password_hash)
  console.log('Password match:', isMatch)
  if (!isMatch) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid email or phone or password')
  }

  const userInfo = {
    _id: user.user_id,
    phone: user.phone,
    role: user.role || 'CUSTOMER',
  }

  const accessToken = await JwtProvider.generateToken(userInfo, env.JWT_ACCESS_SECRET, env.JWT_ACCESS_EXPIRATION)
  const refreshToken = await JwtProvider.generateToken(userInfo, env.JWT_REFRESH_SECRET, env.JWT_REFRESH_EXPIRATION)

  const refreshTokenMaxAge = ms(env.JWT_REFRESH_EXPIRATION)
  if (!refreshTokenMaxAge) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Invalid refresh token expiration')
  }

  await prisma.sessions.create({
    data: {
      user_id: user.user_id,
      refresh_token: refreshToken,
      expires_at: new Date(Date.now() + refreshTokenMaxAge),
    },
  })

  const mapped = {
    _id: user.user_id,
    phone: user.phone,
    displayName: user.full_name,
    role: user.role || 'CUSTOMER',
    avatarUrl: user.avatar_url,
    avatarId: user.avatar_id,
    isActive: user.is_active,
  }

  return {
    accessToken,
    refreshToken,
    refreshTokenMaxAge,
    user: pickUser(mapped),
  }
}

const signout = async (refreshToken) => {
  if (!refreshToken) return

  await prisma.sessions.deleteMany({ where: { refresh_token: refreshToken } })
}

const refreshToken = async (token) => {
  if (!token) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Refresh token is required')
  }

  const session = await prisma.sessions.findUnique({ where: { refresh_token: token } })
  if (!session) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Invalid refresh token')
  }

  if (session.expires_at < new Date()) {
    await prisma.sessions.deleteMany({ where: { refresh_token: token } })
    throw new ApiError(StatusCodes.FORBIDDEN, 'Refresh token has expired, please sign in again')
  }

  let decoded
  try {
    decoded = await JwtProvider.verifyToken(token, env.JWT_REFRESH_SECRET)
  } catch {
    await prisma.sessions.deleteMany({ where: { refresh_token: token } })
    throw new ApiError(StatusCodes.FORBIDDEN, 'Invalid refresh token')
  }

  const user = await prisma.users.findUnique({ where: { user_id: decoded._id } })
  if (!user?.is_active) {
    await prisma.sessions.deleteMany({ where: { refresh_token: token } })
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'User is not available')
  }

  const userInfo = {
    _id: user.user_id,
    phone: user.phone,
    role: user.role || 'CUSTOMER',
  }

  const accessToken = await JwtProvider.generateToken(userInfo, env.JWT_ACCESS_SECRET, env.JWT_ACCESS_EXPIRATION)

  return { accessToken }
}

export const authService = {
  signup,
  signin,
  signout,
  refreshToken,
}
