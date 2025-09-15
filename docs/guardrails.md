# AluTrip - API Guardrails and Protection Mechanisms

## Overview

AluTrip implements comprehensive protection mechanisms to ensure API security, prevent abuse, and maintain service quality. These guardrails are designed to protect both the system and users from malicious behavior, accidental misuse, and resource exhaustion, especially in the context of automation and AI agents.

## Core Protection Principles

### 1. No Authentication, Maximum Protection
- **Open Access**: No user registration or login required
- **IP-Based Controls**: All protection mechanisms based on IP addresses
- **Rate Limiting**: Strict limits to prevent abuse
- **Input Validation**: Comprehensive validation of all inputs
- **Resource Management**: Careful resource allocation and monitoring

### 2. Defense in Depth
- **Multiple Layers**: Protection at network, application, and data levels
- **Fail-Safe Defaults**: Secure by default configurations
- **Graceful Degradation**: System continues to function under attack
- **Monitoring**: Comprehensive logging and alerting

### 3. Automation-Friendly Security
- **Clear Error Messages**: Informative responses for automated systems
- **Consistent Behavior**: Predictable API responses
- **Rate Limit Transparency**: Clear information about limits and reset times
- **Graceful Handling**: Proper HTTP status codes and error formats

## Input Validation and Sanitization

### 1. Schema-Based Validation (Zod)

**Travel Questions:**
```typescript
const travelQuestionSchema = z.object({
  question: z.string()
    .min(10, "Question must be at least 10 characters")
    .max(1000, "Question must be less than 1000 characters")
    .regex(/^[a-zA-Z0-9\s\?\!\.\,\-\'\"]+$/, "Question contains invalid characters"),
  model: z.enum(["groq", "gemini"], {
    errorMap: () => ({ message: "Model must be either 'groq' or 'gemini'" })
  })
});
```

**Itinerary Requests:**
```typescript
const itineraryRequestSchema = z.object({
  destination: z.string()
    .min(2, "Destination must be at least 2 characters")
    .max(255, "Destination must be less than 255 characters")
    .regex(/^[a-zA-Z0-9\s\-\,\']+$/, "Destination contains invalid characters"),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  budget: z.number().min(100).max(50000).optional(),
  interests: z.array(z.string().max(50)).max(10).optional(),
  travel_style: z.enum(["budget", "mid-range", "luxury"]).optional(),
  accommodation_type: z.enum(["hotel", "hostel", "airbnb", "any"]).optional(),
  group_size: z.number().min(1).max(20).optional(),
  special_requirements: z.string().max(500).optional()
});
```

### 2. Content Filtering

**Malicious Content Detection:**
- **SQL Injection**: Parameterized queries and input sanitization
- **XSS Prevention**: HTML encoding and content filtering
- **Script Injection**: Blocking of script tags and executable content
- **Path Traversal**: Prevention of directory traversal attacks

**Inappropriate Content:**
- **Profanity Filter**: Basic profanity detection and blocking
- **Spam Detection**: Pattern recognition for spam content
- **Offensive Language**: Content moderation for inappropriate language
- **Misinformation**: Basic fact-checking for travel-related claims

### 3. Data Type Validation

**String Validation:**
- **Length Limits**: Maximum and minimum length constraints
- **Character Sets**: Allowed character patterns
- **Encoding**: UTF-8 encoding validation
- **Null/Undefined**: Proper handling of missing values

**Numeric Validation:**
- **Range Checks**: Minimum and maximum value constraints
- **Type Validation**: Ensuring numeric types where expected
- **Precision**: Decimal place limitations
- **Overflow Protection**: Prevention of numeric overflow

## Rate Limiting and Abuse Prevention

### 1. IP-Based Rate Limiting

