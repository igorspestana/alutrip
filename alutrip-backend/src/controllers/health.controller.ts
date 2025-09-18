import { Request, Response } from 'express';
import { checkDatabaseHealth } from '../config/database';
import { checkRedisHealth } from '../config/redis';
import { config } from '../config/env';
import { logger } from '../config/logger';
import { SuccessResponse, ErrorResponse, HttpStatusCode, HealthCheckResponse } from '../types/api';
import { asyncHandler } from '../middleware/error-handler';

class HealthController {
  getHealth = asyncHandler(async(_req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    
    try {
      const isDatabaseHealthy = await checkDatabaseHealth();
      const isRedisHealthy = await checkRedisHealth();
      
      // Check AI services (basic connectivity - not actual API calls)
      const groqHealthy = !!config.GROQ_API_KEY && !config.GROQ_API_KEY.includes('your-groq-api-key');
      const geminiHealthy = !!config.GEMINI_API_KEY && !config.GEMINI_API_KEY.includes('your-gemini-api-key');
      
      const uptime = process.uptime();
      const responseTime = Date.now() - startTime;
      
      const healthData: HealthCheckResponse = {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: config.NODE_ENV,
        uptime: Math.floor(uptime),
        database: isDatabaseHealthy,
        redis: isRedisHealthy,
        services: {
          groq: groqHealthy,
          gemini: geminiHealthy
        }
      };
      
      const isHealthy = isDatabaseHealthy && isRedisHealthy;
      const statusCode = isHealthy ? HttpStatusCode.OK : HttpStatusCode.SERVICE_UNAVAILABLE;
      const status = isHealthy ? 'success' : 'error';
      const message = isHealthy ? 'API is healthy' : 'API health check failed';
      
      logger.info('Health check performed', {
        healthy: isHealthy,
        responseTime: `${responseTime}ms`,
        database: isDatabaseHealthy,
        redis: isRedisHealthy,
        services: { groq: groqHealthy, gemini: geminiHealthy }
      });
      
      const response: SuccessResponse<HealthCheckResponse> | ErrorResponse = {
        status,
        message,
        data: healthData
      };
      
      res.status(statusCode).json(response);
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      logger.error('Health check failed', {
        error: (error as Error).message,
        responseTime: `${responseTime}ms`
      });
      
      const errorResponse: ErrorResponse = {
        status: 'error',
        message: 'Health check failed',
        data: {
          timestamp: new Date().toISOString(),
          details: { error: (error as Error).message }
        }
      };
      
      res.status(HttpStatusCode.SERVICE_UNAVAILABLE).json(errorResponse);
    }
  });
  
  getDetailedHealth = asyncHandler(async(_req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    
    try {
      const memoryUsage = process.memoryUsage();
      
      const [isDatabaseHealthy, isRedisHealthy] = await Promise.all([
        checkDatabaseHealth().catch(() => false),
        checkRedisHealth().catch(() => false)
      ]);
      
      const detailedHealthData = {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: config.NODE_ENV,
        uptime: Math.floor(process.uptime()),
        
        memory: {
          rss: Math.round(memoryUsage.rss / 1024 / 1024),
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          external: Math.round(memoryUsage.external / 1024 / 1024)
        },
        
        dependencies: {
          database: {
            healthy: isDatabaseHealthy,
            type: 'PostgreSQL',
            connectionString: config.DATABASE_URL.replace(/:\/\/([^:]+):([^@]+)@/, '://***:***@')
          },
          redis: {
            healthy: isRedisHealthy,
            type: 'Redis',
            connectionString: config.REDIS_URL.replace(/:\/\/([^:]+):([^@]+)@/, '://***:***@')
          },
          ai_services: {
            groq: {
              configured: !!config.GROQ_API_KEY && !config.GROQ_API_KEY.includes('your-groq-api-key'),
              model: config.GROQ_MODEL
            },
            gemini: {
              configured: !!config.GEMINI_API_KEY && !config.GEMINI_API_KEY.includes('your-gemini-api-key'),
              model: config.GEMINI_MODEL
            }
          }
        },
        
        config: {
          rate_limit: {
            requests: config.RATE_LIMIT_REQUESTS,
            window: `${config.RATE_LIMIT_WINDOW / 1000 / 60 / 60}h`
          },
          cors_origin: config.CORS_ORIGIN
        }
      };
      
      const responseTime = Date.now() - startTime;
      const isHealthy = isDatabaseHealthy && isRedisHealthy;
      
      logger.info('Detailed health check performed', {
        healthy: isHealthy,
        responseTime: `${responseTime}ms`,
        memoryUsageMB: detailedHealthData.memory.heapUsed
      });
      
      const statusCode = isHealthy ? HttpStatusCode.OK : HttpStatusCode.SERVICE_UNAVAILABLE;
      const status = isHealthy ? 'success' : 'error';
      const message = isHealthy ? 'Detailed health check passed' : 'Some dependencies are unhealthy';
      
      const response = {
        status,
        message,
        data: {
          ...detailedHealthData,
          response_time_ms: responseTime
        }
      };
      
      res.status(statusCode).json(response);
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      logger.error('Detailed health check failed', {
        error: (error as Error).message,
        responseTime: `${responseTime}ms`
      });
      
      const errorResponse: ErrorResponse = {
        status: 'error',
        message: 'Detailed health check failed',
        data: {
          timestamp: new Date().toISOString(),
          details: { 
            response_time_ms: responseTime,
            error: (error as Error).message 
          }
        }
      };
      
      res.status(HttpStatusCode.SERVICE_UNAVAILABLE).json(errorResponse);
    }
  });
  
  getReadiness = asyncHandler(async(_req: Request, res: Response): Promise<void> => {
    try {
      const isDatabaseHealthy = await checkDatabaseHealth();
      const isRedisHealthy = await checkRedisHealth();
      
      if (isDatabaseHealthy && isRedisHealthy) {
        res.status(HttpStatusCode.OK).json({
          status: 'success',
          message: 'Application is ready',
          data: { ready: true }
        });
      } else {
        res.status(HttpStatusCode.SERVICE_UNAVAILABLE).json({
          status: 'error',
          message: 'Application is not ready',
          data: { 
            ready: false,
            database: isDatabaseHealthy,
            redis: isRedisHealthy
          }
        });
      }
    } catch (error) {
      res.status(HttpStatusCode.SERVICE_UNAVAILABLE).json({
        status: 'error',
        message: 'Readiness check failed',
        data: { ready: false }
      });
    }
  });
  
  getLiveness = asyncHandler(async(_req: Request, res: Response): Promise<void> => {
    res.status(HttpStatusCode.OK).json({
      status: 'success',
      message: 'Application is alive',
      data: { 
        alive: true,
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString()
      }
    });
  });
}

export const healthController = new HealthController();

