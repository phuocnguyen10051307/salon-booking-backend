DROP INDEX IF EXISTS messages_conversation_id_sender_id_client_message_id_key;

ALTER TABLE messages
DROP COLUMN IF EXISTS client_message_id;