**Implementation:**
```typescript
const rateLimitConfig = {
  travel_questions: {
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    max: 5, // 5 requests per 24 hours
    keyGenerator: (req) => `travel_questions:${req.ip}`,
    skipSuccessfulRequests: false
  },
  itineraries: {
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    max: 5, // 5 requests per 24 hours
    keyGenerator: (req) => `itineraries:${req.ip}`,
    skipSuccessfulRequests: false
  }
};
```

**Features:**
- **Sliding Window**: 24-hour rolling window for requests
- **Feature Separation**: Different limits for different features
- **Redis Backend**: Persistent rate limiting across server restarts
- **Graceful Degradation**: Clear error messages when limits exceeded

### 2. Request Size Limits

**Payload Limits:**
- **JSON Payload**: Maximum 1MB per request
- **Form Data**: Maximum 10MB for file uploads
- **Query Parameters**: Maximum 2048 characters
- **Headers**: Maximum 8KB total header size

**Resource Limits:**
- **Memory Usage**: Maximum 512MB per request
- **Processing Time**: Maximum 30 seconds per request
- **Database Queries**: Maximum 100 queries per request
- **External API Calls**: Maximum 10 calls per request

### 3. Geographic and Network Restrictions

**IP Filtering:**
- **Blocked IPs**: Known malicious IP addresses
- **VPN Detection**: Basic VPN and proxy detection
- **Geographic Limits**: Optional country-based restrictions
- **Network Analysis**: Suspicious traffic pattern detection

**Request Pattern Analysis:**
- **Burst Detection**: Rapid request pattern identification
- **Bot Detection**: Automated request pattern recognition
- **Distributed Attacks**: Protection against DDoS attempts
- **Resource Exhaustion**: Prevention of resource exhaustion attacks

## AI Service Protection

### 1. Prompt Injection Prevention

**Input Sanitization:**
```typescript
const sanitizePrompt = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove JavaScript
    .replace(/data:/gi, '') // Remove data URIs
    .replace(/vbscript:/gi, '') // Remove VBScript
    .substring(0, 1000); // Limit length
};
```

**Prompt Engineering:**
- **System Prompts**: Fixed system prompts that cannot be overridden
- **User Input Isolation**: Clear separation between system and user prompts
- **Context Boundaries**: Strict context limits for AI responses
- **Output Filtering**: Post-processing of AI responses for safety

### 2. AI Response Validation

**Content Validation:**
- **Response Length**: Maximum response length limits
- **Content Type**: Validation of response format
- **Safety Checks**: Basic safety and appropriateness validation
- **Fact Verification**: Cross-referencing with known travel information

**Quality Assurance:**
- **Response Timeout**: Maximum time limits for AI responses
- **Error Handling**: Graceful handling of AI service failures
- **Fallback Mechanisms**: Alternative responses when AI fails
- **Quality Metrics**: Monitoring of response quality and relevance

### 3. Multi-Provider Safety

**Provider Selection:**
- **Load Balancing**: Distribution of requests across providers
- **Failover Logic**: Automatic switching on provider failure
- **Cost Management**: Monitoring of API usage costs
- **Performance Monitoring**: Tracking of provider performance

**Response Consistency:**
- **Format Standardization**: Consistent response formats across providers
- **Quality Assurance**: Minimum quality standards for all providers
- **Error Standardization**: Consistent error handling across providers
- **Monitoring**: Comprehensive monitoring of all AI operations

## Database Protection

### 1. SQL Injection Prevention

**Parameterized Queries:**
```typescript
const getTravelQuestion = async (id: number) => {
  const query = 'SELECT * FROM travel_questions WHERE id = $1';
  const result = await db.query(query, [id]);
  return result.rows[0];
};
```

**Query Validation:**
- **Input Sanitization**: All inputs sanitized before database queries
- **Type Validation**: Strict type checking for all parameters
- **Length Limits**: Maximum length constraints for all fields
- **Character Filtering**: Removal of dangerous characters

### 2. Data Access Controls

**Connection Management:**
- **Connection Pooling**: Limited number of database connections
- **Connection Timeout**: Automatic connection cleanup
- **Query Timeout**: Maximum query execution time
- **Transaction Limits**: Maximum transaction duration

