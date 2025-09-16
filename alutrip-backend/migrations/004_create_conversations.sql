-- Create conversations table (for future chat support)
CREATE TABLE IF NOT EXISTS conversations (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL, -- Links to initial question
  initial_question_id INTEGER REFERENCES travel_questions(id) ON DELETE CASCADE,
  title VARCHAR(255), -- Auto-generated conversation title
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create messages table (for future chat support)
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  message_type VARCHAR(20) NOT NULL CHECK (message_type IN ('question', 'response')),
  content TEXT NOT NULL,
  model_used VARCHAR(100) CHECK (model_used IN ('groq', 'gemini')), -- Only for responses
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for conversations
CREATE INDEX IF NOT EXISTS idx_conversations_session_id ON conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_conversations_initial_question_id ON conversations(initial_question_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at);

-- Create indexes for messages
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_message_type ON messages(message_type);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- Create function to automatically update updated_at in conversations
CREATE OR REPLACE FUNCTION update_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at when conversations are modified
DROP TRIGGER IF EXISTS trigger_update_conversations_updated_at ON conversations;
CREATE TRIGGER trigger_update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_conversations_updated_at();

-- Create function to update conversation updated_at when new messages are added
CREATE OR REPLACE FUNCTION update_conversation_on_message_insert()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations 
  SET updated_at = NEW.created_at 
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update conversation when new messages are added
DROP TRIGGER IF EXISTS trigger_update_conversation_on_message_insert ON messages;
CREATE TRIGGER trigger_update_conversation_on_message_insert
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_on_message_insert();

-- Add comments for documentation
COMMENT ON TABLE conversations IS 'Stores conversation metadata for future chat support';
COMMENT ON COLUMN conversations.session_id IS 'Session identifier linking to original question';
COMMENT ON COLUMN conversations.initial_question_id IS 'Reference to the initial travel question that started this conversation';
COMMENT ON COLUMN conversations.title IS 'Auto-generated title for the conversation';

COMMENT ON TABLE messages IS 'Stores individual messages within conversations';
COMMENT ON COLUMN messages.conversation_id IS 'Reference to the parent conversation';
COMMENT ON COLUMN messages.message_type IS 'Type of message: question (user) or response (AI)';
COMMENT ON COLUMN messages.content IS 'Message content';
COMMENT ON COLUMN messages.model_used IS 'AI model used for response generation (null for user questions)';

