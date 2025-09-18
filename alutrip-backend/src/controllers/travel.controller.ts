import { Request, Response } from 'express';
import { travelService } from '../services/travel.service';
import { logger } from '../config/logger';
import { travelQuestionSchema, paginationSchema, idParamSchema } from '../schemas/travel.schemas';
import { ApiResponse, ErrorResponse, ErrorType } from '../types/api';
import { TravelQuestionResponse } from '../types/travel';
import { ZodError } from 'zod';

/**
 * Travel Controller for handling travel Q&A endpoints
 */
export class TravelController {

  /**
   * POST /api/travel/ask
   * Submit a travel question and receive AI-generated response
   */
  async askQuestion(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const clientIp = req.ip || 'unknown';
    
    try {
      const validatedData = travelQuestionSchema.parse(req.body);
      const { question, model } = validatedData;

      if (!travelService.validateModel(model)) {
        const response: ErrorResponse = {
          status: 'error',
          message: `Model '${model}' is not available. Please check API configuration.`,
          data: {
            type: ErrorType.AI_SERVICE_ERROR
          }
        };
        res.status(400).json(response);
        return;
      }

      const sessionId = req.headers['x-session-id'] as string || undefined;

      const result = await travelService.askQuestion(
        { question, model },
        clientIp,
        sessionId
      );

      const processingTime = Date.now() - startTime;

      const response: ApiResponse<TravelQuestionResponse> = {
        status: 'success',
        message: 'Travel question answered successfully',
        data: result
      };

      res.set('X-Processing-Time', `${processingTime}ms`);
      
      res.status(200).json(response);

      logger.info('Travel question answered successfully', {
        questionId: result.id,
        clientIp,
        model,
        processingTime: `${processingTime}ms`,
        sessionId
      });

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      if (error instanceof ZodError) {
        const response: ErrorResponse = {
          status: 'error',
          message: 'Invalid request data',
          data: {
            type: ErrorType.VALIDATION_ERROR,
            errors: error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message
            }))
          }
        };
        
