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
const sendPayload = conversationPayload.extend({ content: z.string() })

const conversationRoom = (conversationId) => `conversation:${conversationId}`
const userRoom = (userId) => `user:${userId}`

const parse = (schema, payload) => {
  const result = schema.safeParse(payload)
  if (!result.success) {
    throw new ApiError(400, result.error.issues.map((issue) => issue.message).join(', '), 'VALIDATION_ERROR')
  }
  return result.data
}

const safeMessage = (error) => (error instanceof ApiError ? error.message : 'Internal server error')

const registerAcknowledgedEvent = (socket, event, handler) => {
  socket.on(event, async (payload = {}, acknowledge) => {
    try {
      const data = await handler(payload)
      if (typeof acknowledge === 'function') acknowledge({ success: true, data })
    } catch (error) {
      if (!(error instanceof ApiError)) console.error(`Socket ${event} failed:`, error)
      const response = { success: false, message: safeMessage(error) }
      if (typeof acknowledge === 'function') acknowledge(response)
      else socket.emit('message:error', { ...response, event })
    }
  })
}

const authenticationError = (code, message) => {
  const error = new Error(message)
  error.data = { code, message }
  return error
}

const rejectAuthentication = (next, code, message) => {
  console.warn(`[Socket.IO] Authentication rejected code=${code}`)
  return next(authenticationError(code, message))
}

const authenticateSocket = async (socket, next) => {
  try {
    const rawToken = socket.handshake.auth?.token
    const token = rawToken?.toString().replace(/^Bearer\s+/i, '')
    if (!token) return rejectAuthentication(next, 'AUTH_REQUIRED', 'Access token is required')

    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET)
    const user = await prisma.users.findUnique({ where: { user_id: decoded._id } })
    if (!user?.is_active) return rejectAuthentication(next, 'INVALID_TOKEN', 'User is not available')

    const mappedUser = authService.mapUserResponse(user)
    chatService.assertChatRole(mappedUser)
    socket.data.user = mappedUser
    return next()
  } catch (error) {
    if (error.code === 'ROLE_FORBIDDEN') {
      return rejectAuthentication(next, 'ROLE_FORBIDDEN', error.message)
    }
    const expired = error.name === 'TokenExpiredError'
    return rejectAuthentication(
      next,
      expired ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
      expired ? 'Access token expired' : 'Invalid access token'
    )
  }
}

const registerChatHandlers = (io, socket) => {
  const user = socket.data.user

  registerAcknowledgedEvent(socket, 'conversation:join', async (payload) => {
    const { conversationId } = parse(conversationPayload, payload)
    const conversation = await chatService.getConversation(conversationId, user, { join: true })
    await socket.join(conversationRoom(conversationId))
    return { conversation }
  })

  registerAcknowledgedEvent(socket, 'conversation:leave', async (payload) => {
    const { conversationId } = parse(conversationPayload, payload)
    await socket.leave(conversationRoom(conversationId))
    return { conversationId }
  })

  registerAcknowledgedEvent(socket, 'message:send', async (payload) => {
    const data = parse(sendPayload, payload)
    const message = await chatService.sendMessage(data.conversationId, user, data.content)
    await socket.join(conversationRoom(data.conversationId))
    io.to(conversationRoom(data.conversationId)).emit('message:new', { message })

    const conversation = await chatService.getConversation(data.conversationId, user)
    io.to('staff:inbox').to(userRoom(conversation.customer.id)).emit('conversation:updated', { conversation })
    return { message }
  })

  for (const event of ['typing:start', 'typing:stop']) {
    registerAcknowledgedEvent(socket, event, async (payload) => {
      const { conversationId } = parse(conversationPayload, payload)
      await chatService.getConversation(conversationId, user, { requireParticipant: true })
      socket.to(conversationRoom(conversationId)).emit('user:typing', {
        conversationId,
        isTyping: event === 'typing:start',
        user: { id: user._id, displayName: user.displayName, avatarUrl: user.avatarUrl, role: user.role?.toUpperCase() },
      })
      return { conversationId }
    })
  }
}

export const initializeSocketServer = (httpServer) => {
  const io = new Server(httpServer, {
    cors: corsOptions,
    path: '/socket.io',
    transports: ['websocket', 'polling'],
  })
  io.engine.on('connection_error', (error) => {
    console.error('[Socket.IO] Engine connection error', {
      code: error.code,
      message: error.message,
      transport: error.context?.transport?.name,
      origin: error.req?.headers?.origin,
    })
  })
  io.use(authenticateSocket)
  io.on('connection', async (socket) => {
    const user = socket.data.user
    console.log(`[Socket.IO] Connected socket=${socket.id} user=${user._id}`)
    socket.on('disconnect', (reason) => {
      console.log(`[Socket.IO] Disconnected socket=${socket.id} reason=${reason}`)
    })
    await socket.join(userRoom(user._id))
    if (user.role?.toUpperCase() === 'STAFF') await socket.join('staff:inbox')
    registerChatHandlers(io, socket)
  })
  return io
}
