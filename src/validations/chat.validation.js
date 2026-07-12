import { z } from 'zod'

const uuid = z.string().uuid('Invalid identifier')
const limit = z.coerce.number().int().min(1).max(50).default(20)

const createConversationSchema = z.object({}).passthrough()
const listConversationsQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit,
})
const conversationParamsSchema = z.object({ id: uuid })
const messageHistoryQuerySchema = z.object({
  before: uuid.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
})
const markReadSchema = z.object({ messageId: uuid })

export const chatValidation = {
  createConversationSchema,
  listConversationsQuerySchema,
  conversationParamsSchema,
  messageHistoryQuerySchema,
  markReadSchema,
}
