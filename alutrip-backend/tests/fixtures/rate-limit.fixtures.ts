import { RateLimitInfo } from '../../src/types/travel';

// Mock rate limit info
export const mockRateLimitInfo: RateLimitInfo = {
  used: 2,
  limit: 5,
  remaining: 3,
  reset_time: '2024-01-15T10:30:00.000Z'
};

export const mockRateLimitInfoExceeded: RateLimitInfo = {
  used: 5,
  limit: 5,
  remaining: 0,
  reset_time: '2024-01-15T10:30:00.000Z'
};

export const mockRateLimitInfoFirst: RateLimitInfo = {
  used: 0,
  limit: 5,
  remaining: 5,
  reset_time: '2024-01-15T10:30:00.000Z'
};

// Mock Redis responses
export const mockRedisGetResponse = 2;
export const mockRedisIncrementResponse = 3;
export const mockRedisTTLResponse = 3600; // 1 hour in seconds

// Mock rate limit error
export const mockRateLimitError = {
  status: 429,
  message: 'Rate limit exceeded for travel_questions. You can make 5 requests per 24 hours. Try again at 2024-01-15T10:30:00.000Z',
  data: {
    feature: 'travel_questions',
    limit: 5,
    used: 5,
    remaining: 0,
    reset_time: '2024-01-15T10:30:00.000Z',
    retry_after: 3600
  }
};

// Test client IPs
export const testClientIps = [
  '192.168.1.100',
  '10.0.0.50',
  '172.16.0.25',
  '127.0.0.1'
];

// Mock request and response objects
export const createMockRequest = (ip: string, overrides = {}) => ({
  ip,
  connection: { remoteAddress: ip },
  headers: {},
  method: 'POST',
  path: '/api/travel/ask',
  rateLimitInfo: undefined,
  ...overrides
});

export const createMockResponse = () => {
  const res: any = {
    headersSent: false,
    statusCode: 200,
    headers: {},
    locals: {}
  };

  res.status = jest.fn().mockImplementation((code: number) => {
    res.statusCode = code;
    return res;
  });

  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  
  res.set = jest.fn().mockImplementation((headers: Record<string, string> | string, value?: string) => {
    if (typeof headers === 'string' && value !== undefined) {
      res.headers[headers] = value;
    } else if (typeof headers === 'object') {
      Object.assign(res.headers, headers);
    }
    return res;
  });

  res.get = jest.fn().mockImplementation((header: string) => {
    return res.headers[header];
  });

  return res;
};

// Mock next function
export const createMockNext = () => {
  const next = jest.fn();
  return next;
};

// Expected rate limit headers
export const expectedRateLimitHeaders = (info: RateLimitInfo, feature: string) => ({
  'X-RateLimit-Limit': info.limit.toString(),
  'X-RateLimit-Remaining': info.remaining.toString(),
  'X-RateLimit-Reset': info.reset_time,
  'X-RateLimit-Feature': feature
});

// Rate limit status mock data
export const mockRateLimitStatus = {
  ip: '127.0.0.1',
  limits: {
    travel_questions: {
      used: 3,
      limit: 5,
      remaining: 2,
      reset_time: '2024-01-15T10:30:00.000Z'
    },
    itineraries: {
      used: 1,
      limit: 5,
      remaining: 4,
      reset_time: '2024-01-15T10:30:00.000Z'
    }
  }
};
