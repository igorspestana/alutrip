# AluTrip Backend API

Travel planning assistant backend API built with Node.js, TypeScript, and Express.js. Provides intelligent travel assistance using AI models from Groq and Gemini.

## Features

- **No Authentication Required** - Open access with IP-based rate limiting
- **Travel Q&A System** - AI-powered travel questions and answers
- **Itinerary Generation** - Comprehensive travel plan creation with PDF export
- **Multi-Model AI Support** - Integration with Groq and Gemini AI providers
- **Rate Limiting** - IP-based protection (5 requests per 24h per feature)
- **Asynchronous Processing** - Background job processing for heavy operations
- **Docker Support** - Complete containerized development environment

## Tech Stack

- **Runtime**: Node.js 22.x (Active LTS)
- **Language**: TypeScript (strict mode)
- **Framework**: Express.js
- **Database**: PostgreSQL (primary) + Redis (cache & rate limiting)
- **AI Integration**: Groq SDK + Google Generative AI
- **Validation**: Zod schemas
- **Logging**: Winston (structured logging)
- **Queue System**: Bull/BullMQ (async processing)
- **PDF Generation**: PDFMake
- **Containerization**: Docker + Docker Compose

## Project Structure

```
src/
├── config/          # Configuration files
│   ├── env.ts       # Environment validation
│   ├── database.ts  # PostgreSQL configuration
│   ├── redis.ts     # Redis configuration
│   ├── logger.ts    # Winston logging
│   └── axios.ts     # HTTP client configuration
├── controllers/     # Request handlers
├── services/        # Business logic
├── models/          # Database models
├── middleware/      # Custom middleware
│   ├── error-handler.ts  # Error handling
│   └── rate-limit.ts     # Rate limiting
├── routes/          # API routes
├── schemas/         # Zod validation schemas
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
└── app.ts           # Express app setup

migrations/          # Database migrations
docker/             # Docker configuration
logs/               # Application logs
pdfs/               # Generated PDFs
```

## 🚀 How to Run

### Environment Configuration (Required)

Before running the project, you need to configure the environment variables for backend:

Create a `.env` file in the `alutrip-backend/` directory based on `.env.example`:

```bash
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DATABASE_URL=postgresql://alutrip_user:alutrip_password@localhost:5432/alutrip_backend
REDIS_URL=redis://localhost:6379

# AI Service Configuration - Groq
GROQ_API_KEY=your-groq-api-key
GROQ_MODEL=llama-3.1-8b-instant

# AI Service Configuration - Gemini
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.5-flash

# Rate Limiting Configuration
RATE_LIMIT_REQUESTS=5
RATE_LIMIT_WINDOW=86400000
RATE_LIMIT_CLEANUP_INTERVAL=3600000

# PDF Configuration
PDF_STORAGE_PATH=./pdfs
PDF_MAX_PAGES=50
PDF_TIMEOUT=300000

# Queue Configuration
REDIS_QUEUE_URL=redis://localhost:6379
QUEUE_CONCURRENCY=5
QUEUE_MAX_ATTEMPTS=3

# Logging Configuration
LOG_LEVEL=info
LOG_DIR=logs

# HTTP Client Configuration
HTTP_TIMEOUT=30000
GROQ_TIMEOUT=60000
GEMINI_TIMEOUT=60000

# CORS Configuration (for Frontend)
CORS_ORIGIN=http://localhost:5173
CORS_CREDENTIALS=false

# Session Configuration (for future features)
SESSION_TIMEOUT=7200000

# Docker Configuration
POSTGRES_USER=alutrip_user
POSTGRES_PASSWORD=your_postgres_password
PGADMIN_EMAIL=admin@alutrip.com
PGADMIN_PASSWORD=your_pgadmin_password
REDIS_COMMANDER_USER=admin
REDIS_COMMANDER_PASSWORD=your_redis_commander_password
```
### API Keys

For full functionality, configure the API keys:

1. **Groq**: Get it at https://console.groq.com/
2. **Gemini**: Get it at https://makersuite.google.com/app/apikey

### Start

#### Option 1: Docker (Recommended)

```bash
# Navigate to backend directory
cd alutrip-backend

# Start all services (including backend)
npm run dc:up

# Wait for services to be ready (30-60 seconds)
# Check container status
npm run dc:ps

# Run database migrations
npm run migrate:dev up

# Check migration status
npm run migrate:dev status

# Check logs
npm run dc:logs

# Stop services
npm run dc:down
```

