import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../config/logger';
import { ErrorResponse, ErrorType, HttpStatusCode, ValidationError } from '../types/api';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly type: ErrorType;
  public readonly code?: string | undefined;
  public readonly details?: any;

  constructor(
    message: string,
    statusCode: number = HttpStatusCode.INTERNAL_SERVER_ERROR,
    type: ErrorType = ErrorType.INTERNAL_ERROR,
    code?: string,
    details?: any
  ) {
    super(message);
    this.statusCode = statusCode;
    this.type = type;
    this.code = code;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Convert Zod errors to validation errors
const formatZodError = (error: ZodError): ValidationError[] => {
  return error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code
  }));
};

// Generate unique request ID
const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Error handler middleware
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const requestId = generateRequestId();
  const timestamp = new Date().toISOString();

  // Default error response
  let statusCode = HttpStatusCode.INTERNAL_SERVER_ERROR;
  let type = ErrorType.INTERNAL_ERROR;
  let message = 'Internal server error';
  let details: any = {};

  // Handle different error types
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    type = error.type;
    message = error.message;
    details = error.details || {};
  } else if (error instanceof ZodError) {
    statusCode = HttpStatusCode.BAD_REQUEST;
    type = ErrorType.VALIDATION_ERROR;
    message = 'Validation failed';
    details = {
      errors: formatZodError(error)
    };
  } else if (error.name === 'ValidationError') {
    statusCode = HttpStatusCode.BAD_REQUEST;
    type = ErrorType.VALIDATION_ERROR;
    message = error.message;
  } else if (error.name === 'CastError') {
    statusCode = HttpStatusCode.BAD_REQUEST;
    type = ErrorType.VALIDATION_ERROR;
    message = 'Invalid data format';
  } else if (error.name === 'MongoError' || error.name === 'DatabaseError') {
    statusCode = HttpStatusCode.INTERNAL_SERVER_ERROR;
    type = ErrorType.DATABASE_ERROR;
    message = 'Database operation failed';
  }

  // Log the error
  logger.error('Request error', {
    requestId,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    error: {
      message: error.message,
      stack: error.stack,
      type: type,
      statusCode
    },
    body: req.body,
    query: req.query,
    params: req.params
  });

  // Create error response
  const errorResponse: ErrorResponse = {
    status: 'error',
    message,
    data: {
      type,
      requestId,
      timestamp,
      ...details
    }
  };

  // Don't expose internal errors in production
  if (process.env['NODE_ENV'] === 'production' && statusCode === HttpStatusCode.INTERNAL_SERVER_ERROR) {
    errorResponse.message = 'Internal server error';
    errorResponse.data = {
      type: ErrorType.INTERNAL_ERROR,
      requestId,
      timestamp
    };
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};

// Not found handler
export const notFoundHandler = (req: Request, res: Response): void => {
  const errorResponse: ErrorResponse = {
    status: 'error',
    message: `Route ${req.method} ${req.path} not found`,
    data: {
      type: ErrorType.NOT_FOUND_ERROR,
      timestamp: new Date().toISOString(),
      requestId: generateRequestId()
    }
  };

  logger.warn('Route not found', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(HttpStatusCode.NOT_FOUND).json(errorResponse);
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Create specific error types
export const createValidationError = (message: string, errors?: ValidationError[]) => {
  return new AppError(
    message,
    HttpStatusCode.BAD_REQUEST,
    ErrorType.VALIDATION_ERROR,
    'VALIDATION_FAILED',
    { errors }
  );
};

export const createRateLimitError = (feature: string, limit: number, resetTime: string) => {
  return new AppError(
    'Rate limit exceeded',
    HttpStatusCode.TOO_MANY_REQUESTS,
    ErrorType.RATE_LIMIT_ERROR,
    'RATE_LIMIT_EXCEEDED',
    { feature, limit, resetTime }
  );
};

export const createDatabaseError = (message: string) => {
  return new AppError(
    message,
    HttpStatusCode.INTERNAL_SERVER_ERROR,
    ErrorType.DATABASE_ERROR,
    'DATABASE_ERROR'
  );
};

export const createAIServiceError = (provider: string, message: string) => {
  return new AppError(
    `AI service error: ${message}`,
    HttpStatusCode.INTERNAL_SERVER_ERROR,
    ErrorType.AI_SERVICE_ERROR,
    'AI_SERVICE_ERROR',
    { provider }
  );
};

export const createNotFoundError = (resource: string) => {
  return new AppError(
    `${resource} not found`,
    HttpStatusCode.NOT_FOUND,
    ErrorType.NOT_FOUND_ERROR,
    'NOT_FOUND'
  );
};

