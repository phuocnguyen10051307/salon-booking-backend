# Chat flow and Socket.IO contract

## Flow

Conversation creation/listing, paginated message history, and read positions use
the authenticated REST API. A customer has one support conversation. Staff see
the shared support queue and are recorded in `conversation_participants` when
they first join, load, read, or send in a conversation.

After login, Flutter opens one Socket.IO connection with
`auth: { token: accessToken }`. The server validates the token, stores the user
in `socket.data.user`, and joins `user:{userId}`. Opening a chat emits
`conversation:join`; the server authorizes access before joining
`conversation:{conversationId}`.

Flutter sends `{ conversationId, content }` with `message:send`. The server
trims and validates the content, verifies access, writes the message and
conversation timestamp in one transaction, and only then emits `message:new`.
Flutter merges that saved message by its database ID and does not reload history.

## Acknowledgements

- Success: `{ "success": true, "data": { ... } }`
- Failure: `{ "success": false, "message": "Safe error message" }`

## Events

| Direction | Event | Payload |
| --- | --- | --- |
| Client to server | `conversation:join` | `{ conversationId }` |
| Client to server | `conversation:leave` | `{ conversationId }` |
| Client to server | `message:send` | `{ conversationId, content }` |
| Client to server | `typing:start` / `typing:stop` | `{ conversationId }` |
| Server to client | `message:new` | `{ message }` |
| Server to client | `message:error` | `{ success: false, message, event? }` |
| Server to client | `user:typing` | `{ conversationId, isTyping, user }` |
| Server to client | `conversation:updated` | `{ conversation }` |

The canonical message contains `id`, `conversationId`, `content`,
`senderRole`, `sender { id, displayName, avatarUrl, role }`, and ISO-8601
`createdAt`.