**Data Protection:**
- **Read-Only Access**: Limited write access where possible
- **Data Encryption**: Encryption of sensitive data at rest
- **Backup Security**: Secure backup and recovery procedures
- **Audit Logging**: Comprehensive logging of database operations

### 3. Performance Protection

**Query Optimization:**
- **Index Usage**: Proper indexing for all queries
- **Query Limits**: Maximum number of rows returned
- **Pagination**: Mandatory pagination for large result sets
- **Caching**: Strategic caching to reduce database load

**Resource Management:**
- **Memory Limits**: Maximum memory usage per query
- **CPU Limits**: Maximum CPU usage per operation
- **Disk Space**: Monitoring of disk space usage
- **Connection Limits**: Maximum concurrent connections

## File System Protection

### 1. PDF Generation Security

**File Validation:**
- **File Type**: Strict validation of file types
- **File Size**: Maximum file size limits
- **File Content**: Validation of file content
- **File Names**: Sanitization of file names

**Storage Security:**
- **Directory Traversal**: Prevention of directory traversal attacks
- **File Permissions**: Proper file permission settings
- **Storage Limits**: Maximum storage space usage
- **Cleanup Procedures**: Automatic cleanup of old files

### 2. Upload Protection

**File Upload Limits:**
- **Size Limits**: Maximum file size constraints
- **Type Restrictions**: Allowed file type restrictions
- **Content Scanning**: Basic malware scanning
- **Storage Quotas**: Per-IP storage quotas

**Processing Security:**
- **Sandboxing**: Isolated processing environments
- **Resource Limits**: CPU and memory limits for file processing
- **Timeout Protection**: Maximum processing time limits
- **Error Handling**: Graceful handling of processing errors

## Network Security

### 1. HTTP Security Headers

