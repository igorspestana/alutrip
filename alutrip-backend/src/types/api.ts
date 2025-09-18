export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  message: string;
  data: T;
}

export interface SuccessResponse<T = any> extends ApiResponse<T> {
  status: 'success';
}

export interface ErrorResponse extends ApiResponse {
  status: 'error';
  data: {
    type?: ErrorType;
    code?: string;
    details?: any;
    timestamp?: string;
    requestId?: string;
    errors?: ValidationError[];
  };
}

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

export enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  AI_SERVICE_ERROR = 'AI_SERVICE_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  SECURITY_ERROR = 'SECURITY_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  UNAUTHORIZED_ERROR = 'UNAUTHORIZED_ERROR'
}

export enum HttpStatusCode {
  OK = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_SERVER_ERROR = 500,
  SERVICE_UNAVAILABLE = 503
}

export interface RequestContext {
  ip: string;
  userAgent?: string;
  requestId: string;
  timestamp: Date;
}

export interface HealthCheckResponse {
  timestamp: string;
  version: string;
  environment: string;
  uptime: number;
  database: boolean;
  redis: boolean;
  services: {
    groq: boolean;
    gemini: boolean;
  };
}

