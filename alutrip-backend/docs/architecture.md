# AluTrip - System Architecture

## Architecture Overview

AluTrip follows a **hybrid architecture** pattern with independent backend and frontend applications, designed for maximum flexibility, scalability, and maintainability. The system is built around a microservices-inspired approach while maintaining simplicity and ease of development.

## High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React 19.1    │────│   API Gateway   │    │   Rate Limiter  │
│   Frontend      │    │   (Express)     │    │   (Redis-based) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                       │
                                ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Travel Q&A     │────│   PostgreSQL    │    │      Redis      │
│   Service       │    │  (Questions +   │    │  (Cache + Rate  │
│                 │    │  Conversations) │    │   Limiting)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
          │                       │
          ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Itinerary       │────│   Job Queue     │    │   PDF Storage   │
│ Generator       │    │  (Bull/BullMQ)  │    │   (Local/S3)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
          │
          ▼
┌─────────────────┐    ┌─────────────────┐
│   AI Services   │────│   LLM APIs      │
│  (Multi-Model)  │    │ (Groq + Gemini) │
└─────────────────┘    └─────────────────┘
```

## System Components

### 1. Frontend Layer (React 19.1)

**Technology Stack:**
- React 19.1 with TypeScript
- Vite for build tooling
- React Hook Form for form management
- Zod for client-side validation
- Axios for API communication

**Responsibilities:**
- User interface rendering
- Form handling and validation
- API communication
- Error handling and user feedback
- Responsive design implementation

**Key Features:**
- AluTrip Responde form (Travel Q&A)
- AluTrip Planeja form (Itinerary Planning)
- Rate limiting feedback
- PDF download functionality
- Mobile-responsive design

### 2. API Gateway Layer (Express.js)

**Technology Stack:**
- Node.js 22.x (Active LTS)
- Express.js framework
- TypeScript for type safety
- Helmet for security headers
- CORS for cross-origin requests
- Compression for response optimization

**Responsibilities:**
- Request routing and handling
- Middleware orchestration
- Input validation with Zod
- Error handling and response formatting
- Security header management
- Request/response logging

**Key Middleware:**
- Rate limiting (IP-based)
- Input validation
- Error handling
- Request logging
- Security headers
- CORS configuration

### 3. Business Logic Layer

#### Travel Q&A Service
**Responsibilities:**
- Process travel questions
- Select appropriate AI model (Groq vs Gemini)
- Generate AI responses
- Store questions and responses
- Handle conversation context

#### Itinerary Generation Service
**Responsibilities:**
- Process itinerary requests
- Generate detailed travel plans
- Create PDF documents
- Manage asynchronous processing
- Handle job status tracking

#### AI Service Abstraction
**Responsibilities:**
- Manage multiple AI providers
- Implement fallback mechanisms
- Handle API rate limiting
- Process and format responses
- Log AI operations

### 4. Data Layer

#### PostgreSQL Database
**Primary Tables:**
- `travel_questions`: Store Q&A interactions
- `itineraries`: Store itinerary requests and results
- `conversations`: Future chat support structure
- `messages`: Future chat message storage
- `rate_limits`: Track IP-based usage limits

**Key Features:**
- Connection pooling
- Optimized indexes
- Data integrity constraints
- Migration support
- Backup and recovery

#### Redis Cache
**Use Cases:**
- Rate limiting counters
- AI response caching
- Session data (future)
- Job queue backend
- Temporary data storage

### 5. External Services Layer

#### AI Providers
**Groq Integration:**
- Model: llama-3.1-70b-versatile
- High-speed inference
- Cost-effective processing
- Primary provider for most requests

**Google Gemini Integration:**
- Model: gemini-1.5-pro
- Advanced reasoning capabilities
- Fallback provider
- Complex itinerary generation

#### PDF Generation
**Technology:**
- PDFMake for programmatic PDF creation
- Professional templates
- Responsive design
- File storage management

## Architectural Patterns

### 1. Hybrid Architecture

**Benefits:**
- **Maximum Independence**: Backend and frontend are completely separate projects
- **Flexible Development**: Can develop independently or together as needed
- **Separate Dependencies**: Each project has its own package.json and node_modules
- **Independent Deployment**: Each service can be deployed separately
- **Parallel Development**: Teams can work independently without conflicts

**Structure:**
```
alutrip/
├── alutrip-backend/          # Independent Node.js API
├── alutrip-frontend/         # Independent React application
├── docker/           # Joint development orchestration
└── docs/             # Shared documentation
```

### 2. Service-Oriented Architecture (SOA)

**Service Boundaries:**
- **Travel Q&A Service**: Handles question processing and AI responses
- **Itinerary Service**: Manages itinerary generation and PDF creation
- **AI Service**: Abstracts multiple AI providers
- **Rate Limiting Service**: Manages usage restrictions
- **PDF Service**: Handles document generation

### 3. Asynchronous Processing Pattern

**Queue System:**
- **Bull/BullMQ**: Redis-based job queue
- **Background Workers**: Process itinerary generation asynchronously
- **Job Status Tracking**: Monitor processing progress
- **Retry Logic**: Handle failed jobs gracefully
- **Cleanup**: Automatic job cleanup and maintenance

### 4. Multi-Provider Pattern

**AI Provider Abstraction:**
- **Provider Interface**: Common interface for all AI services
- **Fallback Mechanism**: Automatic switching between providers
- **Load Balancing**: Distribute requests across providers
- **Monitoring**: Track provider performance and reliability

## Data Flow Architecture

### 1. Travel Q&A Flow

```
User Question → Frontend Form → API Gateway → Rate Limiter → Travel Service → AI Service → LLM Provider → Response Processing → Database Storage → Frontend Display
```

**Steps:**
1. User submits question via frontend form
2. Frontend validates input and sends to API
3. API gateway validates request and checks rate limits
4. Travel service processes question and selects AI model
5. AI service calls appropriate LLM provider
6. Response is processed and stored in database
7. Formatted response returned to frontend

### 2. Itinerary Generation Flow

```
User Request → Frontend Form → API Gateway → Rate Limiter → Itinerary Service → Job Queue → Background Worker → AI Service → PDF Generation → Storage → Status Update → Frontend Notification
```

**Steps:**
1. User submits itinerary request via frontend form
2. API validates request and creates database record
3. Job is queued for background processing
4. Background worker processes request asynchronously
5. AI service generates detailed itinerary
6. PDF service creates professional document
7. Status updates are sent to frontend
8. User can download completed PDF

## Security Architecture

### 1. Input Validation Layer
- **Zod Schemas**: Type-safe validation for all inputs
- **Sanitization**: Clean and validate all user inputs
- **Type Checking**: Runtime type validation
- **Length Limits**: Prevent oversized requests

### 2. Rate Limiting Layer
- **IP-Based Tracking**: Redis-based rate limiting
- **Feature-Specific Limits**: Separate limits for Q&A and itineraries
- **Sliding Window**: 24-hour rolling window
- **Graceful Degradation**: Clear error messages when limits exceeded

### 3. Security Headers
- **Helmet.js**: Comprehensive security headers
- **CORS Configuration**: Controlled cross-origin access
- **Content Security Policy**: Prevent XSS attacks
- **HTTPS Enforcement**: Secure communication

### 4. Error Handling
- **Structured Errors**: Consistent error response format
- **Information Disclosure**: Prevent sensitive data leakage
- **Logging**: Comprehensive error logging for monitoring
- **Graceful Failures**: User-friendly error messages

## Scalability Architecture

### 1. Horizontal Scaling
- **Stateless Services**: No server-side session storage
- **Load Balancing**: Multiple API instances
- **Database Scaling**: Read replicas and connection pooling
- **Cache Distribution**: Redis clustering support

### 2. Performance Optimization
- **Response Caching**: Cache AI responses to reduce API calls
- **Database Indexing**: Optimized queries for travel data
- **Connection Pooling**: Efficient database connections
- **Compression**: Response compression for faster transfers

### 3. Asynchronous Processing
- **Job Queues**: Background processing for heavy operations
- **Worker Scaling**: Multiple workers for PDF generation
- **Queue Monitoring**: Track job progress and failures
- **Resource Management**: Efficient resource utilization

## Development Architecture

### 1. Development Environments

**Independent Development:**
```bash
# Backend only
cd alutrip-backend && npm run dev

