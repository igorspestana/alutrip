# AluTrip - API Endpoints Documentation

## Base URL

```
Development: http://localhost:3000
Production: https://api.alutrip.com
```

## Authentication

**No Authentication Required**: AluTrip operates without user registration or login. All endpoints are publicly accessible with IP-based rate limiting for protection.

## Rate Limiting

- **Limit**: 5 requests per 24 hours per feature per IP address
- **Features**: `travel_questions` and `itineraries` have separate limits
- **Headers**: Rate limit information included in response headers
- **Error**: HTTP 429 when limit exceeded

## Response Format

### Success Response
```json
{
  "status": "success",
  "message": "Operation completed successfully",
  "data": {
    // Response data here
  }
}
```

### Error Response
```json
{
  "status": "error",
  "message": "Error description",
  "data": {}
}
```

## Health Check Endpoints

### GET /health
Check API health status.

**Response:**
```json
{
  "status": "success",
  "message": "API is healthy",
  "data": {
    "timestamp": "2024-01-15T10:30:00Z",
    "version": "1.0.0",
    "environment": "development",
    "uptime": 3600
  }
}
```

**Status Codes:**
- `200 OK`: API is healthy
- `503 Service Unavailable`: API is unhealthy

---

## Travel Q&A Endpoints (AluTrip Responde)

### POST /api/travel/ask
Submit a travel question and receive an AI-generated response.

**Request Body:**
```json
{
  "question": "What's the best time to visit Japan?",
  "model": "groq"
}
```

**Parameters:**
- `question` (string, required): The travel question to ask (max 1000 characters)
- `model` (string, required): AI model to use (`groq` or `gemini`)

