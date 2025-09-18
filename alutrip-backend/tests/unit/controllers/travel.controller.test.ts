import { Request, Response } from 'express';
import { travelController } from '../../../src/controllers/travel.controller';
import { travelService } from '../../../src/services/travel.service';
import { logger } from '../../../src/config/logger';
import { ZodError } from 'zod';
import {
  mockTravelQuestionRequest,
  mockTravelQuestionResponse,
  mockTravelQuestionsList,
  mockTravelStats,
  mockModelHealth
} from '../../fixtures/travel.fixtures';

// Mock dependencies
jest.mock('../../../src/services/travel.service');
jest.mock('../../../src/config/logger');

const mockedTravelService = travelService as jest.Mocked<typeof travelService>;
const mockedLogger = logger as jest.Mocked<typeof logger>;

describe('TravelController', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonSpy: jest.Mock;
  let statusSpy: jest.Mock;
  let setSpy: jest.Mock;

  beforeEach(() => {
    jsonSpy = jest.fn().mockReturnThis();
    statusSpy = jest.fn().mockReturnValue({ json: jsonSpy });
    setSpy = jest.fn().mockReturnThis();

    req = {
      ip: '127.0.0.1',
      body: {},
      params: {},
      query: {},
      headers: {}
    };

    res = {
      status: statusSpy,
      json: jsonSpy,
      set: setSpy
    };

    jest.clearAllMocks();
  });

  describe('askQuestion', () => {
    it('should successfully process a travel question', async () => {

      req.body = mockTravelQuestionRequest;
      req.headers = { 'x-session-id': 'test-session' };

      mockedTravelService.validateModel.mockReturnValue(true);
      mockedTravelService.askQuestion.mockResolvedValue(mockTravelQuestionResponse);


      await travelController.askQuestion(req as Request, res as Response);


      expect(mockedTravelService.validateModel).toHaveBeenCalledWith(mockTravelQuestionRequest.model);
      expect(mockedTravelService.askQuestion).toHaveBeenCalledWith(
        mockTravelQuestionRequest,
        '127.0.0.1',
        'test-session'
      );
      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        status: 'success',
        message: 'Travel question answered successfully',
        data: mockTravelQuestionResponse
      });
      expect(setSpy).toHaveBeenCalledWith('X-Processing-Time', expect.stringMatching(/\d+ms/));
    });

    it('should handle unavailable AI model', async () => {

      req.body = mockTravelQuestionRequest;
      mockedTravelService.validateModel.mockReturnValue(false);


      await travelController.askQuestion(req as Request, res as Response);


      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        status: 'error',
        message: `Model '${mockTravelQuestionRequest.model}' is not available. Please check API configuration.`,
        data: {
          type: 'AI_SERVICE_ERROR'
        }
      });
      expect(mockedTravelService.askQuestion).not.toHaveBeenCalled();
    });

    it('should handle validation errors', async () => {

      req.body = { question: '', model: 'invalid-model' };

      const zodError = new ZodError([
        {
          code: 'too_small',
          minimum: 1,
          type: 'string',
          inclusive: true,
          exact: false,
          message: 'Question cannot be empty',
          path: ['question']
        }
      ]);


      jest.spyOn(require('../../../src/schemas/travel.schemas').travelQuestionSchema, 'parse').mockImplementationOnce(() => {
        throw zodError;
      });


      await travelController.askQuestion(req as Request, res as Response);


      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        status: 'error',
        message: 'Invalid request data',
        data: {
          type: 'VALIDATION_ERROR',
          errors: [
            { field: 'question', message: 'Question cannot be empty' }
          ]
        }
      });
    });

    it('should handle rate limiting errors', async () => {

      req.body = mockTravelQuestionRequest;
      mockedTravelService.validateModel.mockReturnValue(true);
      mockedTravelService.askQuestion.mockRejectedValue(
        new Error('Rate limit exceeded. Please try again later.')
      );


      await travelController.askQuestion(req as Request, res as Response);


      expect(statusSpy).toHaveBeenCalledWith(429);
      expect(jsonSpy).toHaveBeenCalledWith({
        status: 'error',
        message: 'Rate limit exceeded. You have reached the maximum of 5 questions per 24 hours.',
        data: {
          type: 'RATE_LIMIT_ERROR',
          details: {
            rateLimitExceeded: true,
            resetTime: expect.any(String)
          }
        }
      });
    });

    it('should handle AI service errors', async () => {

      req.body = mockTravelQuestionRequest;
      mockedTravelService.validateModel.mockReturnValue(true);
      mockedTravelService.askQuestion.mockRejectedValue(
        new Error('AI service error: Failed to process question')
      );


      await travelController.askQuestion(req as Request, res as Response);


      expect(statusSpy).toHaveBeenCalledWith(503);
      expect(jsonSpy).toHaveBeenCalledWith({
        status: 'error',
        message: 'AI service is temporarily unavailable. Please try again later.',
        data: {
          type: 'AI_SERVICE_ERROR'
        }
      });
    });

    it('should handle generic server errors', async () => {

      req.body = mockTravelQuestionRequest;
      mockedTravelService.validateModel.mockReturnValue(true);
      mockedTravelService.askQuestion.mockRejectedValue(
        new Error('Unexpected database error')
      );


      await travelController.askQuestion(req as Request, res as Response);


      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        status: 'error',
        message: 'Internal server error',
        data: {
          type: 'INTERNAL_ERROR'
        }
      });
      expect(mockedLogger.error).toHaveBeenCalled();
    });
  });

  describe('getQuestion', () => {
    it('should retrieve a specific question successfully', async () => {

      req.params = { id: '1' };
      mockedTravelService.getQuestionById.mockResolvedValue(mockTravelQuestionResponse);


      await travelController.getQuestion(req as Request, res as Response);


      expect(mockedTravelService.getQuestionById).toHaveBeenCalledWith(1);
      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        status: 'success',
        message: 'Travel question retrieved successfully',
        data: mockTravelQuestionResponse
      });
    });

    it('should handle question not found', async () => {

      req.params = { id: '999' };
      mockedTravelService.getQuestionById.mockResolvedValue(null);


      await travelController.getQuestion(req as Request, res as Response);


      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(jsonSpy).toHaveBeenCalledWith({
        status: 'error',
        message: 'Travel question not found',
        data: {
          type: 'NOT_FOUND_ERROR'
        }
      });
    });

    it('should handle invalid ID parameter', async () => {

      req.params = { id: 'invalid' };

      const zodError = new ZodError([
        {
          code: 'invalid_type',
          expected: 'number',
          received: 'nan',
          path: ['id'],
          message: 'Expected number, received nan'
        }
      ]);


      jest.spyOn(require('../../../src/schemas/travel.schemas').idParamSchema, 'parse').mockImplementationOnce(() => {
        throw zodError;
      });


      await travelController.getQuestion(req as Request, res as Response);


      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        status: 'error',
        message: 'Invalid question ID',
        data: {
          type: 'VALIDATION_ERROR',
          errors: [
            { field: 'id', message: 'Expected number, received nan' }
          ]
        }
      });
    });
  });

  describe('getRecentQuestions', () => {
    it('should retrieve recent questions with pagination', async () => {

      req.query = { limit: '10', offset: '0' };
      
      const mockResult = {
        questions: mockTravelQuestionsList.slice(0, 2).map(q => ({
          id: q.id,
          question: q.question,
          response: q.response,
          model_used: q.model_used,
          created_at: q.created_at.toISOString()
        })),
        total: mockTravelQuestionsList.length,
        limit: 10,
        offset: 0
      };
      
      mockedTravelService.getRecentQuestions.mockResolvedValue(mockResult);


      await travelController.getRecentQuestions(req as Request, res as Response);


      expect(mockedTravelService.getRecentQuestions).toHaveBeenCalledWith(10, 0);
      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        status: 'success',
        message: 'Recent travel questions retrieved successfully',
        data: {
          questions: mockResult.questions,
          pagination: {
            total: mockResult.total,
            limit: mockResult.limit,
            offset: mockResult.offset,
            hasMore: false
          }
        }
      });
    });

    it('should handle invalid pagination parameters', async () => {

      req.query = { limit: 'invalid', offset: '-1' };

      const zodError = new ZodError([
        {
          code: 'invalid_type',
          expected: 'number',
          received: 'nan',
          path: ['limit'],
          message: 'Expected number, received nan'
        }
      ]);


      jest.spyOn(require('../../../src/schemas/travel.schemas').paginationSchema, 'parse').mockImplementationOnce(() => {
        throw zodError;
      });


      await travelController.getRecentQuestions(req as Request, res as Response);


      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        status: 'error',
        message: 'Invalid query parameters for recent questions',
        data: {
          type: 'VALIDATION_ERROR',
          errors: [
            { field: 'limit', message: 'Expected number, received nan' }
          ]
        }
      });
    });
  });

  describe('checkModelsHealth', () => {
    it('should return health status of AI models', async () => {

      mockedTravelService.checkModelHealth.mockResolvedValue(mockModelHealth);


      await travelController.checkModelsHealth(req as Request, res as Response);


      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        status: 'success',
        message: 'AI models health check completed - healthy',
        data: mockModelHealth
      });
    });

    it('should handle partial health status', async () => {

      const partialHealth = { ...mockModelHealth, overall: 'partial' as const };
      mockedTravelService.checkModelHealth.mockResolvedValue(partialHealth);


      await travelController.checkModelsHealth(req as Request, res as Response);


      expect(statusSpy).toHaveBeenCalledWith(206);
      expect(jsonSpy).toHaveBeenCalledWith({
        status: 'success',
        message: 'AI models health check completed - partial',
        data: partialHealth
      });
    });

    it('should handle unhealthy status', async () => {

      const unhealthyStatus = { ...mockModelHealth, overall: 'unhealthy' as const };
      mockedTravelService.checkModelHealth.mockResolvedValue(unhealthyStatus);


      await travelController.checkModelsHealth(req as Request, res as Response);


      expect(statusSpy).toHaveBeenCalledWith(503);
      expect(jsonSpy).toHaveBeenCalledWith({
        status: 'error',
        message: 'AI models health check completed - unhealthy',
        data: unhealthyStatus
      });
    });
  });

  describe('getStats', () => {
    it('should return travel question statistics', async () => {

      mockedTravelService.getStats.mockResolvedValue(mockTravelStats);


      await travelController.getStats(req as Request, res as Response);


      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        status: 'success',
        message: 'Travel questions statistics retrieved successfully',
        data: mockTravelStats
      });
    });

    it('should handle errors during stats retrieval', async () => {

      mockedTravelService.getStats.mockRejectedValue(new Error('Database error'));


      await travelController.getStats(req as Request, res as Response);


      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        status: 'error',
        message: 'Internal server error',
        data: {
          type: 'INTERNAL_ERROR'
        }
      });
      expect(mockedLogger.error).toHaveBeenCalled();
    });
  });

  describe('getClientHistory', () => {
    it('should return client question history', async () => {

      req.query = { limit: '5', offset: '0' };
      
      const clientHistory = mockTravelQuestionsList.map(q => ({
        id: q.id,
        question: q.question,
        response: q.response,
        model_used: q.model_used,
        created_at: q.created_at.toISOString()
      }));
      
      mockedTravelService.getQuestionsByClientIp.mockResolvedValue(clientHistory);


      await travelController.getClientHistory(req as Request, res as Response);


      expect(mockedTravelService.getQuestionsByClientIp).toHaveBeenCalledWith('127.0.0.1', 5, 0);
      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        status: 'success',
        message: 'Client travel history retrieved successfully',
        data: {
          questions: clientHistory,
          clientIp: '127.0.0.1',
          total: clientHistory.length
        }
      });
    });
  });
});
