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
- **PDF Generation**: Puppeteer
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

## Quick Start

### Prerequisites

- Node.js 22.x or higher
- npm 10.x or higher
- Docker and Docker Compose (for containerized setup)

### Environment Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd alutrip-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your actual configuration (single source of truth)
   ```

4. **Update the `.env` file with your actual values:**
   ```env
   # Replace these placeholder values with your actual credentials
   DATABASE_URL=postgresql://alutrip_user:your_actual_postgres_password@localhost:5432/alutrip_backend
   REDIS_URL=redis://localhost:6379
   
   # AI Services
   GROQ_API_KEY=your_actual_groq_api_key
   GEMINI_API_KEY=your_actual_gemini_api_key
   
   # Server Configuration
   PORT=3000
   NODE_ENV=development
   CORS_ORIGIN=http://localhost:5173
   ```

5. **Start Docker services (PostgreSQL, Redis, tools) using the root `.env`:**
   ```bash
   npm run dc:up
   # View status
   npm run dc:ps
   # View logs (example: redis-commander)
   npm run dc:logs -- redis-commander
   ```

### Security Notes

- Never commit the actual `.env` file to the repository
- Keep a single `.env` at the project root; Docker Compose is invoked with `--env-file ./.env`
- These files contain sensitive information like API keys and database passwords
- Always use the `.example` files as templates for new environments

### Getting API Keys

- **Groq API Key**: Visit [Groq Console](https://console.groq.com/) to get your API key
- **Gemini API Key**: Visit [Google AI Studio](https://makersuite.google.com/app/apikey) to get your API key

### Database Setup

The Docker Compose configuration includes:
- PostgreSQL database
- Redis cache
- PgAdmin for database administration
- Redis Commander for Redis administration

All services are configured with default credentials that should be changed for production use.

### Database Migrations

The project includes automatic database schema management through migrations:

- **Migration files**: Located in `migrations/` directory (numbered SQL files)
- **Migration tracking**: Automatic tracking of executed migrations in `migrations` table
- **Two execution modes**:
  - `migrate:dev` - Runs TypeScript files directly (for local development)
  - `migrate` - Runs compiled JavaScript files (for Docker/production)

**When to run migrations:**
- First time setup: Always run after starting database
- After pulling code updates: Check if new migrations were added
- Before deploying: Ensure all migrations are applied

### Development

#### Option 1: Docker (Recommended)

```bash
# Start all services (PostgreSQL, Redis, API) using root .env
npm run dc:up

# Run database migrations (required on first run)
npm run migrate up

# Check migration status (optional)
npm run migrate status

# View logs
npm run dc:logs -- alutrip-backend

# Stop services
npm run dc:down
```

**Important Notes:**
- The production image already runs a build step. You generally do not need to run `npm run build` on the host when using the Docker stack.
- **Migrations with Docker**: Use `npm run migrate` (compiled) commands when running with Docker containers
- **Migrations for local development**: Use `npm run migrate:dev` (TypeScript) commands only when running the API directly on the host

#### Option 2: Local Development

```bash
# Start PostgreSQL and Redis via Docker only
npm run dc:up -- postgres redis pgadmin redis-commander

# EITHER run migrations in dev without build (recommended during development)
npm run migrate:dev status
npm run migrate:dev up

# OR build once then run compiled migrations (recommended for production-like runs)
npm run build
npm run migrate up

# Start development server (uses root .env via dotenv)
npm run dev
```

### Production

```bash
# Build the application
npm run build

# Run migrations
npm run migrate up

# Start production server
npm start
```

## API Endpoints

### Health Check

- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed system information
- `GET /health/ready` - Readiness probe (Kubernetes)
- `GET /health/live` - Liveness probe (Kubernetes)

### Travel Q&A (Coming in Phase 2)

- `POST /api/travel/ask` - Submit travel question
- `GET /api/travel/questions` - Get recent questions
- `GET /api/travel/questions/:id` - Get specific question

### Itinerary Planning (Coming in Phase 3)

- `POST /api/itinerary/create` - Submit itinerary request
- `GET /api/itinerary/:id/status` - Check generation status
- `GET /api/itinerary/:id/download` - Download PDF

### Rate Limiting

- `GET /api/limits/status` - Check rate limit status

## Scripts

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