**Response:**
```json
{
  "status": "success",
  "message": "Travel question answered successfully",
  "data": {
    "id": 123,
    "question": "What's the best time to visit Japan?",
    "response": "The best time to visit Japan is during spring (March to May) or autumn (September to November)...",
    "model_used": "groq",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

**Status Codes:**
- `200 OK`: Question answered successfully
- `400 Bad Request`: Invalid input data
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: AI service error

**Rate Limiting:**
- Feature: `travel_questions`
- Limit: 5 requests per 24 hours per IP

### GET /api/travel/questions
Get recent travel questions (for future features).

**Query Parameters:**
- `limit` (number, optional): Number of questions to return (default: 10, max: 50)
- `offset` (number, optional): Number of questions to skip (default: 0)

**Response:**
```json
{
  "status": "success",
  "message": "Travel questions retrieved successfully",
  "data": {
    "questions": [
      {
        "id": 123,
        "question": "What's the best time to visit Japan?",
        "response": "The best time to visit Japan is during spring...",
        "model_used": "groq",
        "created_at": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "total": 1,
      "limit": 10,
      "offset": 0,
      "has_more": false
    }
  }
}
```

**Status Codes:**
- `200 OK`: Questions retrieved successfully
- `400 Bad Request`: Invalid query parameters

### GET /api/travel/questions/:id
Get a specific travel question and response.

**Path Parameters:**
- `id` (number, required): Question ID

**Response:**
```json
{
  "status": "success",
  "message": "Travel question retrieved successfully",
  "data": {
    "id": 123,
    "question": "What's the best time to visit Japan?",
    "response": "The best time to visit Japan is during spring...",
    "model_used": "groq",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

**Status Codes:**
- `200 OK`: Question retrieved successfully
- `404 Not Found`: Question not found
- `400 Bad Request`: Invalid question ID

---

## Itinerary Planning Endpoints (AluTrip Planeja)

### POST /api/itinerary/create
Submit an itinerary request for generation.

**Request Body:**
```json
{
  "destination": "Tokyo, Japan",
  "start_date": "2024-04-15",
  "end_date": "2024-04-22",
  "budget": 2000,
  "interests": ["culture", "food", "temples"],
  "travel_style": "budget",
  "accommodation_type": "hotel",
  "group_size": 2,
  "special_requirements": "Vegetarian friendly restaurants"
}
```

**Parameters:**
- `destination` (string, required): Travel destination (max 255 characters)
- `start_date` (string, required): Start date in YYYY-MM-DD format
- `end_date` (string, required): End date in YYYY-MM-DD format (max 7 days from start)
- `budget` (number, optional): Budget in USD (min: 100, max: 50000)
- `interests` (array, optional): Array of interests (max 10 items)
- `travel_style` (string, optional): `budget`, `mid-range`, or `luxury`
- `accommodation_type` (string, optional): `hotel`, `hostel`, `airbnb`, or `any`
- `group_size` (number, optional): Number of travelers (min: 1, max: 20)
- `special_requirements` (string, optional): Special requirements (max 500 characters)

**Response:**
```json
{
  "status": "success",
  "message": "Itinerary request submitted successfully",
  "data": {
    "id": 456,
    "destination": "Tokyo, Japan",
    "start_date": "2024-04-15",
    "end_date": "2024-04-22",
    "processing_status": "pending",
    "created_at": "2024-01-15T10:30:00Z",
    "estimated_completion": "2024-01-15T10:35:00Z"
  }
}
```

**Status Codes:**
- `200 OK`: Request submitted successfully
- `400 Bad Request`: Invalid input data
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

**Rate Limiting:**
- Feature: `itineraries`
- Limit: 5 requests per 24 hours per IP

### GET /api/itinerary/:id/status
Check the status of an itinerary generation.

**Path Parameters:**
- `id` (number, required): Itinerary ID

**Response:**
```json
{
  "status": "success",
  "message": "Itinerary status retrieved successfully",
  "data": {
    "id": 456,
    "destination": "Tokyo, Japan",
    "processing_status": "completed",
    "created_at": "2024-01-15T10:30:00Z",
    "completed_at": "2024-01-15T10:32:00Z",
    "pdf_available": true,
    "pdf_filename": "tokyo_itinerary_456.pdf"
  }
}
```

**Status Values:**
- `pending`: Request submitted, waiting for processing
- `processing`: Currently being generated
- `completed`: Successfully generated
- `failed`: Generation failed

**Status Codes:**
- `200 OK`: Status retrieved successfully
- `404 Not Found`: Itinerary not found
- `400 Bad Request`: Invalid itinerary ID

### GET /api/itinerary/:id/download
Download the generated PDF itinerary.

**Path Parameters:**
- `id` (number, required): Itinerary ID

**Response:**
- **Success**: PDF file download
- **Content-Type**: `application/pdf`
- **Content-Disposition**: `attachment; filename="tokyo_itinerary_456.pdf"`

**Status Codes:**
- `200 OK`: PDF downloaded successfully
- `404 Not Found`: Itinerary not found or PDF not available
- `400 Bad Request`: Invalid itinerary ID
- `410 Gone`: PDF file no longer available

### GET /api/itinerary/list
List recent itineraries (for future features).

**Query Parameters:**
- `limit` (number, optional): Number of itineraries to return (default: 10, max: 50)
- `offset` (number, optional): Number of itineraries to skip (default: 0)
- `status` (string, optional): Filter by status (`pending`, `processing`, `completed`, `failed`)

**Response:**
```json
{
  "status": "success",
  "message": "Itineraries retrieved successfully",
  "data": {
    "itineraries": [
      {
        "id": 456,
        "destination": "Tokyo, Japan",
        "start_date": "2024-04-15",
        "end_date": "2024-04-22",
        "processing_status": "completed",
        "created_at": "2024-01-15T10:30:00Z",
        "pdf_available": true
      }
    ],
    "pagination": {
      "total": 1,
      "limit": 10,
      "offset": 0,
      "has_more": false
    }
  }
}
```

**Status Codes:**
- `200 OK`: Itineraries retrieved successfully
- `400 Bad Request`: Invalid query parameters

---

## Rate Limiting Endpoints

### GET /api/limits/status
Check current rate limit status for the requesting IP.

**Response:**
```json
{
  "status": "success",
  "message": "Rate limit status retrieved successfully",
  "data": {
    "ip": "192.168.1.100",
    "limits": {
      "travel_questions": {
        "used": 3,
        "limit": 5,
        "remaining": 2,
        "reset_time": "2024-01-16T10:30:00Z"
      },
      "itineraries": {
        "used": 1,
        "limit": 5,
        "remaining": 4,
        "reset_time": "2024-01-16T10:30:00Z"
      }
    }
  }
}
```

**Status Codes:**
- `200 OK`: Status retrieved successfully

---

## Future Chat Support Endpoints

*These endpoints are prepared for future implementation but not currently active.*

### POST /api/chat/continue/:questionId
Continue a conversation from an existing travel question.

**Path Parameters:**
- `questionId` (number, required): Original question ID

**Request Body:**
```json
{
  "message": "Can you tell me more about the cherry blossom season?"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Conversation continued successfully",
  "data": {
    "conversation_id": 789,
    "message_id": 101,
    "response": "Cherry blossom season in Japan typically occurs...",
    "model_used": "groq",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

### GET /api/chat/history/:sessionId
Get conversation history for a session.

**Path Parameters:**
- `sessionId` (string, required): Session identifier

**Response:**
```json
{
  "status": "success",
  "message": "Conversation history retrieved successfully",
  "data": {
    "session_id": "sess_123456789",
    "conversation": {
      "id": 789,
      "title": "Japan Travel Planning",
      "messages": [
        {
          "id": 100,
          "type": "question",
          "content": "What's the best time to visit Japan?",
          "created_at": "2024-01-15T10:30:00Z"
        },
        {
          "id": 101,
          "type": "response",
          "content": "The best time to visit Japan is during spring...",
          "model_used": "groq",
          "created_at": "2024-01-15T10:30:05Z"
        }
      ]
    }
  }
}
```

### DELETE /api/chat/conversation/:id
Delete a conversation and all its messages.

**Path Parameters:**
- `id` (number, required): Conversation ID

**Response:**
```json
{
  "status": "success",
  "message": "Conversation deleted successfully",
  "data": {}
}
```

---

## Error Codes and Messages

### Common Error Responses

#### 400 Bad Request
```json
{
  "status": "error",
  "message": "Invalid input data",
  "data": {
    "errors": [
      {
        "field": "question",
        "message": "Question is required and must be less than 1000 characters"
      }
    ]
  }
}
```

#### 429 Too Many Requests
```json
{
  "status": "error",
  "message": "Rate limit exceeded",
  "data": {
    "feature": "travel_questions",
    "limit": 5,
    "used": 5,
    "reset_time": "2024-01-16T10:30:00Z"
  }
}
```

#### 500 Internal Server Error
```json
{
  "status": "error",
  "message": "Internal server error",
  "data": {}
}
```

### Validation Error Examples

#### Travel Question Validation
```json
{
  "status": "error",
  "message": "Validation failed",
  "data": {
    "errors": [
      {
        "field": "question",
        "message": "Question must be between 10 and 1000 characters"
      },
      {
        "field": "model",
        "message": "Model must be either 'groq' or 'gemini'"
      }
    ]
  }
}
```

#### Itinerary Request Validation
```json
{
  "status": "error",
  "message": "Validation failed",
  "data": {
    "errors": [
      {
        "field": "destination",
        "message": "Destination is required"
      },
      {
        "field": "end_date",
        "message": "End date must be within 7 days of start date"
      },
      {
        "field": "budget",
        "message": "Budget must be between 100 and 50000"
      }
    ]
  }
}
```

---

## Request/Response Examples

### Complete Travel Q&A Flow

**1. Submit Question:**
```bash
curl -X POST http://localhost:3000/api/travel/ask \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What are the must-see attractions in Paris for a 3-day trip?",
    "model": "groq"
  }'
```

**2. Response:**
```json
{
  "status": "success",
  "message": "Travel question answered successfully",
  "data": {
    "id": 123,
    "question": "What are the must-see attractions in Paris for a 3-day trip?",
    "response": "For a 3-day trip to Paris, here are the must-see attractions:\n\nDay 1: Eiffel Tower, Trocadéro, and Seine River cruise\nDay 2: Louvre Museum, Notre-Dame Cathedral, and Latin Quarter\nDay 3: Montmartre, Sacré-Cœur, and Champs-Élysées\n\nEach day includes detailed recommendations for restaurants, transportation, and timing...",
    "model_used": "groq",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

### Complete Itinerary Generation Flow

**1. Submit Itinerary Request:**
```bash
curl -X POST http://localhost:3000/api/itinerary/create \
  -H "Content-Type: application/json" \
  -d '{
    "destination": "Paris, France",
    "start_date": "2024-06-15",
    "end_date": "2024-06-18",
    "budget": 1500,
    "interests": ["culture", "food", "art"],
    "travel_style": "mid-range",
    "accommodation_type": "hotel",
    "group_size": 2
  }'
```

**2. Check Status:**
```bash
curl http://localhost:3000/api/itinerary/456/status
```

**3. Download PDF (when completed):**
```bash
curl -O http://localhost:3000/api/itinerary/456/download
```

---

## Rate Limiting Headers

All responses include rate limiting information in headers:

```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 4
X-RateLimit-Reset: 1705312200
X-RateLimit-Feature: travel_questions
```

---

## API Versioning

Current API version: `v1`

Version information is included in health check responses and can be specified in the URL path for future versions:

```
/api/v1/travel/ask
/api/v2/travel/ask  # Future version
```

---

*This documentation covers all current and planned endpoints for the AluTrip API. For the most up-to-date information, refer to the Swagger documentation at `/docs` when the API is running.*
