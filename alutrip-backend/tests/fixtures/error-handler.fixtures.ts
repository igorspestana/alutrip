import { Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../../src/middleware/error-handler';
import { ErrorType, HttpStatusCode } from '../../src/types/api';

// Mock Request factory
export const createMockRequest = (overrides?: Partial<Request>): Partial<Request> => ({
  method: 'POST',
  url: '/api/test',
  path: '/api/test',
  ip: '127.0.0.1',
  get: jest.fn().mockImplementation((header: string) => {
    if (header === 'User-Agent') {
      return 'Test-Agent/1.0';
    }
    return undefined;
  }),
  body: { test: 'data' },
  query: { limit: '10' },
  params: { id: '123' },
  ...overrides
});

// Mock Response factory
export const createMockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis()
  };
  return res;
};

// Mock NextFunction
export const createMockNext = () => jest.fn();

// Sample AppError instances
export const sampleAppErrors = {
  validationError: new AppError(
    'Validation failed',
    HttpStatusCode.BAD_REQUEST,
    ErrorType.VALIDATION_ERROR,
    'VALIDATION_FAILED',
    { errors: [{ field: 'email', message: 'Invalid email format' }] }
  ),
  rateLimitError: new AppError(
    'Rate limit exceeded',
    HttpStatusCode.TOO_MANY_REQUESTS,
    ErrorType.RATE_LIMIT_ERROR,
    'RATE_LIMIT_EXCEEDED',
    { limit: 5, resetTime: '2024-01-16T10:00:00Z' }
  ),
  notFoundError: new AppError(
    'Resource not found',
    HttpStatusCode.NOT_FOUND,
    ErrorType.NOT_FOUND_ERROR,
    'NOT_FOUND'
  ),
  internalError: new AppError(
    'Internal server error',
    HttpStatusCode.INTERNAL_SERVER_ERROR,
    ErrorType.INTERNAL_ERROR,
    'INTERNAL_ERROR'
  )
};

// Sample ZodError
export const createZodError = (): ZodError => {
  return new ZodError([
    {
      code: 'too_small',
      minimum: 10,
      type: 'string',
      inclusive: true,
      exact: false,
      message: 'String must contain at least 10 character(s)',
      path: ['question']
    },
    {
      code: 'invalid_type',
      expected: 'string',
      received: 'number',
      path: ['destination'],
      message: 'Expected string, received number'
    }
  ]);
};

// Sample standard errors
export const sampleStandardErrors = {
  validationError: Object.assign(new Error('Validation error'), { name: 'ValidationError' }),
  castError: Object.assign(new Error('Cast error'), { name: 'CastError' }),
  mongoError: Object.assign(new Error('MongoDB error'), { name: 'MongoError' }),
  databaseError: Object.assign(new Error('Database error'), { name: 'DatabaseError' }),
  genericError: new Error('Generic error message')
};

// Expected error response structures
export const expectedErrorResponses = {
  appError: (error: AppError, requestId: string, timestamp: string) => ({
    status: 'error',
    message: error.message,
    data: {
      type: error.type,
      requestId,
      timestamp,
      ...(error.details || {})
    }
  }),
  zodError: (requestId: string, timestamp: string) => ({
    status: 'error',
    message: 'Validation failed',
    data: {
      type: ErrorType.VALIDATION_ERROR,
      requestId,
      timestamp,
      errors: [
        { field: 'question', message: 'String must contain at least 10 character(s)', code: 'too_small' },
        { field: 'destination', message: 'Expected string, received number', code: 'invalid_type' }
      ]
    }
  }),
  validationError: (requestId: string, timestamp: string) => ({
    status: 'error',
    message: 'Validation error',
    data: {
      type: ErrorType.VALIDATION_ERROR,
      requestId,
      timestamp
    }
  }),
  castError: (requestId: string, timestamp: string) => ({
    status: 'error',
    message: 'Invalid data format',
    data: {
      type: ErrorType.VALIDATION_ERROR,
      requestId,
      timestamp
    }
  }),
  databaseError: (requestId: string, timestamp: string) => ({
    status: 'error',
    message: 'Database operation failed',
    data: {
      type: ErrorType.DATABASE_ERROR,
      requestId,
      timestamp
    }
  }),
  genericError: (requestId: string, timestamp: string) => ({
    status: 'error',
    message: 'Internal server error',
    data: {
      type: ErrorType.INTERNAL_ERROR,
      requestId,
      timestamp
    }
  }),
  productionMasked: (requestId: string, timestamp: string) => ({
    status: 'error',
    message: 'Internal server error',
    data: {
      type: ErrorType.INTERNAL_ERROR,
      requestId,
      timestamp
    }
  })
};

// Expected log patterns
export const expectedLogPatterns = {
  error: (req: Partial<Request>, error: Error, requestId: string) => ({
    requestId,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: 'Test-Agent/1.0',
    error: {
      message: error.message,
      stack: expect.any(String),
      type: expect.any(String),
      statusCode: expect.any(Number)
    },
    body: req.body,
    query: req.query,
    params: req.params
  }),
  notFound: (req: Partial<Request>) => ({
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: 'Test-Agent/1.0'
  })
};

// Test helper functions
export const expectErrorResponse = (
  statusMock: jest.Mock,
  jsonMock: jest.Mock,
  expectedStatus: number,
  expectedResponse: Record<string, unknown>
) => {
  expect(statusMock).toHaveBeenCalledWith(expectedStatus);
  expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining(expectedResponse));
};

export const expectLoggerCall = (
  loggerMock: jest.Mocked<typeof import('../../src/config/logger').logger>,
  level: 'error' | 'warn' | 'info' | 'debug',
  message: string,
  data?: Record<string, unknown>
) => {
  if (data) {
    expect(loggerMock[level]).toHaveBeenCalledWith(message, expect.objectContaining(data));
  } else {
    expect(loggerMock[level]).toHaveBeenCalledWith(message, expect.any(Object));
  }
};