#### Option 2: Local Development

```bash
# Navigate to backend directory
cd alutrip-backend

# Start PostgreSQL, Redis, PgAdmin and Redis Commander
npm run dc:up -- postgres redis pgadmin redis-commander

# Wait for services to be ready (30-60 seconds)
# Check container status
npm run dc:ps

# Run database migrations
npm run migrate:dev up

# Check migration status
npm run migrate:dev status

# Install dependencies and run in development mode
npm install
npm run dev
```

**Services available after starting containers:**
- Backend API: `http://localhost:3000` (Docker) or `http://localhost:3000` (Local)
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
- PgAdmin: `http://localhost:8080` (admin@alutrip.com / your_pgadmin_password)
- Redis Commander: `http://localhost:8001` (admin / your_redis_commander_password)

### Variable Descriptions

#### Server Configuration
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment mode (development/production)

#### Database Configuration
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string for cache and rate limiting

#### AI Service Configuration
- `GROQ_API_KEY`: API key for Groq AI service
- `GROQ_MODEL`: Groq model to use (default: llama-3.1-8b-instant)
- `GEMINI_API_KEY`: API key for Google Gemini AI service
- `GEMINI_MODEL`: Gemini model to use (default: gemini-2.5-flash)

#### Rate Limiting Configuration
- `RATE_LIMIT_REQUESTS`: Maximum requests per window (default: 5)
- `RATE_LIMIT_WINDOW`: Time window in milliseconds (default: 24h)
- `RATE_LIMIT_CLEANUP_INTERVAL`: Cleanup interval for expired limits (default: 1h)

#### PDF Configuration
- `PDF_STORAGE_PATH`: Directory for generated PDFs (default: ./pdfs)
- `PDF_MAX_PAGES`: Maximum pages per PDF (default: 50)
- `PDF_TIMEOUT`: PDF generation timeout in milliseconds (default: 5min)

#### Queue Configuration
- `REDIS_QUEUE_URL`: Redis URL for job queue (default: same as REDIS_URL)
- `QUEUE_CONCURRENCY`: Number of concurrent job processors (default: 5)
- `QUEUE_MAX_ATTEMPTS`: Maximum retry attempts for failed jobs (default: 3)

#### Logging Configuration
- `LOG_LEVEL`: Logging level (error/warn/info/debug, default: info)
- `LOG_DIR`: Directory for log files (default: logs)

#### HTTP Client Configuration
- `HTTP_TIMEOUT`: Default HTTP timeout in milliseconds (default: 30s)
- `GROQ_TIMEOUT`: Groq API timeout in milliseconds (default: 60s)
- `GEMINI_TIMEOUT`: Gemini API timeout in milliseconds (default: 60s)

