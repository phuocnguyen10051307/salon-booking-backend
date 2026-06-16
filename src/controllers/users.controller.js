import asyncHandler from 'express-async-handler'
import { StatusCodes } from 'http-status-codes'
import bcrypt from 'bcrypt'

import { prisma } from '../config/prisma.js'
import { authService } from '../services/auth.service.js'
import ApiError from '../utils/ApiError.js'
import { getUserId, ok } from './helpers.js'

const getProfile = asyncHandler(async (req, res) => {
  const user = await prisma.users.findUnique({ where: { user_id: getUserId(req) } })
  ok(res, 'Lay ho so thanh cong', { user: authService.mapUserResponse(user) })
})

const updateProfile = asyncHandler(async (req, res) => {
  const user = await prisma.users.update({
    where: { user_id: getUserId(req) },
    data: {
      full_name: req.body.full_name || req.body.displayName || req.body.fullName,
      email: req.body.email,
      phone: req.body.phone,
      avatar_url: req.body.avatar_url || req.body.avatarUrl,
      updated_at: new Date(),
    },
  })
  ok(res, 'Cap nhat ho so thanh cong', { user: authService.mapUserResponse(user) })
})

const changePassword = asyncHandler(async (req, res) => {
  const user = await prisma.users.findUnique({ where: { user_id: getUserId(req) } })
  const currentPassword = req.body.currentPassword || req.body.current_password
  const newPassword = req.body.newPassword || req.body.new_password
  const isMatch = await bcrypt.compare(currentPassword, user.password_hash)
  if (!isMatch) throw new ApiError(StatusCodes.BAD_REQUEST, 'Current password is incorrect')
  await prisma.users.update({
    where: { user_id: getUserId(req) },
    data: { password_hash: await bcrypt.hash(newPassword, 10), updated_at: new Date() },
  })
  ok(res, 'Doi mat khau thanh cong')
})

const listAdminUsers = asyncHandler(async (req, res) => {
  const users = await prisma.users.findMany({ orderBy: { created_at: 'desc' } })
  ok(res, 'Lay danh sach nguoi dung thanh cong', { users: users.map(authService.mapUserResponse) })
})

const getAdminUser = asyncHandler(async (req, res) => {
  const user = await prisma.users.findUnique({ where: { user_id: req.params.id } })
  if (!user) throw new ApiError(StatusCodes.NOT_FOUND, 'User not found')
  ok(res, 'Lay nguoi dung thanh cong', { user: authService.mapUserResponse(user) })
})

const createAdminUser = asyncHandler(async (req, res) => {
  const user = await prisma.users.create({
    data: {
      full_name: req.body.full_name || req.body.displayName || req.body.fullName,
      email: req.body.email,
      phone: req.body.phone,
      password_hash: await bcrypt.hash(req.body.password, 10),
      avatar_url: req.body.avatar_url || req.body.avatarUrl,
      is_active: req.body.is_active ?? req.body.isActive ?? true,
    },
  })
  ok(res, 'Tao nguoi dung thanh cong', { user: authService.mapUserResponse(user) }, StatusCodes.CREATED)
})

const updateAdminUser = asyncHandler(async (req, res) => {
  const user = await prisma.users.update({
    where: { user_id: req.params.id },
    data: {
      full_name: req.body.full_name || req.body.displayName || req.body.fullName,
      email: req.body.email,
      phone: req.body.phone,
      avatar_url: req.body.avatar_url || req.body.avatarUrl,
      is_active: req.body.is_active ?? req.body.isActive,
      updated_at: new Date(),
    },
  })
  ok(res, 'Cap nhat nguoi dung thanh cong', { user: authService.mapUserResponse(user) })
})

const updateAdminUserStatus = asyncHandler(async (req, res) => {
  const user = await prisma.users.update({
    where: { user_id: req.params.id },
    data: { is_active: req.body.is_active ?? req.body.isActive, updated_at: new Date() },
  })
  ok(res, 'Cap nhat trang thai nguoi dung thanh cong', { user: authService.mapUserResponse(user) })
})

const deleteAdminUser = asyncHandler(async (req, res) => {
  await prisma.users.delete({ where: { user_id: req.params.id } })
  ok(res, 'Xoa nguoi dung thanh cong')
})

export const usersController = {
  getProfile,
  updateProfile,
  changePassword,
  listAdminUsers,
  getAdminUser,
  createAdminUser,
  updateAdminUser,
  updateAdminUserStatus,
  deleteAdminUser,
}
