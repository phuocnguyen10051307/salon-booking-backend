CREATE TABLE conversations (
  conversation_id UUID NOT NULL DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL,
  last_message_at TIMESTAMP(6),
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT conversations_pkey PRIMARY KEY (conversation_id)
);

CREATE TABLE messages (
  message_id UUID NOT NULL DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  sender_id UUID,
  sender_role user_role NOT NULL,
  client_message_id VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT messages_pkey PRIMARY KEY (message_id)
);

CREATE TABLE conversation_participants (
  conversation_id UUID NOT NULL,
  user_id UUID NOT NULL,
  last_read_message_id UUID,
  joined_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_read_at TIMESTAMP(6),
  CONSTRAINT conversation_participants_pkey PRIMARY KEY (conversation_id, user_id)
);

CREATE UNIQUE INDEX conversations_customer_id_key ON conversations(customer_id);
CREATE INDEX conversations_last_message_at_conversation_id_idx
ON conversations(last_message_at, conversation_id);
CREATE UNIQUE INDEX messages_conversation_id_sender_id_client_message_id_key
ON messages(conversation_id, sender_id, client_message_id);
CREATE INDEX messages_conversation_id_created_at_message_id_idx
ON messages(conversation_id, created_at, message_id);
CREATE INDEX conversation_participants_user_id_conversation_id_idx
ON conversation_participants(user_id, conversation_id);
CREATE INDEX conversation_participants_last_read_message_id_idx
ON conversation_participants(last_read_message_id);

ALTER TABLE conversations
ADD CONSTRAINT conversations_customer_id_fkey
FOREIGN KEY (customer_id) REFERENCES users(user_id)
ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE messages
ADD CONSTRAINT messages_conversation_id_fkey
FOREIGN KEY (conversation_id) REFERENCES conversations(conversation_id)
ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE messages
ADD CONSTRAINT messages_sender_id_fkey
FOREIGN KEY (sender_id) REFERENCES users(user_id)
ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE conversation_participants
ADD CONSTRAINT conversation_participants_conversation_id_fkey
FOREIGN KEY (conversation_id) REFERENCES conversations(conversation_id)
ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE conversation_participants
ADD CONSTRAINT conversation_participants_user_id_fkey
FOREIGN KEY (user_id) REFERENCES users(user_id)
ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE conversation_participants
ADD CONSTRAINT conversation_participants_last_read_message_id_fkey
FOREIGN KEY (last_read_message_id) REFERENCES messages(message_id)
ON DELETE SET NULL ON UPDATE NO ACTION;

INSERT INTO conversations (
  customer_id,
  last_message_at,
  created_at,
  updated_at
)
SELECT
  cm.user_id,
  MAX(cm.sent_at),
  MIN(COALESCE(cm.sent_at, CURRENT_TIMESTAMP)),
  MAX(COALESCE(cm.sent_at, CURRENT_TIMESTAMP))
FROM chat_messages cm
JOIN users u ON u.user_id = cm.user_id
WHERE cm.user_id IS NOT NULL AND u.role = 'CUSTOMER'
GROUP BY cm.user_id
ON CONFLICT (customer_id) DO NOTHING;

INSERT INTO conversation_participants (conversation_id, user_id, joined_at)
SELECT c.conversation_id, c.customer_id, c.created_at
FROM conversations c
ON CONFLICT (conversation_id, user_id) DO NOTHING;

INSERT INTO messages (
  message_id,
  conversation_id,
  sender_id,
  sender_role,
  client_message_id,
  content,
  created_at
)
SELECT
  cm.message_id,
  c.conversation_id,
  CASE WHEN UPPER(cm.sender_type) = 'STAFF' THEN NULL ELSE cm.user_id END,
  CASE WHEN UPPER(cm.sender_type) = 'STAFF' THEN 'STAFF'::user_role ELSE 'CUSTOMER'::user_role END,
  'legacy-' || cm.message_id::TEXT,
  cm.message_content,
  COALESCE(cm.sent_at, CURRENT_TIMESTAMP)
FROM chat_messages cm
JOIN conversations c ON c.customer_id = cm.user_id
ON CONFLICT (message_id) DO NOTHING;
