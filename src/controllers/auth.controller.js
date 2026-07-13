import asyncHandler from 'express-async-handler'
import { StatusCodes } from 'http-status-codes'
import { refreshTokenCookieOptions } from '../config/cookie.js'
import { authService } from '../services/auth.service.js'

const signup = asyncHandler(async (req, res) => {
  const createdUser = await authService.signup(req.body)
  res.status(StatusCodes.CREATED).json({
    success: true,
    message: 'Dang ky thanh cong, vui long kiem tra email de lay OTP kich hoat tai khoan',
    data: { user: createdUser },
  })
})

const verifySignupOtp = asyncHandler(async (req, res) => {
  const user = await authService.verifySignupOtp(req.body)
  res.status(StatusCodes.OK).json({
    success: true,
    message: 'Kich hoat tai khoan thanh cong',
    data: { user },
  })
})

const resendSignupOtp = asyncHandler(async (req, res) => {
  await authService.resendSignupOtp(req.body)
  res.status(StatusCodes.OK).json({
    success: true,
    message: 'Gui lai OTP kich hoat tai khoan thanh cong',
  })
})

const signin = asyncHandler(async (req, res) => {
  const { accessToken, refreshToken, refreshTokenMaxAge, user } = await authService.signin(req.body)
  res.cookie('refreshToken', refreshToken, {
    ...refreshTokenCookieOptions,
    maxAge: refreshTokenMaxAge,
  })

  res.status(StatusCodes.OK).json({
    success: true,
    message: 'Dang nhap thanh cong',
    data: {
      user,
      accessToken,
    },
  })
})

const signout = asyncHandler(async (req, res) => {
  await authService.signout(req.cookies?.refreshToken)

  res.clearCookie('refreshToken', {
    ...refreshTokenCookieOptions,
  })
  res.status(StatusCodes.OK).json({ success: true, message: 'Dang xuat thanh cong' })
})

const refreshToken = asyncHandler(async (req, res) => {
  const { accessToken } = await authService.refreshToken(req.cookies?.refreshToken)

  res.status(StatusCodes.OK).json({
    success: true,
    message: 'Lam moi token thanh cong',
    data: { accessToken },
  })
})

const me = asyncHandler(async (req, res) => {
  res.status(StatusCodes.OK).json({
    success: true,
    message: 'Lay thong tin nguoi dung thanh cong',
    data: { user: req.user },
  })
})

export const authController = {
  signup,
  verifySignupOtp,
  resendSignupOtp,
  signin,
  signout,
  refreshToken,
  me,
}
