# Chat Socket.IO event contract

The default Socket.IO namespace uses the same server origin as the REST API.
Clients authenticate with `auth: { token: accessToken }`. Only active
`CUSTOMER` and `STAFF` accounts may connect.

Every acknowledged client event returns one of:

- Success: `{ "ok": true, "data": { ... } }`
- Failure: `{ "ok": false, "error": { "code": "...", "message": "..." } }`

## Client events

| Event                | Client payload                                 | Successful data      | Notes                                                                            |
| -------------------- | ---------------------------------------------- | -------------------- | -------------------------------------------------------------------------------- |
| `conversation:join`  | `{ conversationId }`                           | `{ conversation }`   | Authorizes access, records staff participation, and joins the conversation room. |
| `conversation:leave` | `{ conversationId }`                           | `{ conversationId }` | Leaves the room.                                                                 |
| `message:send`       | `{ conversationId, clientMessageId, content }` | `{ message }`        | Persists idempotently and broadcasts `message:new`.                              |
| `message:read`       | `{ conversationId, messageId }`                | `{ receipt }`        | Advances, but never moves backwards, the participant read position.              |
| `typing:start`       | `{ conversationId }`                           | `{ conversationId }` | Broadcast only to other room members.                                            |
| `typing:stop`        | `{ conversationId }`                           | `{ conversationId }` | Broadcast only to other room members.                                            |

## Server events

| Event                          | Payload                                               | Notes                                                                 |
| ------------------------------ | ----------------------------------------------------- | --------------------------------------------------------------------- |
| `message:new`                  | `{ message }`                                         | Sent to conversation members and the shared staff inbox.              |
| `conversation:updated`         | `{ conversation }`                                    | Sent to staff so list previews remain current.                        |
| `message:read`                 | `{ conversationId, userId, role, messageId, readAt }` | Updates unread and Seen state.                                        |
| `typing:start` / `typing:stop` | `{ conversationId, user }`                            | Transient and not persisted.                                          |
| `error`                        | `{ code, message, event?, conversationId? }`          | Used when a client event did not provide an acknowledgement callback. |

Connection failures are delivered through `connect_error`; structured details
are available in `error.data`.

Error codes are `AUTH_REQUIRED`, `TOKEN_EXPIRED`, `INVALID_TOKEN`,
`ROLE_FORBIDDEN`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`,
`DISCONNECTED`, `TIMEOUT`, and `INTERNAL_ERROR`.
