import { Request, Response, NextFunction } from 'express';
import { healthController } from '../../../src/controllers/health.controller';
import { checkDatabaseHealth } from '../../../src/config/database';
import { checkRedisHealth } from '../../../src/config/redis';
import { config } from '../../../src/config/env';
import { logger } from '../../../src/config/logger';
import { HttpStatusCode } from '../../../src/types/api';
// Mock dependencies
jest.mock('../../../src/config/database');
jest.mock('../../../src/config/redis');
jest.mock('../../../src/config/env');
jest.mock('../../../src/config/logger');

jest.mock('../../../src/middleware/error-handler', () => ({
  asyncHandler: (fn: any) => fn
}));

const mockedCheckDatabaseHealth = checkDatabaseHealth as jest.MockedFunction<typeof checkDatabaseHealth>;
const mockedCheckRedisHealth = checkRedisHealth as jest.MockedFunction<typeof checkRedisHealth>;
const mockedConfig = config as jest.Mocked<typeof config>;
const mockedLogger = logger as jest.Mocked<typeof logger>;

describe('HealthController', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  let jsonSpy: jest.Mock;
  let statusSpy: jest.Mock;

  beforeEach(() => {
    jsonSpy = jest.fn().mockReturnThis();
    statusSpy = jest.fn().mockReturnValue({ json: jsonSpy });
    next = jest.fn() as NextFunction;

    req = {};
    res = {
      status: statusSpy,
      json: jsonSpy
    };

    process.uptime = jest.fn().mockReturnValue(3600);
    
    const mockMemoryUsage = {
      rss: 100 * 1024 * 1024,
      heapTotal: 50 * 1024 * 1024,
      heapUsed: 40 * 1024 * 1024,
      external: 10 * 1024 * 1024,
      arrayBuffers: 5 * 1024 * 1024
    };
    jest.spyOn(process, 'memoryUsage').mockReturnValue(mockMemoryUsage);
    
    // Mock config values
    mockedConfig.NODE_ENV = 'test';
    mockedConfig.GROQ_API_KEY = 'test-groq-api-key';
    mockedConfig.GEMINI_API_KEY = 'test-gemini-api-key';
    mockedConfig.DATABASE_URL = 'postgres://user:password@localhost:5432/testdb';
    mockedConfig.REDIS_URL = 'redis://user:password@localhost:6379/0';
    mockedConfig.RATE_LIMIT_REQUESTS = 5;
    mockedConfig.RATE_LIMIT_WINDOW = 86400000;
    mockedConfig.CORS_ORIGIN = '*';

    jest.clearAllMocks();

    jest.spyOn(Date, 'now').mockReturnValue(
      new Date('2024-01-15T10:00:00.000Z').getTime()
    );
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T10:00:00.000Z'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  describe('getHealth', () => {
    it('should return healthy status when all services are up', async () => {

      mockedCheckDatabaseHealth.mockResolvedValue(true);
      mockedCheckRedisHealth.mockResolvedValue(true);



      await healthController.getHealth(req as Request, res as Response, next);


      expect(statusSpy).toHaveBeenCalledWith(HttpStatusCode.OK);
      expect(jsonSpy).toHaveBeenCalledWith({
        status: 'success',
        message: 'API is healthy',
        data: {
          timestamp: '2024-01-15T10:00:00.000Z',
          version: '1.0.0',
          environment: 'test',
          uptime: 3600,
          database: true,
          redis: true,
          services: {
            groq: true,
            gemini: true
          }
        }
      });
      expect(mockedLogger.info).toHaveBeenCalledWith(
        'Health check performed',
        expect.objectContaining({
          healthy: true,
          database: true,
          redis: true
        })
      );
    });

    it('should return unhealthy status when database is down', async () => {

      mockedCheckDatabaseHealth.mockResolvedValue(false);
      mockedCheckRedisHealth.mockResolvedValue(true);



      await healthController.getHealth(req as Request, res as Response, next);


      expect(statusSpy).toHaveBeenCalledWith(HttpStatusCode.SERVICE_UNAVAILABLE);
      expect(jsonSpy).toHaveBeenCalledWith({
        status: 'error',
        message: 'API health check failed',
        data: expect.objectContaining({
          database: false,
          redis: true
        })
      });
    });

    it('should return unhealthy status when Redis is down', async () => {

      mockedCheckDatabaseHealth.mockResolvedValue(true);
      mockedCheckRedisHealth.mockResolvedValue(false);



      await healthController.getHealth(req as Request, res as Response, next);


      expect(statusSpy).toHaveBeenCalledWith(HttpStatusCode.SERVICE_UNAVAILABLE);
      expect(jsonSpy).toHaveBeenCalledWith({
        status: 'error',
        message: 'API health check failed',
        data: expect.objectContaining({
          database: true,
          redis: false
        })
      });
    });

    it('should handle database check errors', async () => {

      const dbError = new Error('Database connection failed');
      mockedCheckDatabaseHealth.mockRejectedValue(dbError);
      mockedCheckRedisHealth.mockResolvedValue(true);



      await healthController.getHealth(req as Request, res as Response, next);


      expect(statusSpy).toHaveBeenCalledWith(HttpStatusCode.SERVICE_UNAVAILABLE);
      expect(mockedLogger.error).toHaveBeenCalledWith(
        'Health check failed',
        expect.objectContaining({
          error: 'Database connection failed'
        })
      );
    });

    it('should detect unconfigured API keys', async () => {

      mockedCheckDatabaseHealth.mockResolvedValue(true);
      mockedCheckRedisHealth.mockResolvedValue(true);
      mockedConfig.GROQ_API_KEY = 'your-groq-api-key';
      mockedConfig.GEMINI_API_KEY = 'your-gemini-api-key';



      await healthController.getHealth(req as Request, res as Response, next);


      expect(jsonSpy).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          services: {
            groq: false,
            gemini: false
          }
        })
      }));
    });

    it('should handle both database and Redis down', async () => {

      mockedCheckDatabaseHealth.mockResolvedValue(false);
      mockedCheckRedisHealth.mockResolvedValue(false);


      await healthController.getHealth(req as Request, res as Response, next);


      expect(statusSpy).toHaveBeenCalledWith(HttpStatusCode.SERVICE_UNAVAILABLE);
      expect(jsonSpy).toHaveBeenCalledWith({
        status: 'error',
        message: 'API health check failed',
        data: expect.objectContaining({
          database: false,
          redis: false
        })
      });
    });

    it('should handle Redis check errors', async () => {

      const redisError = new Error('Redis connection failed');
      mockedCheckDatabaseHealth.mockResolvedValue(true);
      mockedCheckRedisHealth.mockRejectedValue(redisError);


      await healthController.getHealth(req as Request, res as Response, next);


      expect(statusSpy).toHaveBeenCalledWith(HttpStatusCode.SERVICE_UNAVAILABLE);
      expect(mockedLogger.error).toHaveBeenCalledWith(
        'Health check failed',
        expect.objectContaining({
          error: 'Redis connection failed'
        })
      );
    });

    it('should handle empty API keys', async () => {

      mockedCheckDatabaseHealth.mockResolvedValue(true);
      mockedCheckRedisHealth.mockResolvedValue(true);
      mockedConfig.GROQ_API_KEY = '';
      mockedConfig.GEMINI_API_KEY = '';


      await healthController.getHealth(req as Request, res as Response, next);


      expect(jsonSpy).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          services: {
            groq: false,
            gemini: false
          }
        })
      }));
    });

    it('should handle undefined API keys', async () => {

      mockedCheckDatabaseHealth.mockResolvedValue(true);
      mockedCheckRedisHealth.mockResolvedValue(true);
      (mockedConfig as any).GROQ_API_KEY = undefined;
      (mockedConfig as any).GEMINI_API_KEY = undefined;


      await healthController.getHealth(req as Request, res as Response, next);


      expect(jsonSpy).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          services: {
            groq: false,
            gemini: false
          }
        })
      }));
    });
  });

  describe('getDetailedHealth', () => {
    it('should return detailed health information', async () => {

      mockedCheckDatabaseHealth.mockResolvedValue(true);
      mockedCheckRedisHealth.mockResolvedValue(true);



      await healthController.getDetailedHealth(req as Request, res as Response, next);


      expect(statusSpy).toHaveBeenCalledWith(HttpStatusCode.OK);
      expect(jsonSpy).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        message: 'Detailed health check passed',
        data: expect.objectContaining({
          timestamp: expect.any(String),
          environment: 'test',
          uptime: 3600,
          memory: expect.objectContaining({
            rss: 100,
            heapTotal: 50
          })
        })
      }));
    });

    it('should mask sensitive information in connection strings', async () => {

      mockedCheckDatabaseHealth.mockResolvedValue(true);
      mockedCheckRedisHealth.mockResolvedValue(true);



      await healthController.getDetailedHealth(req as Request, res as Response, next);


      expect(jsonSpy).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          dependencies: expect.objectContaining({
            database: expect.objectContaining({
              connectionString: expect.not.stringContaining('user:password')
            }),
            redis: expect.objectContaining({
              connectionString: expect.not.stringContaining('user:password')
            })
          })
        })
      }));
    });

    it('should handle dependency check failures', async () => {

      mockedCheckDatabaseHealth.mockResolvedValue(false);
      mockedCheckRedisHealth.mockRejectedValue(new Error('Redis connection error'));



      await healthController.getDetailedHealth(req as Request, res as Response, next);


      expect(statusSpy).toHaveBeenCalledWith(HttpStatusCode.SERVICE_UNAVAILABLE);
      expect(jsonSpy).toHaveBeenCalledWith(expect.objectContaining({
        status: 'error',
        message: 'Some dependencies are unhealthy'
      }));
    });


    it('should include configuration details in detailed health', async () => {

      mockedCheckDatabaseHealth.mockResolvedValue(true);
      mockedCheckRedisHealth.mockResolvedValue(true);
      mockedConfig.GROQ_MODEL = 'llama-3.1-70b-versatile';
      mockedConfig.GEMINI_MODEL = 'gemini-1.5-pro';


      await healthController.getDetailedHealth(req as Request, res as Response, next);


      expect(jsonSpy).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          dependencies: expect.objectContaining({
            ai_services: expect.objectContaining({
              groq: expect.objectContaining({
                configured: true,
                model: 'llama-3.1-70b-versatile'
              }),
              gemini: expect.objectContaining({
                configured: true,
                model: 'gemini-1.5-pro'
              })
            })
          })
        })
      }));
    });

    it('should include rate limit configuration in detailed health', async () => {

      mockedCheckDatabaseHealth.mockResolvedValue(true);
      mockedCheckRedisHealth.mockResolvedValue(true);


      await healthController.getDetailedHealth(req as Request, res as Response, next);


      expect(jsonSpy).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          config: expect.objectContaining({
            rate_limit: expect.objectContaining({
              requests: 5,
              window: '24h'
            }),
            cors_origin: '*'
          })
        })
      }));
    });
  });

  describe('getReadiness', () => {
    it('should return ready status when all dependencies are up', async () => {

      mockedCheckDatabaseHealth.mockResolvedValue(true);
      mockedCheckRedisHealth.mockResolvedValue(true);



      await healthController.getReadiness(req as Request, res as Response, next);


      expect(statusSpy).toHaveBeenCalledWith(HttpStatusCode.OK);
      expect(jsonSpy).toHaveBeenCalledWith({
        status: 'success',
        message: 'Application is ready',
        data: { ready: true }
      });
    });

    it('should return not ready status when database is down', async () => {

      mockedCheckDatabaseHealth.mockResolvedValue(false);
      mockedCheckRedisHealth.mockResolvedValue(true);



      await healthController.getReadiness(req as Request, res as Response, next);


      expect(statusSpy).toHaveBeenCalledWith(HttpStatusCode.SERVICE_UNAVAILABLE);
      expect(jsonSpy).toHaveBeenCalledWith({
        status: 'error',
        message: 'Application is not ready',
        data: { 
          ready: false,
          database: false,
          redis: true
        }
      });
    });

    it('should handle dependency check errors', async () => {

      mockedCheckDatabaseHealth.mockRejectedValue(new Error('Database connection error'));



      await healthController.getReadiness(req as Request, res as Response, next);


      expect(statusSpy).toHaveBeenCalledWith(HttpStatusCode.SERVICE_UNAVAILABLE);
      expect(jsonSpy).toHaveBeenCalledWith({
        status: 'error',
        message: 'Readiness check failed',
        data: { ready: false }
      });
    });

    it('should handle Redis check errors in readiness', async () => {

      mockedCheckDatabaseHealth.mockResolvedValue(true);
      mockedCheckRedisHealth.mockRejectedValue(new Error('Redis connection error'));


      await healthController.getReadiness(req as Request, res as Response, next);


      expect(statusSpy).toHaveBeenCalledWith(HttpStatusCode.SERVICE_UNAVAILABLE);
      expect(jsonSpy).toHaveBeenCalledWith({
        status: 'error',
        message: 'Readiness check failed',
        data: { ready: false }
      });
    });
  });

  describe('getLiveness', () => {
    it('should always return alive status', async () => {


      await healthController.getLiveness(req as Request, res as Response, next);


      expect(statusSpy).toHaveBeenCalledWith(HttpStatusCode.OK);
      expect(jsonSpy).toHaveBeenCalledWith({
        status: 'success',
        message: 'Application is alive',
        data: { 
          alive: true,
          uptime: 3600,
          timestamp: '2024-01-15T10:00:00.000Z'
        }
      });
    });
  });
});