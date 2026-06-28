import bcrypt from 'bcrypt'
import { StatusCodes } from 'http-status-codes'
import ms from 'ms'

import { env } from '../config/environment.js'
import { prisma } from '../config/prisma.js'

import { JwtProvider } from '../providers/jwt.provider.js'

import { pickUser } from '../utils/formatters.js'
import ApiError from '../utils/ApiError.js'
import { emailService } from './email.service.js'
import { stylistService } from './stylist.service.js'

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString()

const createOtpFields = async () => {
  const otp = generateOtp()
  const otpHash = await bcrypt.hash(otp, 10)
  const expiresAt = new Date(Date.now() + env.OTP_EXPIRES_IN_MINUTES * 60 * 1000)

  return { otp, otpHash, expiresAt }
}

const mapUserResponse = (user) =>
  pickUser({
    _id: user.user_id,
    phone: user.phone,
    email: user.email,
    displayName: user.full_name,
    role: (user.role || 'CUSTOMER').toLowerCase(),
    avatarUrl: user.avatar_url,
    avatarId: user.avatar_id || null,
    loyaltyPoints: user.loyalty_points || 0,
    isActive: user.is_active,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  })

const signup = async (userData) => {
  const { phone, password, full_name, email } = userData
  if (!phone || !password || !full_name || !email) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'All fields are required')
  }
  const duplicateChecks = [{ phone }]
  if (email) duplicateChecks.push({ email })

  const existedUsers = await prisma.users.findMany({ where: { OR: duplicateChecks } })
  const duplicatedFields = []
  if (existedUsers.some((user) => user.phone === phone)) duplicatedFields.push('phone')
  if (email && existedUsers.some((user) => user.email === email)) duplicatedFields.push('email')

  if (duplicatedFields.length) {
    throw new ApiError(StatusCodes.CONFLICT, `${duplicatedFields.join(' and ')} already exists`)
  }

  const hashedPassword = await bcrypt.hash(password, 10)
  const { otp, otpHash, expiresAt } = await createOtpFields()

  let createdUser
  try {
    createdUser = await prisma.users.create({
      data: {
        phone,
        email,
        password_hash: hashedPassword,
        full_name,
        is_active: false,
        email_verification_otp_hash: otpHash,
        email_verification_otp_expires_at: expiresAt,
      },
    })
  } catch (error) {
    if (error.code === 'P2002') {
      const target = error.meta?.target || []
      const duplicatedFields = Array.isArray(target) ? target.join(' and ') : 'email or phone'
      throw new ApiError(StatusCodes.CONFLICT, `${duplicatedFields} already exists`)
    }
    throw error
  }

  try {
    await emailService.sendVerificationOtp({ to: email, fullName: full_name, otp })
  } catch (error) {
    await prisma.users.delete({ where: { user_id: createdUser.user_id } }).catch(() => {})
    throw error
  }

  return mapUserResponse(createdUser)
}

const verifySignupOtp = async ({ email, otp }) => {
  const user = await prisma.users.findUnique({ where: { email } })
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found')
  }

  if (user.is_active && user.email_verified_at) {
    return mapUserResponse(user)
  }

  if (!user.email_verification_otp_hash || !user.email_verification_otp_expires_at) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Verification OTP is missing, please request a new OTP')
  }

  if (user.email_verification_otp_expires_at < new Date()) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Verification OTP has expired')
  }

  const isMatch = await bcrypt.compare(otp, user.email_verification_otp_hash)
  if (!isMatch) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid verification OTP')
  }

  const verifiedUser = await prisma.users.update({
    where: { user_id: user.user_id },
    data: {
      is_active: true,
      email_verified_at: new Date(),
      email_verification_otp_hash: null,
      email_verification_otp_expires_at: null,
      updated_at: new Date(),
    },
  })

  return mapUserResponse(verifiedUser)
}

const resendSignupOtp = async ({ email }) => {
  const user = await prisma.users.findUnique({ where: { email } })
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found')
  }

  if (user.is_active && user.email_verified_at) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Account is already activated')
  }

  const { otp, otpHash, expiresAt } = await createOtpFields()
  const updatedUser = await prisma.users.update({
    where: { user_id: user.user_id },
    data: {
      email_verification_otp_hash: otpHash,
      email_verification_otp_expires_at: expiresAt,
      updated_at: new Date(),
    },
  })

  await emailService.sendVerificationOtp({ to: user.email, fullName: user.full_name, otp })

  return mapUserResponse(updatedUser)
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
    throw new ApiError(StatusCodes.FORBIDDEN, 'Account is not activated, please verify OTP')
  }

  const isMatch = await bcrypt.compare(password, user.password_hash)
  console.log('Password match:', isMatch)
  if (!isMatch) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid email or phone or password')
  }

  await stylistService.ensureStaffStylist(user)

  const userInfo = {
    _id: user.user_id,
    phone: user.phone,
    role: (user.role || 'CUSTOMER').toLowerCase(),
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

  return {
    accessToken,
    refreshToken,
    refreshTokenMaxAge,
    user: mapUserResponse(user),
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
    role: (user.role || 'CUSTOMER').toLowerCase(),
  }

  const accessToken = await JwtProvider.generateToken(userInfo, env.JWT_ACCESS_SECRET, env.JWT_ACCESS_EXPIRATION)

  return { accessToken }
}

export const authService = {
  signup,
  verifySignupOtp,
  resendSignupOtp,
  signin,
  signout,
  refreshToken,
  mapUserResponse,
}
