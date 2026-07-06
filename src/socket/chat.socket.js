import jwt from 'jsonwebtoken'
import { Server } from 'socket.io'
import { z } from 'zod'

import { corsOptions } from '../config/cors.js'
import { env } from '../config/environment.js'
import { prisma } from '../config/prisma.js'
import { authService } from '../services/auth.service.js'
import { chatService } from '../services/chat.service.js'
import ApiError from '../utils/ApiError.js'

const conversationPayload = z.object({ conversationId: z.string().uuid() })
const sendPayload = conversationPayload.extend({
  clientMessageId: z.string().min(1).max(100),
  content: z.string().min(1),
})
const readPayload = conversationPayload.extend({ messageId: z.string().uuid() })

const roomName = (conversationId) => `conversation:${conversationId}`

const socketError = (error, event = null, conversationId = null) => {
  const payload = {
    code: error.code || 'INTERNAL_ERROR',
    message: error.code ? error.message : 'Internal server error',
    ...(event ? { event } : {}),
    ...(conversationId ? { conversationId } : {}),
  }
  return payload
}

const parse = (schema, payload) => {
  const result = schema.safeParse(payload)
  if (!result.success) {
    throw new ApiError(400, result.error.issues.map((issue) => issue.message).join(', '), 'VALIDATION_ERROR')
  }
  return result.data
}

const registerAcknowledgedEvent = (socket, event, handler) => {
  socket.on(event, async (payload = {}, acknowledge) => {
    try {
      const data = await handler(payload)
      if (typeof acknowledge === 'function') acknowledge({ ok: true, data })
    } catch (error) {
      const response = socketError(error, event, payload?.conversationId)
      if (typeof acknowledge === 'function') {
        acknowledge({ ok: false, error: response })
      } else {
        socket.emit('error', response)
      }
    }
  })
}

const authenticateSocket = async (socket, next) => {
  try {
    const rawToken = socket.handshake.auth?.token
    const token = rawToken?.toString().replace(/^Bearer\s+/i, '')
    if (!token) {
      const error = new Error('Access token is required')
      error.data = { code: 'AUTH_REQUIRED', message: error.message }
      return next(error)
    }
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET)
    const user = await prisma.users.findUnique({ where: { user_id: decoded._id } })
    if (!user?.is_active) {
      const error = new Error('User is not available')
      error.data = { code: 'INVALID_TOKEN', message: error.message }
      return next(error)
    }
    const mappedUser = authService.mapUserResponse(user)
    try {
      chatService.assertChatRole(mappedUser)
    } catch {
      const error = new Error('Chat is available only to customers and staff')
      error.data = { code: 'ROLE_FORBIDDEN', message: error.message }
      return next(error)
    }
    socket.data.user = mappedUser
    return next()
  } catch (error) {
    const isExpired = error.name === 'TokenExpiredError'
    const socketAuthError = new Error(isExpired ? 'Access token expired' : 'Invalid access token')
    socketAuthError.data = {
      code: isExpired ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
      message: socketAuthError.message,
    }
    return next(socketAuthError)
  }
}

const registerChatHandlers = (io, socket) => {
  const user = socket.data.user

  registerAcknowledgedEvent(socket, 'conversation:join', async (payload) => {
    const { conversationId } = parse(conversationPayload, payload)
    const conversation = await chatService.getConversation(conversationId, user, { join: true })
    await socket.join(roomName(conversationId))
    return { conversation }
  })

  registerAcknowledgedEvent(socket, 'conversation:leave', async (payload) => {
    const { conversationId } = parse(conversationPayload, payload)
    await socket.leave(roomName(conversationId))
    return { conversationId }
  })

  registerAcknowledgedEvent(socket, 'message:send', async (payload) => {
    const data = parse(sendPayload, payload)
    const message = await chatService.sendMessage(data.conversationId, user, data)
    await socket.join(roomName(data.conversationId))
    io.to(roomName(data.conversationId)).to('staff:inbox').emit('message:new', { message })
    const conversation = await chatService.getConversation(data.conversationId, user)
    io.to('staff:inbox').emit('conversation:updated', { conversation })
    return { message }
  })

  registerAcknowledgedEvent(socket, 'message:read', async (payload) => {
    const { conversationId, messageId } = parse(readPayload, payload)
    const receipt = await chatService.markRead(conversationId, user, messageId)
    await socket.join(roomName(conversationId))
    io.to(roomName(conversationId)).emit('message:read', receipt)
    return { receipt }
  })

  for (const event of ['typing:start', 'typing:stop']) {
    registerAcknowledgedEvent(socket, event, async (payload) => {
      const { conversationId } = parse(conversationPayload, payload)
      await chatService.getConversation(conversationId, user)
      socket.to(roomName(conversationId)).emit(event, {
        conversationId,
        user: {
          id: user._id,
          displayName: user.displayName,
          role: user.role?.toUpperCase(),
        },
      })
      return { conversationId }
    })
  }
}

export const initializeSocketServer = (httpServer) => {
  const io = new Server(httpServer, { cors: corsOptions })
  io.use(authenticateSocket)
  io.on('connection', async (socket) => {
    if (socket.data.user?.role?.toUpperCase() === 'STAFF') {
      await socket.join('staff:inbox')
    }
    registerChatHandlers(io, socket)
  })
  return io
}
