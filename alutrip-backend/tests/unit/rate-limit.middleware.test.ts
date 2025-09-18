import {
  createRateLimiter,
  travelQuestionsRateLimit,
  itinerariesRateLimit,
  getRateLimitInfo,
  getRateLimitStatus,
  cleanupExpiredRateLimits
} from '../../src/middleware/rate-limit';
import { createRateLimitError } from '../../src/middleware/error-handler';
import { config } from '../../src/config/env';
import { incrementRateLimit, getRateLimit, getRateLimitTTL } from '../../src/config/redis';
import { logger } from '../../src/config/logger';
import {
  testClientIps,
  createMockRequest,
  createMockResponse,
  createMockNext,
  expectedRateLimitHeaders
} from '../fixtures/rate-limit.fixtures';

// Mock dependencies
jest.mock('../../src/config/env');
jest.mock('../../src/config/redis');
jest.mock('../../src/config/logger');
jest.mock('../../src/middleware/error-handler');

const mockConfig = config as jest.Mocked<typeof config>;
const mockedIncrementRateLimit = incrementRateLimit as jest.MockedFunction<typeof incrementRateLimit>;
const mockedGetRateLimit = getRateLimit as jest.MockedFunction<typeof getRateLimit>;
const mockedGetRateLimitTTL = getRateLimitTTL as jest.MockedFunction<typeof getRateLimitTTL>;
const mockedLogger = logger as jest.Mocked<typeof logger>;
const mockedCreateRateLimitError = createRateLimitError as jest.MockedFunction<typeof createRateLimitError>;

// Mock config values
mockConfig.RATE_LIMIT_WINDOW = 86400000; // 24 hours
mockConfig.RATE_LIMIT_REQUESTS = 5;

