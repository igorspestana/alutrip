-- Create travel_questions table
CREATE TABLE IF NOT EXISTS travel_questions (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255), -- For future session tracking
  client_ip VARCHAR(45) NOT NULL, -- For rate limiting (supports IPv6)
  question TEXT NOT NULL,
  model_used VARCHAR(100) NOT NULL CHECK (model_used IN ('groq', 'gemini')),
  response TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_travel_questions_session_id ON travel_questions(session_id);
CREATE INDEX IF NOT EXISTS idx_travel_questions_client_ip ON travel_questions(client_ip);
CREATE INDEX IF NOT EXISTS idx_travel_questions_created_at ON travel_questions(created_at);
CREATE INDEX IF NOT EXISTS idx_travel_questions_model_used ON travel_questions(model_used);

-- Add comments for documentation
COMMENT ON TABLE travel_questions IS 'Stores travel questions and AI-generated responses';
COMMENT ON COLUMN travel_questions.session_id IS 'Session identifier for future chat support';
COMMENT ON COLUMN travel_questions.client_ip IS 'Client IP address for rate limiting';
COMMENT ON COLUMN travel_questions.model_used IS 'AI model used for response generation';
COMMENT ON COLUMN travel_questions.question IS 'User travel question';
COMMENT ON COLUMN travel_questions.response IS 'AI-generated response to the question';

