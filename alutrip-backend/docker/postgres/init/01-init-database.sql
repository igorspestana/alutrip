-- Initialize AluTrip Backend Database
-- This script runs automatically when PostgreSQL container starts for the first time

-- Create additional extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Set timezone
SET timezone = 'UTC';

-- Log initialization
\echo 'AluTrip Backend database initialization completed'
\echo 'Database: alutrip_backend'
\echo 'User: alutrip_user'
\echo 'Timezone: UTC'
\echo 'Extensions: uuid-ossp, pg_trgm'