describe('Rate Limit Middleware', () => {
  const clientIp = '127.0.0.1';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock current time - keep original Date.now functionality
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2024-01-15T10:00:00.000Z').getTime());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getRateLimitInfo', () => {
    it('should calculate correct rate limit info', async () => {
      // Arrange
      mockedGetRateLimit.mockResolvedValue(2);
      mockedGetRateLimitTTL.mockResolvedValue(3600); // 1 hour TTL

      // Act
      const result = await getRateLimitInfo('test-key', 86400000, 5);

      // Assert
      expect(result).toEqual({
        used: 2,
        limit: 5,
        remaining: 3,
        reset_time: '2024-01-15T11:00:00.000Z' // Current time + TTL
      });
      expect(mockedGetRateLimit).toHaveBeenCalledWith('test-key');
      expect(mockedGetRateLimitTTL).toHaveBeenCalledWith('test-key');
    });

    it('should handle zero remaining correctly', async () => {
      // Arrange
      mockedGetRateLimit.mockResolvedValue(5);
      mockedGetRateLimitTTL.mockResolvedValue(7200); // 2 hours TTL

      // Act
      const result = await getRateLimitInfo('test-key', 86400000, 5);

      // Assert
      expect(result.remaining).toBe(0);
      expect(result.used).toBe(5);
    });
  });

  describe('createRateLimiter', () => {
    let rateLimiter: ReturnType<typeof createRateLimiter>;
    let req: any;
    let res: any;
    let next: any;

    beforeEach(() => {
      rateLimiter = createRateLimiter('travel_questions');
      req = createMockRequest(clientIp);
      res = createMockResponse();
      next = createMockNext();
    });

    it('should allow requests within rate limit', async () => {
      // Arrange
      mockedGetRateLimit.mockResolvedValue(2);
      mockedGetRateLimitTTL.mockResolvedValue(3600);
      mockedIncrementRateLimit.mockResolvedValue(3);
      // After increment, getRateLimitInfo is called again; simulate used=3
      mockedGetRateLimit.mockResolvedValueOnce(2).mockResolvedValueOnce(3);

      // Act
      await rateLimiter(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith();
      expect(res.set).toHaveBeenCalledWith(
        expectedRateLimitHeaders(
          { used: 3, limit: 5, remaining: 2, reset_time: '2024-01-15T11:00:00.000Z' },
          'travel_questions'
        )
      );
      expect(req.rateLimitInfo).toBeDefined();
      expect(mockedIncrementRateLimit).toHaveBeenCalledWith(
        'rate_limit:travel_questions:127.0.0.1',
        86400000
      );
    });

    it('should block requests when rate limit exceeded', async () => {
      // Arrange
      mockedGetRateLimit.mockResolvedValue(5);
      mockedGetRateLimitTTL.mockResolvedValue(3600);
      const rateLimitError = new Error('Rate limit exceeded') as any;
      rateLimitError.statusCode = 429;
      rateLimitError.type = 'rate_limit';
      mockedCreateRateLimitError.mockReturnValue(rateLimitError as any);

      // Act
      await createRateLimiter('travel_questions')(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith(rateLimitError);
      expect(mockedIncrementRateLimit).not.toHaveBeenCalled();
      expect(mockedCreateRateLimitError).toHaveBeenCalledWith(
        'travel_questions',
        5,
        '2024-01-15T11:00:00.000Z'
      );
    });

    it('should handle Redis errors gracefully', async () => {
      // Arrange
      const redisError = new Error('Redis connection failed');
      mockedGetRateLimit.mockRejectedValue(redisError);

      // Act
      await rateLimiter(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith(redisError);
    });

    it('should use correct key format for different features', async () => {
      // Arrange
      const itineraryRateLimiter = createRateLimiter('itineraries');
      mockedGetRateLimit.mockResolvedValue(1);
      mockedGetRateLimitTTL.mockResolvedValue(3600);
      mockedIncrementRateLimit.mockResolvedValue(2);

      // Act
      await itineraryRateLimiter(req, res, next);

      // Assert
      expect(mockedGetRateLimit).toHaveBeenCalledWith('rate_limit:itineraries:127.0.0.1');
      expect(mockedIncrementRateLimit).toHaveBeenCalledWith(
        'rate_limit:itineraries:127.0.0.1',
        86400000
      );
    });

    it('should handle unknown IP addresses', async () => {
      // Arrange
      req.ip = undefined;
      req.connection.remoteAddress = undefined;
      mockedGetRateLimit.mockResolvedValue(0);
      mockedGetRateLimitTTL.mockResolvedValue(3600);
      mockedIncrementRateLimit.mockResolvedValue(1);

      // Act
      await rateLimiter(req, res, next);

      // Assert
      expect(mockedGetRateLimit).toHaveBeenCalledWith('rate_limit:travel_questions:unknown');
    });
  });

  describe('Predefined rate limiters', () => {
    it('should have correct configuration for travel questions', async () => {
      // Arrange
      const req = createMockRequest(clientIp) as any;
      const res = createMockResponse();
      const next = createMockNext();
      
      mockedGetRateLimit.mockResolvedValue(1);
      mockedGetRateLimitTTL.mockResolvedValue(3600);
      mockedIncrementRateLimit.mockResolvedValue(2);

      // Act
      await travelQuestionsRateLimit(req as any, res, next);

      // Assert
      expect(mockedGetRateLimit).toHaveBeenCalledWith('rate_limit:travel_questions:127.0.0.1');
      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'X-RateLimit-Feature': 'travel_questions'
        })
      );
    });

    it('should have correct configuration for itineraries', async () => {
      // Arrange
      const req = createMockRequest(clientIp) as any;
      const res = createMockResponse();
      const next = createMockNext();
      
      mockedGetRateLimit.mockResolvedValue(0);
      mockedGetRateLimitTTL.mockResolvedValue(3600);
      mockedIncrementRateLimit.mockResolvedValue(1);

      // Act
      await itinerariesRateLimit(req as any, res, next);

      // Assert
      expect(mockedGetRateLimit).toHaveBeenCalledWith('rate_limit:itineraries:127.0.0.1');
      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'X-RateLimit-Feature': 'itineraries'
        })
      );
    });
  });

  describe('getRateLimitStatus', () => {
    it('should return rate limit status for all features', async () => {
      // Arrange
      mockedGetRateLimit
        .mockResolvedValueOnce(3) // travel_questions
        .mockResolvedValueOnce(1); // itineraries
      mockedGetRateLimitTTL
        .mockResolvedValueOnce(3600)
        .mockResolvedValueOnce(3600);

      // Act
      const result = await getRateLimitStatus(clientIp);

      // Assert
      expect(result).toEqual({
        ip: clientIp,
        limits: {
          travel_questions: {
            used: 3,
            limit: 5,
            remaining: 2,
            reset_time: '2024-01-15T11:00:00.000Z'
          },
          itineraries: {
            used: 1,
            limit: 5,
            remaining: 4,
            reset_time: '2024-01-15T11:00:00.000Z'
          }
        }
      });
    });

    it('should handle errors in status retrieval', async () => {
      // Arrange
      const redisError = new Error('Redis error');
      mockedGetRateLimit.mockRejectedValue(redisError);

      // Act & Assert
      await expect(getRateLimitStatus(clientIp)).rejects.toThrow('Redis error');
    });
  });

  describe('cleanupExpiredRateLimits', () => {
    it('should log cleanup operations', async () => {
      // Act
      await cleanupExpiredRateLimits();

      // Assert
      expect(mockedLogger.info).toHaveBeenCalledWith('Starting rate limit cleanup');
      expect(mockedLogger.info).toHaveBeenCalledWith('Rate limit cleanup completed');
    });

    it('should handle cleanup errors', async () => {
      // Arrange
      mockedLogger.info.mockImplementationOnce(() => {
        throw new Error('Cleanup failed');
      });

      // Act
      await cleanupExpiredRateLimits();

      // Assert
      expect(mockedLogger.error).toHaveBeenCalledWith(
        'Rate limit cleanup failed',
        { error: 'Cleanup failed' }
      );
    });
  });

  describe('Rate limit integration scenarios', () => {
    it('should handle concurrent requests correctly', async () => {
      // Arrange
      const rateLimiter = createRateLimiter('travel_questions');
      const requests = Array(3).fill(null).map(() => ({
        req: createMockRequest(clientIp),
        res: createMockResponse(),
        next: createMockNext()
      }));

      // Mock sequential increments
      mockedGetRateLimit
        .mockResolvedValueOnce(2) // First request
        .mockResolvedValueOnce(3) // Second request  
        .mockResolvedValueOnce(4); // Third request
      mockedGetRateLimitTTL.mockResolvedValue(3600);
      mockedIncrementRateLimit
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(4)
        .mockResolvedValueOnce(5);

      // Act
      await Promise.all(requests.map(({ req, res, next }) =>
        rateLimiter(req as any, res, next)
      ));

      // Assert
      requests.forEach(({ next }) => {
        expect(next).toHaveBeenCalledWith();
      });
    });

    it('should differentiate between different IPs', async () => {
      // Arrange
      const rateLimiter = createRateLimiter('travel_questions');
      const requests = testClientIps.map(ip => ({
        req: createMockRequest(ip),
        res: createMockResponse(),
        next: createMockNext()
      }));

      mockedGetRateLimit.mockResolvedValue(2);
      mockedGetRateLimitTTL.mockResolvedValue(3600);
      mockedIncrementRateLimit.mockResolvedValue(3);

      // Act
      await Promise.all(requests.map(({ req, res, next }) =>
        rateLimiter(req as any, res, next)
      ));

      // Assert
      testClientIps.forEach(ip => {
        expect(mockedGetRateLimit).toHaveBeenCalledWith(`rate_limit:travel_questions:${ip}`);
        expect(mockedIncrementRateLimit).toHaveBeenCalledWith(
          `rate_limit:travel_questions:${ip}`,
          86400000
        );
      });
    });

    it('should maintain separate counts for different features', async () => {
      // Arrange
      const travelRateLimiter = createRateLimiter('travel_questions');
      const itineraryRateLimiter = createRateLimiter('itineraries');
      
      const req1 = createMockRequest(clientIp);
      const res1 = createMockResponse();
      const next1 = createMockNext();
      
      const req2 = createMockRequest(clientIp);
      const res2 = createMockResponse();
      const next2 = createMockNext();

      mockedGetRateLimit.mockResolvedValue(1);
      mockedGetRateLimitTTL.mockResolvedValue(3600);
      mockedIncrementRateLimit.mockResolvedValue(2);

      // Act
      await travelRateLimiter(req1 as any, res1, next1);
      await itineraryRateLimiter(req2 as any, res2, next2);

      // Assert
      expect(mockedGetRateLimit).toHaveBeenCalledWith('rate_limit:travel_questions:127.0.0.1');
      expect(mockedGetRateLimit).toHaveBeenCalledWith('rate_limit:itineraries:127.0.0.1');
      expect(next1).toHaveBeenCalled();
      expect(next2).toHaveBeenCalled();
    });
  });
});
