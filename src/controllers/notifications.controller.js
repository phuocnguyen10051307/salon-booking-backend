import asyncHandler from 'express-async-handler'
import { StatusCodes } from 'http-status-codes'

import { prisma } from '../config/prisma.js'
import { getUserId, ok } from './helpers.js'

const listNotifications = asyncHandler(async (req, res) => {
  const notifications = await prisma.notifications.findMany({
    where: { user_id: getUserId(req) },
    orderBy: { created_at: 'desc' },
  })
  ok(res, 'Lay danh sach thong bao thanh cong', { notifications })
})

const createNotification = asyncHandler(async (req, res) => {
  const notification = await prisma.notifications.create({
    data: {
      user_id: req.body.user_id || req.body.userId || getUserId(req),
      title: req.body.title,
      content: req.body.content,
      notification_type: req.body.notification_type || req.body.notificationType,
    },
  })
  ok(res, 'Tao thong bao thanh cong', { notification }, StatusCodes.CREATED)
})

const markNotificationRead = asyncHandler(async (req, res) => {
  const notification = await prisma.notifications.update({
    where: { notification_id: req.params.id },
    data: { is_read: true },
  })
  ok(res, 'Danh dau thong bao da doc thanh cong', { notification })
})

const markAllNotificationsRead = asyncHandler(async (req, res) => {
  await prisma.notifications.updateMany({ where: { user_id: getUserId(req) }, data: { is_read: true } })
  ok(res, 'Danh dau tat ca thong bao da doc thanh cong')
})

const deleteNotification = asyncHandler(async (req, res) => {
  await prisma.notifications.delete({ where: { notification_id: req.params.id } })
  ok(res, 'Xoa thong bao thanh cong')
})

export const notificationsController = {
  listNotifications,
  createNotification,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
}