**Security Headers:**
```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

**CORS Configuration:**
```typescript
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: false,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
```

### 2. Request Validation

**Request Structure:**
- **Method Validation**: Only allowed HTTP methods
- **Header Validation**: Required and allowed headers
- **Content-Type**: Strict content type validation
- **Request Size**: Maximum request size limits

**Response Security:**
- **Information Disclosure**: Prevention of sensitive information leakage
- **Error Messages**: Sanitized error messages
- **Debug Information**: No debug information in production
- **Stack Traces**: No stack traces in error responses

## Monitoring and Alerting

### 1. Security Monitoring

**Attack Detection:**
- **Rate Limit Violations**: Monitoring of rate limit violations
- **Suspicious Patterns**: Detection of suspicious request patterns
- **Failed Attempts**: Tracking of failed authentication attempts
- **Resource Abuse**: Monitoring of resource usage patterns

**Alerting System:**
- **Real-time Alerts**: Immediate notification of security incidents
- **Threshold Monitoring**: Alerting when thresholds are exceeded
- **Trend Analysis**: Long-term trend analysis for security patterns
- **Incident Response**: Automated incident response procedures

### 2. Performance Monitoring

**System Metrics:**
- **Response Times**: Monitoring of API response times
- **Error Rates**: Tracking of error rates and types
- **Resource Usage**: Monitoring of CPU, memory, and disk usage
- **Database Performance**: Tracking of database query performance

**Business Metrics:**
- **Usage Patterns**: Analysis of API usage patterns
- **Feature Adoption**: Tracking of feature usage
- **User Behavior**: Analysis of user behavior patterns
- **Quality Metrics**: Monitoring of response quality

## Error Handling and Logging

### 1. Structured Error Handling

**Error Classification:**
```typescript
enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  AI_SERVICE_ERROR = 'AI_SERVICE_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  SECURITY_ERROR = 'SECURITY_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}
```

**Error Response Format:**
```typescript
interface ErrorResponse {
  status: 'error';
  message: string;
  data: {
    type: ErrorType;
    code: string;
    details?: any;
    timestamp: string;
    requestId: string;
  };
}
```

### 2. Comprehensive Logging

**Security Logging:**
```typescript
const logSecurityEvent = (event: string, details: any) => {
  logger.warn('Security Event', {
    event,
    ip: details.ip,
    userAgent: details.userAgent,
    timestamp: new Date().toISOString(),
    details
  });
};
```

**Log Categories:**
- **Security Events**: All security-related events
- **Rate Limiting**: Rate limit violations and usage
- **AI Operations**: All AI service interactions
- **Database Operations**: Database queries and errors
- **System Events**: System startup, shutdown, and errors

## Automation and Agent Safety

### 1. Agent-Friendly Design

**Clear Error Messages:**
- **Descriptive Errors**: Clear, actionable error messages
- **Error Codes**: Consistent error codes for automated handling
- **Retry Information**: Clear information about retry policies
- **Rate Limit Details**: Detailed rate limit information

**Consistent Behavior:**
- **Predictable Responses**: Consistent response formats
- **Stable Endpoints**: Stable API endpoints and versions
- **Documentation**: Comprehensive API documentation
- **Examples**: Clear examples for all endpoints

### 2. Automation Limits

**Request Patterns:**
- **Burst Protection**: Protection against rapid request bursts
- **Sequential Limits**: Limits on sequential requests
- **Pattern Detection**: Detection of automated request patterns
- **Adaptive Limits**: Dynamic limits based on behavior

**Resource Protection:**
- **Memory Limits**: Per-request memory limits
- **CPU Limits**: Per-request CPU limits
- **Time Limits**: Maximum request processing time
- **Concurrency Limits**: Maximum concurrent requests per IP

## Incident Response

### 1. Automated Response

**Immediate Actions:**
- **Rate Limit Enforcement**: Automatic rate limit enforcement
- **IP Blocking**: Temporary IP blocking for severe violations
- **Service Degradation**: Graceful service degradation under attack
- **Alert Generation**: Immediate alert generation for security incidents

**Recovery Procedures:**
- **Automatic Recovery**: Automatic recovery from transient failures
- **Manual Intervention**: Procedures for manual intervention
- **Service Restoration**: Procedures for service restoration
- **Post-Incident Analysis**: Post-incident analysis and improvement

### 2. Manual Response

**Escalation Procedures:**
- **Severity Levels**: Clear severity level definitions
- **Escalation Paths**: Defined escalation paths for different incidents
- **Response Times**: Defined response time requirements
- **Communication**: Communication procedures for incidents

**Documentation:**
- **Incident Logs**: Comprehensive incident logging
- **Response Procedures**: Documented response procedures
- **Lessons Learned**: Documentation of lessons learned
- **Improvement Plans**: Plans for system improvement

## Compliance and Privacy

### 1. Data Protection

**Data Minimization:**
- **Minimal Collection**: Collection of only necessary data
- **Data Retention**: Limited data retention periods
- **Data Anonymization**: Anonymization of collected data
- **Data Deletion**: Secure data deletion procedures

**Privacy by Design:**
- **No Personal Data**: No collection of personal information
- **IP Anonymization**: Optional IP address anonymization
- **Data Encryption**: Encryption of data in transit and at rest
- **Access Controls**: Strict access controls for all data

### 2. Compliance Monitoring

**Audit Trails:**
- **Comprehensive Logging**: Logging of all system activities
- **Access Logs**: Logging of all data access
- **Change Logs**: Logging of all system changes
- **Security Logs**: Logging of all security events

**Regular Reviews:**
- **Security Audits**: Regular security audits
- **Compliance Reviews**: Regular compliance reviews
- **Risk Assessments**: Regular risk assessments
- **Improvement Plans**: Regular improvement planning

---

*These guardrails ensure that AluTrip remains secure, reliable, and accessible while protecting against abuse and maintaining high service quality for all users, including automated systems and AI agents.*