        res.status(400).json(response);
        return;
      }

      if ((error as Error).message.includes('Rate limit exceeded')) {
        const response: ErrorResponse = {
          status: 'error',
          message: 'Rate limit exceeded. You have reached the maximum of 5 questions per 24 hours.',
          data: {
            type: ErrorType.RATE_LIMIT_ERROR,
            details: {
              rateLimitExceeded: true,
              resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            }
          }
        };
        
        res.status(429).json(response);
        return;
      }

      if ((error as Error).message.includes('AI service error')) {
        const response: ErrorResponse = {
          status: 'error',
          message: 'AI service is temporarily unavailable. Please try again later.',
          data: {
            type: ErrorType.AI_SERVICE_ERROR
          }
        };
        
        res.status(503).json(response);
        return;
      }

      const response: ErrorResponse = {
        status: 'error',
        message: 'Internal server error',
        data: {
          type: ErrorType.INTERNAL_ERROR
        }
      };

      res.status(500).json(response);

      logger.error('Failed to process travel question', {
        error: (error as Error).message,
        clientIp,
        processingTime: `${processingTime}ms`,
        sessionId: req.headers['x-session-id']
      });
    }
  }

  /**
   * GET /api/travel/questions/:id
   * Get a specific travel question and response
   */
  async getQuestion(req: Request, res: Response): Promise<void> {
    try {
      const validatedParams = idParamSchema.parse(req.params);
      const { id } = validatedParams;

      const result = await travelService.getQuestionById(id);

      if (!result) {
        const response: ErrorResponse = {
          status: 'error',
          message: 'Travel question not found',
          data: {
            type: ErrorType.NOT_FOUND_ERROR
          }
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse<TravelQuestionResponse> = {
        status: 'success',
        message: 'Travel question retrieved successfully',
        data: result
      };

      res.status(200).json(response);

    } catch (error) {
      if (error instanceof ZodError) {
        const response: ErrorResponse = {
          status: 'error',
          message: 'Invalid question ID',
          data: {
            type: ErrorType.VALIDATION_ERROR,
            errors: error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message
            }))
          }
        };
        
        res.status(400).json(response);
        return;
      }

      const response: ErrorResponse = {
        status: 'error',
        message: 'Internal server error',
        data: {
          type: ErrorType.INTERNAL_ERROR
        }
      };

      res.status(500).json(response);

      logger.error('Failed to get travel question', {
        error: (error as Error).message,
        questionId: req.params['id']
      });
    }
  }

  /**
   * GET /api/travel/questions
   * Get recent travel questions with pagination
   */
  async getRecentQuestions(req: Request, res: Response): Promise<void> {
    try {
      const validatedQuery = paginationSchema.parse(req.query);
      const { limit, offset } = validatedQuery;

      const result = await travelService.getRecentQuestions(limit, offset);

      const response: ApiResponse<{
        questions: TravelQuestionResponse[];
        pagination: {
          total: number;
          limit: number;
          offset: number;
          hasMore: boolean;
        };
      }> = {
        status: 'success',
        message: 'Recent travel questions retrieved successfully',
        data: {
          questions: result.questions,
          pagination: {
            total: result.total,
            limit: result.limit,
            offset: result.offset,
            hasMore: result.offset + result.limit < result.total
          }
        }
      };

      res.status(200).json(response);

    } catch (error) {
      if (error instanceof ZodError) {
        const response: ErrorResponse = {
          status: 'error',
          message: 'Invalid query parameters for recent questions',
          data: {
            type: ErrorType.VALIDATION_ERROR,
            errors: error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message
            }))
          }
        };
        
        res.status(400).json(response);
        return;
      }

      const response: ErrorResponse = {
        status: 'error',
        message: 'Internal server error',
        data: {
          type: ErrorType.INTERNAL_ERROR
        }
      };

      res.status(500).json(response);

      logger.error('Failed to get recent travel questions', {
        error: (error as Error).message,
        query: req.query
      });
    }
  }

  /**
   * GET /api/travel/models/health
   * Check AI models health and availability
   */
  async checkModelsHealth(_req: Request, res: Response): Promise<void> {
    try {
      const healthStatus = await travelService.checkModelHealth();

      const statusCode = healthStatus.overall === 'healthy' ? 200 
        : healthStatus.overall === 'partial' ? 206 : 503;

      const response: ApiResponse<typeof healthStatus> = {
        status: healthStatus.overall === 'unhealthy' ? 'error' : 'success',
        message: `AI models health check completed - ${healthStatus.overall}`,
        data: healthStatus
      };

      res.status(statusCode).json(response);

    } catch (error) {
      const response: ErrorResponse = {
        status: 'error',
        message: 'Failed to check AI models health',
        data: {
          type: ErrorType.INTERNAL_ERROR
        }
      };

      res.status(500).json(response);

      logger.error('Failed to check AI models health', {
        error: (error as Error).message
      });
    }
  }

  /**
   * GET /api/travel/stats
   * Get travel questions statistics
   */
  async getStats(_req: Request, res: Response): Promise<void> {
    try {
      const stats = await travelService.getStats();

      const response: ApiResponse<typeof stats> = {
        status: 'success',
        message: 'Travel questions statistics retrieved successfully',
        data: stats
      };

      res.status(200).json(response);

    } catch (error) {
      const response: ErrorResponse = {
        status: 'error',
        message: 'Internal server error',
        data: {
          type: ErrorType.INTERNAL_ERROR
        }
      };

      res.status(500).json(response);

      logger.error('Failed to get travel questions stats', {
        error: (error as Error).message
      });
    }
  }

  /**
   * GET /api/travel/history
   * Get client's travel question history (based on IP)
   */
  async getClientHistory(req: Request, res: Response): Promise<void> {
    const clientIp = req.ip || 'unknown';
    
    try {
      const validatedQuery = paginationSchema.parse(req.query);
      const { limit, offset } = validatedQuery;

      const questions = await travelService.getQuestionsByClientIp(clientIp, limit, offset);

      const response: ApiResponse<{
        questions: TravelQuestionResponse[];
        clientIp: string;
        total: number;
      }> = {
        status: 'success',
        message: 'Client travel history retrieved successfully',
        data: {
          questions,
          clientIp,
          total: questions.length
        }
      };

      res.status(200).json(response);

    } catch (error) {
      if (error instanceof ZodError) {
        const response: ErrorResponse = {
          status: 'error',
          message: 'Invalid query parameters for client history',
          data: {
            type: ErrorType.VALIDATION_ERROR,
            errors: error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message
            }))
          }
        };
        
        res.status(400).json(response);
        return;
      }

      const response: ErrorResponse = {
        status: 'error',
        message: 'Internal server error',
        data: {
          type: ErrorType.INTERNAL_ERROR
        }
      };

      res.status(500).json(response);

      logger.error('Failed to get client travel history', {
        error: (error as Error).message,
        clientIp
      });
    }
  }
}

export const travelController = new TravelController();