# Frontend only  
cd alutrip-frontend && npm run dev
```

**Joint Development:**
```bash
# All services
./docker/docker-dev.sh full-up
```

**Local Development:**
```bash
# No Docker, local services
npm run dev  # Both projects
```

### 2. Docker Architecture

**Service Isolation:**
- **Backend Container**: Node.js API with dependencies
- **Frontend Container**: React application with Vite
- **Database Container**: PostgreSQL with persistent storage
- **Cache Container**: Redis for caching and queues
- **Admin Container**: PgAdmin for database management

**Network Configuration:**
- **Backend Network**: API, database, and cache communication
- **Frontend Network**: Frontend and API communication
- **Shared Network**: Cross-service communication

### 3. Configuration Management

**Environment Variables:**
- **Backend Config**: Database, AI providers, rate limiting
- **Frontend Config**: API endpoints, feature flags
- **Docker Config**: Service orchestration and networking
- **Validation**: Zod-based environment validation

## Monitoring and Observability

### 1. Logging Architecture
- **Winston Logger**: Structured logging with multiple transports
- **Log Levels**: Error, warn, info, debug
- **Log Files**: Separate files for errors, combined logs, and AI operations
- **Console Output**: Development-friendly console logging

### 2. Error Tracking
- **Structured Errors**: Consistent error format across services
- **Error Context**: Rich context for debugging
- **Stack Traces**: Full stack traces for development
- **Error Aggregation**: Group similar errors for analysis

### 3. Performance Monitoring
- **Response Times**: Track API response performance
- **Database Queries**: Monitor query performance
- **AI Operations**: Track AI provider response times
- **Queue Metrics**: Monitor job processing performance

## Deployment Architecture

### 1. Container Strategy
- **Multi-stage Builds**: Optimized Docker images
- **Layer Caching**: Efficient image builds
- **Security Scanning**: Vulnerability assessment
- **Size Optimization**: Minimal image sizes

### 2. Environment Configuration
- **Development**: Local development with hot reloading
- **Staging**: Production-like environment for testing
- **Production**: Optimized for performance and security
- **Configuration**: Environment-specific settings

### 3. Health Checks
- **API Health**: Endpoint availability monitoring
- **Database Health**: Connection and query monitoring
- **Cache Health**: Redis connectivity and performance
- **External Services**: AI provider availability

## Technology Decisions

### 1. Why TypeScript?
- **Type Safety**: Catch errors at compile time
- **Better IDE Support**: Enhanced development experience
- **Code Documentation**: Types serve as documentation
- **Refactoring Safety**: Safe code changes
- **Team Collaboration**: Clear interfaces and contracts

### 2. Why Express.js?
- **Maturity**: Battle-tested framework
- **Flexibility**: Minimal, unopinionated design
- **Middleware Ecosystem**: Rich middleware support
- **Performance**: Fast and lightweight
- **Community**: Large community and documentation

### 3. Why PostgreSQL?
- **ACID Compliance**: Reliable data integrity
- **JSON Support**: Flexible data storage
- **Performance**: Excellent query performance
- **Scalability**: Horizontal and vertical scaling
- **Open Source**: No licensing costs

### 4. Why Redis?
- **Speed**: In-memory data storage
- **Data Structures**: Rich data type support
- **Persistence**: Optional data persistence
- **Clustering**: Built-in clustering support
- **Queue Support**: Native queue operations

### 5. Why Bull/BullMQ?
- **Redis Backend**: Leverages Redis for reliability
- **Job Management**: Comprehensive job lifecycle
- **Retry Logic**: Built-in retry mechanisms
- **Monitoring**: Job progress tracking
- **Scalability**: Horizontal worker scaling

## Future Architecture Considerations

### 1. Microservices Evolution
- **Service Decomposition**: Split into smaller services
- **API Gateway**: Centralized request routing
- **Service Discovery**: Dynamic service location
- **Circuit Breakers**: Fault tolerance patterns

### 2. Event-Driven Architecture
- **Event Sourcing**: Store events instead of state
- **CQRS**: Separate read and write models
- **Event Streaming**: Real-time event processing
- **Saga Pattern**: Distributed transaction management

### 3. Cloud-Native Features
- **Kubernetes**: Container orchestration
- **Service Mesh**: Inter-service communication
- **Observability**: Distributed tracing and metrics
- **Auto-scaling**: Dynamic resource allocation

---

*This architecture provides a solid foundation for AluTrip's current needs while maintaining flexibility for future growth and evolution.*
