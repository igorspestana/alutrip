-- Create itineraries table
CREATE TABLE IF NOT EXISTS itineraries (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(255), -- For future session tracking
  client_ip VARCHAR(45) NOT NULL, -- For rate limiting (supports IPv6)
  destination VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  budget DECIMAL(10,2), -- Budget in USD
  interests TEXT[], -- Array of interests
  request_data JSONB NOT NULL, -- Complete form data
  generated_content TEXT NOT NULL DEFAULT '', -- LLM generated itinerary
  pdf_filename VARCHAR(255), -- Generated PDF filename
  pdf_path VARCHAR(500), -- Path to PDF file
  model_used VARCHAR(100) NOT NULL DEFAULT 'groq' CHECK (model_used IN ('groq', 'gemini')),
  processing_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_itineraries_session_id ON itineraries(session_id);
CREATE INDEX IF NOT EXISTS idx_itineraries_client_ip ON itineraries(client_ip);
CREATE INDEX IF NOT EXISTS idx_itineraries_created_at ON itineraries(created_at);
CREATE INDEX IF NOT EXISTS idx_itineraries_processing_status ON itineraries(processing_status);
CREATE INDEX IF NOT EXISTS idx_itineraries_destination ON itineraries(destination);
CREATE INDEX IF NOT EXISTS idx_itineraries_start_date ON itineraries(start_date);
CREATE INDEX IF NOT EXISTS idx_itineraries_model_used ON itineraries(model_used);

-- Create GIN index for JSONB request_data for efficient querying
CREATE INDEX IF NOT EXISTS idx_itineraries_request_data_gin ON itineraries USING GIN (request_data);

-- Create index for interests array
CREATE INDEX IF NOT EXISTS idx_itineraries_interests_gin ON itineraries USING GIN (interests);

-- Add comments for documentation
COMMENT ON TABLE itineraries IS 'Stores travel itinerary requests and generated content';
COMMENT ON COLUMN itineraries.session_id IS 'Session identifier for future chat support';
COMMENT ON COLUMN itineraries.client_ip IS 'Client IP address for rate limiting';
COMMENT ON COLUMN itineraries.destination IS 'Travel destination';
COMMENT ON COLUMN itineraries.start_date IS 'Trip start date';
COMMENT ON COLUMN itineraries.end_date IS 'Trip end date';
COMMENT ON COLUMN itineraries.budget IS 'Trip budget in USD';
COMMENT ON COLUMN itineraries.interests IS 'Array of user interests';
COMMENT ON COLUMN itineraries.request_data IS 'Complete form data as JSONB';
COMMENT ON COLUMN itineraries.generated_content IS 'AI-generated itinerary content';
COMMENT ON COLUMN itineraries.pdf_filename IS 'Generated PDF filename';
COMMENT ON COLUMN itineraries.pdf_path IS 'Path to generated PDF file';
COMMENT ON COLUMN itineraries.model_used IS 'AI model used for generation';
COMMENT ON COLUMN itineraries.processing_status IS 'Current processing status';
COMMENT ON COLUMN itineraries.completed_at IS 'Timestamp when processing completed';

