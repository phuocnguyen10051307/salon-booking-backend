import assert from 'node:assert/strict'
import test from 'node:test'

import { chatService, chatServiceInternals } from '../src/services/chat.service.js'

test('chat roles allow customers and staff but reject administrators', () => {
  assert.doesNotThrow(() => chatService.assertChatRole({ role: 'customer' }))
  assert.doesNotThrow(() => chatService.assertChatRole({ role: 'STAFF' }))
  assert.throws(
    () => chatService.assertChatRole({ role: 'ADMIN' }),
    (error) => error.code === 'ROLE_FORBIDDEN'
  )
})

test('message content is trimmed and bounded', () => {
  assert.equal(chatServiceInternals.normalizeContent('  hello  '), 'hello')
  assert.throws(
    () => chatServiceInternals.normalizeContent('   '),
    (error) => error.code === 'VALIDATION_ERROR'
  )
  assert.throws(
    () => chatServiceInternals.normalizeContent('x'.repeat(4001)),
    (error) => error.code === 'VALIDATION_ERROR'
  )
})

test('conversation cursor round trips stable ordering values', () => {
  const conversation = {
    conversation_id: '9c2a1253-fb91-4da0-8540-01f48e10a26c',
    updated_at: new Date('2026-07-03T12:00:00.000Z'),
  }
  const cursor = chatServiceInternals.encodeCursor(conversation)
  const decoded = chatServiceInternals.decodeCursor(cursor)
  assert.equal(decoded.id, conversation.conversation_id)
  assert.equal(decoded.updatedAt.toISOString(), conversation.updated_at.toISOString())
  assert.throws(
    () => chatServiceInternals.decodeCursor('not-a-cursor'),
    (error) => error.code === 'VALIDATION_ERROR'
  )
})

test('conversation access isolates customers while allowing shared staff access', () => {
  const conversation = { customer_id: 'customer-a' }
  assert.doesNotThrow(() =>
    chatServiceInternals.assertConversationAccess(conversation, {
      _id: 'customer-a',
      role: 'CUSTOMER',
    })
  )
  assert.throws(
    () =>
      chatServiceInternals.assertConversationAccess(conversation, {
        _id: 'customer-b',
        role: 'CUSTOMER',
      }),
    (error) => error.code === 'FORBIDDEN'
  )
  assert.doesNotThrow(() =>
    chatServiceInternals.assertConversationAccess(conversation, {
      _id: 'staff-a',
      role: 'STAFF',
    })
  )
})

test('read positions never move backwards at equal timestamps', () => {
  const createdAt = new Date('2026-07-03T12:00:00.000Z')
  assert.equal(
    chatServiceInternals.hasReadThrough(
      { created_at: createdAt, message_id: 'message-b' },
      { created_at: createdAt, message_id: 'message-a' }
    ),
    true
  )
  assert.equal(
    chatServiceInternals.hasReadThrough(
      { created_at: createdAt, message_id: 'message-a' },
      { created_at: createdAt, message_id: 'message-b' }
    ),
    false
  )
})