#### CORS Configuration
- `CORS_ORIGIN`: Allowed origin for CORS (default: http://localhost:5173)
- `CORS_CREDENTIALS`: Whether to allow credentials (default: false)

#### Session Configuration
- `SESSION_TIMEOUT`: Session timeout in milliseconds (default: 2h, for future features)

#### Docker Configuration
- `POSTGRES_USER`: PostgreSQL username for Docker
- `POSTGRES_PASSWORD`: PostgreSQL password for Docker
- `PGADMIN_EMAIL`: PgAdmin login email
- `PGADMIN_PASSWORD`: PgAdmin login password
- `REDIS_COMMANDER_USER`: Redis Commander username
- `REDIS_COMMANDER_PASSWORD`: Redis Commander password

## API Endpoints

For detailed API documentation including request/response examples, error codes, and complete endpoint specifications, see [docs/endpoints.md](docs/endpoints.md).

## Scripts

### NPM Scripts

```bash
# Development
npm run dev          # Start development server with hot reload
npm run build        # Build for production
npm start            # Start production server

# Database Migrations
npm run migrate:dev up     # Run pending migrations (TypeScript - local dev only)
npm run migrate:dev status # Check migration status (TypeScript - local dev only)
npm run migrate up         # Run pending migrations (compiled - Docker/production)
npm run migrate down       # Rollback last migration (compiled)
npm run migrate status     # Check migration status (compiled)

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint errors
npm run format       # Format code with Prettier
npm test             # Run tests
npm run test:coverage # Run tests with coverage
```

### Testing Scripts

The `scripts/` directory contains comprehensive testing and utility scripts:

#### API Testing Scripts

- **`test-alutrip-responde.sh`** - Complete test suite for Travel Q&A endpoints
  - Tests all travel question endpoints
  - Validates AI model responses (Groq and Gemini)
  - Tests rate limiting and guardrails
  - Includes error handling scenarios

- **`test-alutrip-planeja.sh`** - Complete test suite for Itinerary Planning endpoints
  - Tests itinerary creation and processing
  - Validates PDF generation
  - Tests asynchronous processing and status checking
  - Includes rescue functionality for stuck itineraries

- **`test-rate-limit-complete.sh`** - Comprehensive rate limiting tests
  - Tests rate limit enforcement across all features
  - Validates reset mechanisms
  - Tests edge cases and error scenarios

#### Utility Scripts

- **`check-rate-limits.sh`** - Check current rate limit status
  - Shows active rate limits by IP and feature
  - Displays usage statistics
  - Useful for monitoring and debugging

- **`clear-rate-limits.sh`** - Clear all rate limits
  - Removes all rate limit entries from Redis
  - Useful for testing and development
  - Includes safety confirmations

- **`reset-containers.sh`** - Reset Docker containers and data
  - Stops all containers
  - Removes volumes (deletes all data)
  - Cleans up orphaned resources
  - **Warning**: This will delete all data!

#### Usage Examples

```bash
# Test Travel Q&A functionality
./scripts/test-alutrip-responde.sh

# Test Itinerary Planning functionality
./scripts/test-alutrip-planeja.sh

# Check current rate limits
./scripts/check-rate-limits.sh

# Clear rate limits for testing
./scripts/clear-rate-limits.sh

# Reset all containers (destructive!)
./scripts/reset-containers.sh
```

**Note**: All testing scripts require the backend API to be running (`npm run dev`) and Docker containers to be active.

## Docker Commands

```bash
# Development environment (Compose uses root .env)
npm run dc:up                      # Start all services
npm run dc:logs -- alutrip-backend  # View API logs
npm run dc:ps                      # List running services
npm run dc:down                    # Stop services

# Database administration
# PgAdmin available at http://localhost:8080
# Email: admin@alutrip.com, Password: your_pgadmin_password (from .env)
# Redis Commander available at http://localhost:8001
# Username: admin, Password: admin123 (from .env)
```

## Security Features

- **Input Validation**: Zod schemas for all endpoints
- **Rate Limiting**: IP-based with Redis backend
- **Security Headers**: Helmet.js configuration
- **CORS Protection**: Configurable origin restrictions
- **Error Handling**: Structured error responses
- **SQL Injection Prevention**: Parameterized queries
- **No Authentication**: Open access design

## Monitoring & Logging

- **Structured Logging**: Winston with multiple transports
- **Health Checks**: Kubernetes-ready health endpoints
- **Error Tracking**: Comprehensive error logging
- **Performance Metrics**: Response time monitoring
- **Database Monitoring**: Query performance tracking

## Rate Limiting

- **Feature-based**: Separate limits for travel questions and itineraries
- **IP-based Tracking**: 5 requests per 24 hours per feature
- **Redis Backend**: Persistent across server restarts
- **Graceful Handling**: Clear error messages and reset times

## Development Guidelines

- **TypeScript Strict Mode**: All code must pass strict type checking
- **Code Style**: ESLint + Prettier configuration
- **Error Handling**: Always use async/await, never .then()/.catch()
- **Logging**: Use Winston logger, not console.log
- **Validation**: Zod schemas for all inputs
- **Documentation**: JSDoc comments for complex functions

## Contributing

1. Follow TypeScript strict mode
2. Use conventional commit messages
3. Add tests for new features
4. Update documentation
5. Ensure all linting passes

## License

MIT License - see LICENSE file for details

## Architecture

This backend follows a hybrid architecture pattern with:

- **Service-oriented design**: Clear separation of concerns
- **Asynchronous processing**: Background jobs for heavy operations  
- **Multi-provider AI integration**: Groq and Gemini support
- **Rate limiting**: IP-based protection mechanisms
- **Scalable database design**: PostgreSQL with Redis caching

For detailed architecture information, see [docs/architecture.md](docs/architecture.md).

---

**AluTrip**: Making travel planning accessible, intelligent, and effortless for everyone.

