-- Create rate_limits table
CREATE TABLE IF NOT EXISTS rate_limits (
  id SERIAL PRIMARY KEY,
  client_ip VARCHAR(45) NOT NULL, -- IP address (supports IPv6)
  feature VARCHAR(50) NOT NULL CHECK (feature IN ('travel_questions', 'itineraries')),
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMP DEFAULT NOW(),
  last_request TIMESTAMP DEFAULT NOW()
);

-- Create unique index for IP + feature combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_limits_ip_feature ON rate_limits(client_ip, feature);

-- Create index for window_start for cleanup operations
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start ON rate_limits(window_start);

-- Create index for last_request for analytics
CREATE INDEX IF NOT EXISTS idx_rate_limits_last_request ON rate_limits(last_request);

-- Add comments for documentation
COMMENT ON TABLE rate_limits IS 'Stores rate limiting data per IP and feature';
COMMENT ON COLUMN rate_limits.client_ip IS 'Client IP address';
COMMENT ON COLUMN rate_limits.feature IS 'Feature being rate limited (travel_questions or itineraries)';
COMMENT ON COLUMN rate_limits.request_count IS 'Number of requests in current window';
COMMENT ON COLUMN rate_limits.window_start IS 'Start time of current rate limiting window';
COMMENT ON COLUMN rate_limits.last_request IS 'Timestamp of last request';

