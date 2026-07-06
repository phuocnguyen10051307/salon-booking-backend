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
const legacyListQuerySchema = z.object({
  conversation_id: uuid.optional(),
})
const legacyCreateSchema = z.object({
  conversation_id: uuid.optional(),
  conversationId: uuid.optional(),
  content: z.string().optional(),
  message_content: z.string().optional(),
  sender_type: z.string().optional(),
  senderType: z.string().optional(),
})

export const chatValidation = {
  createConversationSchema,
  listConversationsQuerySchema,
  conversationParamsSchema,
  messageHistoryQuerySchema,
  markReadSchema,
  legacyListQuerySchema,
  legacyCreateSchema,
}
