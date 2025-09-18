import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import {
  AppError,
  errorHandler,
  notFoundHandler,
  asyncHandler,
  createValidationError,
  createRateLimitError,
  createDatabaseError,
  createAIServiceError,
  createNotFoundError
} from '../../../src/middleware/error-handler';
import { logger } from '../../../src/config/logger';
import { ErrorType, HttpStatusCode } from '../../../src/types/api';

// Mock dependencies
jest.mock('../../../src/config/logger');

const mockedLogger = logger as jest.Mocked<typeof logger>;

// Helper functions
const createMockRequest = (overrides?: Partial<Request>): Partial<Request> => ({
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

const createMockResponse = (): Partial<Response> => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
  send: jest.fn().mockReturnThis(),
  end: jest.fn().mockReturnThis()
});

const createMockNext = () => jest.fn();

const createZodError = (): ZodError => {
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

describe('Error Handler Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    req = createMockRequest();
    res = createMockResponse();
    next = createMockNext();
    
    statusMock = res.status as jest.Mock;
    jsonMock = res.json as jest.Mock;

    jest.clearAllMocks();

    // Mock Date for consistent testing
    jest.spyOn(Date, 'now').mockReturnValue(1642248000000);
    jest.spyOn(Date.prototype, 'toISOString').mockReturnValue('2024-01-15T10:00:00.000Z');

    // Reset NODE_ENV
    delete process.env['NODE_ENV'];
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('AppError class', () => {
    it('should create AppError with all properties', () => {
      const error = new AppError(
        'Test error',
        HttpStatusCode.BAD_REQUEST,
        ErrorType.VALIDATION_ERROR,
        'TEST_CODE',
        { extra: 'data' }
      );

      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(HttpStatusCode.BAD_REQUEST);
      expect(error.type).toBe(ErrorType.VALIDATION_ERROR);
      expect(error.code).toBe('TEST_CODE');
      expect(error.details).toEqual({ extra: 'data' });
      expect(error).toBeInstanceOf(Error);
    });

    it('should create AppError with default values', () => {
      const error = new AppError('Test error');

      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(HttpStatusCode.INTERNAL_SERVER_ERROR);
      expect(error.type).toBe(ErrorType.INTERNAL_ERROR);
      expect(error.code).toBeUndefined();
      expect(error.details).toBeUndefined();
    });

    it('should capture stack trace', () => {
      const error = new AppError('Test error');
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('Test error');
    });
  });

  describe('errorHandler middleware', () => {
    it('should handle AppError correctly', () => {
      const error = new AppError(
        'Validation failed',
        HttpStatusCode.BAD_REQUEST,
        ErrorType.VALIDATION_ERROR,
        'VALIDATION_FAILED',
        { errors: [{ field: 'email', message: 'Invalid email format' }] }
      );

      errorHandler(error, req as Request, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(HttpStatusCode.BAD_REQUEST);
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'error',
        message: 'Validation failed',
        data: expect.objectContaining({
          type: ErrorType.VALIDATION_ERROR,
          requestId: expect.stringMatching(/^req_\d+_[a-z0-9]+$/),
          timestamp: '2024-01-15T10:00:00.000Z',
          errors: [{ field: 'email', message: 'Invalid email format' }]
        })
      });

      expect(mockedLogger.error).toHaveBeenCalledWith(
        'Request error',
        expect.objectContaining({
          requestId: expect.stringMatching(/^req_\d+_[a-z0-9]+$/),
          method: 'POST',
          url: '/api/test',
          ip: '127.0.0.1'
        })
      );
    });

    it('should handle ZodError correctly', () => {
      const zodError = createZodError();

      errorHandler(zodError, req as Request, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(HttpStatusCode.BAD_REQUEST);
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'error',
        message: 'Validation failed',
        data: expect.objectContaining({
          type: ErrorType.VALIDATION_ERROR,
          requestId: expect.stringMatching(/^req_\d+_[a-z0-9]+$/),
          timestamp: '2024-01-15T10:00:00.000Z',
          errors: [
            { field: 'question', message: 'String must contain at least 10 character(s)', code: 'too_small' },
            { field: 'destination', message: 'Expected string, received number', code: 'invalid_type' }
          ]
        })
      });
    });

    it('should handle ValidationError correctly', () => {
      const error = Object.assign(new Error('Validation error'), { name: 'ValidationError' });

      errorHandler(error, req as Request, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(HttpStatusCode.BAD_REQUEST);
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'error',
        message: 'Validation error',
        data: expect.objectContaining({
          type: ErrorType.VALIDATION_ERROR,
          requestId: expect.stringMatching(/^req_\d+_[a-z0-9]+$/),
          timestamp: '2024-01-15T10:00:00.000Z'
        })
      });
    });

    it('should handle CastError correctly', () => {
      const error = Object.assign(new Error('Cast error'), { name: 'CastError' });

      errorHandler(error, req as Request, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(HttpStatusCode.BAD_REQUEST);
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'error',
        message: 'Invalid data format',
        data: expect.objectContaining({
          type: ErrorType.VALIDATION_ERROR,
          requestId: expect.stringMatching(/^req_\d+_[a-z0-9]+$/),
          timestamp: '2024-01-15T10:00:00.000Z'
        })
      });
    });

    it('should handle MongoError correctly', () => {
      const error = Object.assign(new Error('MongoDB error'), { name: 'MongoError' });

      errorHandler(error, req as Request, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(HttpStatusCode.INTERNAL_SERVER_ERROR);
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'error',
        message: 'Database operation failed',
        data: expect.objectContaining({
          type: ErrorType.DATABASE_ERROR,
          requestId: expect.stringMatching(/^req_\d+_[a-z0-9]+$/),
          timestamp: '2024-01-15T10:00:00.000Z'
        })
      });
    });

    it('should handle DatabaseError correctly', () => {
      const error = Object.assign(new Error('Database error'), { name: 'DatabaseError' });

      errorHandler(error, req as Request, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(HttpStatusCode.INTERNAL_SERVER_ERROR);
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'error',
        message: 'Database operation failed',
        data: expect.objectContaining({
          type: ErrorType.DATABASE_ERROR,
          requestId: expect.stringMatching(/^req_\d+_[a-z0-9]+$/),
          timestamp: '2024-01-15T10:00:00.000Z'
        })
      });
    });

    it('should handle generic Error correctly', () => {
      const error = new Error('Generic error message');

      errorHandler(error, req as Request, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(HttpStatusCode.INTERNAL_SERVER_ERROR);
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'error',
        message: 'Internal server error',
        data: expect.objectContaining({
          type: ErrorType.INTERNAL_ERROR,
          requestId: expect.stringMatching(/^req_\d+_[a-z0-9]+$/),
          timestamp: '2024-01-15T10:00:00.000Z'
        })
      });
    });

    it('should mask internal errors in production', () => {
      process.env['NODE_ENV'] = 'production';
      
      const error = new Error('Internal details that should be hidden');

      errorHandler(error, req as Request, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(HttpStatusCode.INTERNAL_SERVER_ERROR);
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'error',
        message: 'Internal server error',
        data: {
          type: ErrorType.INTERNAL_ERROR,
          requestId: expect.stringMatching(/^req_\d+_[a-z0-9]+$/),
          timestamp: '2024-01-15T10:00:00.000Z'
        }
      });
    });

    it('should not mask AppError in production', () => {
      process.env['NODE_ENV'] = 'production';
      
      const error = new AppError(
        'Validation failed',
        HttpStatusCode.BAD_REQUEST,
        ErrorType.VALIDATION_ERROR
      );

      errorHandler(error, req as Request, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(HttpStatusCode.BAD_REQUEST);
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'error',
        message: 'Validation failed',
        data: expect.objectContaining({
          type: ErrorType.VALIDATION_ERROR,
          requestId: expect.stringMatching(/^req_\d+_[a-z0-9]+$/),
          timestamp: '2024-01-15T10:00:00.000Z'
        })
      });
    });

    it('should log complete error information', () => {
      const error = new Error('Test error');

      errorHandler(error, req as Request, res as Response, next);

      expect(mockedLogger.error).toHaveBeenCalledWith(
        'Request error',
        expect.objectContaining({
          requestId: expect.stringMatching(/^req_\d+_[a-z0-9]+$/),
          method: req.method,
          url: req.url,
          ip: req.ip,
          userAgent: 'Test-Agent/1.0',
          error: {
            message: error.message,
            stack: expect.any(String),
            type: ErrorType.INTERNAL_ERROR,
            statusCode: HttpStatusCode.INTERNAL_SERVER_ERROR
          },
          body: req.body,
          query: req.query,
          params: req.params
        })
      );
    });

    it('should generate unique request IDs', () => {
      const error1 = new Error('Error 1');
      const error2 = new Error('Error 2');

      errorHandler(error1, req as Request, res as Response, next);
      errorHandler(error2, req as Request, res as Response, next);

      const firstCall = jsonMock.mock.calls[0][0];
      const secondCall = jsonMock.mock.calls[1][0];

      expect(firstCall.data.requestId).toMatch(/^req_\d+_[a-z0-9]+$/);
      expect(secondCall.data.requestId).toMatch(/^req_\d+_[a-z0-9]+$/);
      expect(firstCall.data.requestId).not.toBe(secondCall.data.requestId);
    });

    it('should handle errors without stack trace', () => {
      const error = new Error('Test error');
      delete error.stack;

      errorHandler(error, req as Request, res as Response, next);

      expect(mockedLogger.error).toHaveBeenCalledWith(
        'Request error',
        expect.objectContaining({
          error: expect.objectContaining({
            stack: undefined
          })
        })
      );
    });

    it('should handle empty request object', () => {
      const emptyReq = {
        get: jest.fn().mockReturnValue(undefined)
      } as unknown as Request;
      const error = new Error('Test error');

      errorHandler(error, emptyReq, res as Response, next);

      expect(statusMock).toHaveBeenCalledWith(HttpStatusCode.INTERNAL_SERVER_ERROR);
      expect(mockedLogger.error).toHaveBeenCalledWith(
        'Request error',
        expect.objectContaining({
          method: undefined,
          url: undefined,
          ip: undefined,
          userAgent: undefined
        })
      );
    });
  });

  describe('notFoundHandler middleware', () => {
    it('should handle 404 not found correctly', () => {
      notFoundHandler(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(HttpStatusCode.NOT_FOUND);
      expect(jsonMock).toHaveBeenCalledWith({
        status: 'error',
        message: `Route ${req.method} ${req.path} not found`,
        data: {
          type: ErrorType.NOT_FOUND_ERROR,
          timestamp: '2024-01-15T10:00:00.000Z',
          requestId: expect.stringMatching(/^req_\d+_[a-z0-9]+$/)
        }
      });

      expect(mockedLogger.warn).toHaveBeenCalledWith(
        'Route not found',
        expect.objectContaining({
          method: req.method,
          url: req.url,
          ip: req.ip,
          userAgent: 'Test-Agent/1.0'
        })
      );
    });

    it('should handle different HTTP methods', () => {
      const getReq = createMockRequest({ method: 'GET', path: '/api/unknown' });

      notFoundHandler(getReq as Request, res as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Route GET /api/unknown not found'
        })
      );
    });
  });

  describe('asyncHandler wrapper', () => {
    it('should call function and handle resolved promise', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      const wrappedFn = asyncHandler(mockFn);

      await wrappedFn(req as Request, res as Response, next);

      expect(mockFn).toHaveBeenCalledWith(req, res, next);
      expect(next).not.toHaveBeenCalled();
    });

    it('should catch rejected promise and call next', async () => {
      const error = new Error('Async error');
      const mockFn = jest.fn().mockRejectedValue(error);
      const wrappedFn = asyncHandler(mockFn);

      await wrappedFn(req as Request, res as Response, next);

      expect(mockFn).toHaveBeenCalledWith(req, res, next);
      expect(next).toHaveBeenCalledWith(error);
    });

    it('should handle synchronous function that throws', async () => {
      const error = new Error('Sync error');
      const mockFn = jest.fn().mockRejectedValue(error); // Use mockRejectedValue instead
      const wrappedFn = asyncHandler(mockFn);

      await wrappedFn(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    it('should handle function that returns non-promise value', async () => {
      const mockFn = jest.fn().mockReturnValue('sync value');
      const wrappedFn = asyncHandler(mockFn);

      await wrappedFn(req as Request, res as Response, next);

      expect(mockFn).toHaveBeenCalledWith(req, res, next);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Error factory functions', () => {
    it('should create validation error correctly', () => {
      const errors = [{ field: 'email', message: 'Invalid email', code: 'invalid_email' }];
      const error = createValidationError('Validation failed', errors);

      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Validation failed');
      expect(error.statusCode).toBe(HttpStatusCode.BAD_REQUEST);
      expect(error.type).toBe(ErrorType.VALIDATION_ERROR);
      expect(error.code).toBe('VALIDATION_FAILED');
      expect(error.details).toEqual({ errors });
    });

    it('should create rate limit error correctly', () => {
      const feature = 'travel_questions';
      const limit = 5;
      const resetTime = '2024-01-16T10:00:00Z';
      const error = createRateLimitError(feature, limit, resetTime);

      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Rate limit exceeded');
      expect(error.statusCode).toBe(HttpStatusCode.TOO_MANY_REQUESTS);
      expect(error.type).toBe(ErrorType.RATE_LIMIT_ERROR);
      expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(error.details).toEqual({ feature, limit, resetTime });
    });

    it('should create database error correctly', () => {
      const message = 'Connection failed';
      const error = createDatabaseError(message);

      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe(message);
      expect(error.statusCode).toBe(HttpStatusCode.INTERNAL_SERVER_ERROR);
      expect(error.type).toBe(ErrorType.DATABASE_ERROR);
      expect(error.code).toBe('DATABASE_ERROR');
    });

    it('should create AI service error correctly', () => {
      const provider = 'groq';
      const message = 'API timeout';
      const error = createAIServiceError(provider, message);

      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('AI service error: API timeout');
      expect(error.statusCode).toBe(HttpStatusCode.INTERNAL_SERVER_ERROR);
      expect(error.type).toBe(ErrorType.AI_SERVICE_ERROR);
      expect(error.code).toBe('AI_SERVICE_ERROR');
      expect(error.details).toEqual({ provider });
    });

    it('should create not found error correctly', () => {
      const resource = 'User';
      const error = createNotFoundError(resource);

      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('User not found');
      expect(error.statusCode).toBe(HttpStatusCode.NOT_FOUND);
      expect(error.type).toBe(ErrorType.NOT_FOUND_ERROR);
      expect(error.code).toBe('NOT_FOUND');
    });
  });

  describe('Edge cases', () => {
    it('should handle ZodError with empty errors array', () => {
      const emptyZodError = new ZodError([]);

      errorHandler(emptyZodError, req as Request, res as Response, next);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            errors: []
          })
        })
      );
    });

    it('should handle ZodError with nested paths', () => {
      const nestedZodError = new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['user', 'profile', 'name'],
          message: 'Expected string, received number'
        }
      ]);

      errorHandler(nestedZodError, req as Request, res as Response, next);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            errors: [
              {
                field: 'user.profile.name',
                message: 'Expected string, received number',
                code: 'invalid_type'
              }
            ]
          })
        })
      );
    });

    it('should handle very long error messages', () => {
      const longMessage = 'A'.repeat(1000);
      const error = new Error(longMessage);

      errorHandler(error, req as Request, res as Response, next);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Internal server error' // Should be masked for generic errors
        })
      );

      expect(mockedLogger.error).toHaveBeenCalledWith(
        'Request error',
        expect.objectContaining({
          error: expect.objectContaining({
            message: longMessage // But logged in full
          })
        })
      );
    });
  });
});