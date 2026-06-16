import asyncHandler from 'express-async-handler'

import { prisma } from '../config/prisma.js'
import { getUserId, ok } from './helpers.js'

const listSessions = asyncHandler(async (req, res) => {
  const sessions = await prisma.sessions.findMany({
    where: { user_id: getUserId(req) },
    select: { session_id: true, expires_at: true, created_at: true },
    orderBy: { created_at: 'desc' },
  })
  ok(res, 'Lay danh sach phien dang nhap thanh cong', { sessions })
})

const deleteSession = asyncHandler(async (req, res) => {
  await prisma.sessions.delete({ where: { session_id: req.params.id } })
  ok(res, 'Xoa phien dang nhap thanh cong')
})

const deleteAllSessions = asyncHandler(async (req, res) => {
  await prisma.sessions.deleteMany({ where: { user_id: getUserId(req) } })
  ok(res, 'Xoa tat ca phien dang nhap thanh cong')
})

export const sessionsController = {
  listSessions,
  deleteSession,
  deleteAllSessions,
}
