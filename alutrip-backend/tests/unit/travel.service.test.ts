import { TravelService } from '../../src/services/travel.service';
import { aiService } from '../../src/services/ai.service';
import { TravelQuestionsModel } from '../../src/models/travel-questions.model';
import { travelQuestionsRateLimit } from '../../src/middleware/rate-limit';
import { logger } from '../../src/config/logger';
import {
  mockTravelQuestionRequest,
  mockTravelQuestion,
  mockTravelQuestionResponse,
  mockAIServiceResponse,
  mockTravelQuestionsList,
  mockTravelStats,
  mockModelHealth
} from '../fixtures/travel.fixtures';

// Mock dependencies
jest.mock('../../src/services/ai.service');
jest.mock('../../src/models/travel-questions.model');
jest.mock('../../src/middleware/rate-limit');
jest.mock('../../src/config/logger');

const mockedAIService = aiService as jest.Mocked<typeof aiService>;
const mockedTravelQuestionsModel = TravelQuestionsModel as jest.Mocked<typeof TravelQuestionsModel>;
const mockedRateLimit = travelQuestionsRateLimit as jest.MockedFunction<typeof travelQuestionsRateLimit>;
const mockedLogger = logger as jest.Mocked<typeof logger>;

describe('TravelService', () => {
  let travelService: TravelService;
  const clientIp = '127.0.0.1';
  const sessionId = 'session123';

  beforeEach(() => {
    travelService = new TravelService();
    jest.clearAllMocks();
  });

  describe('askQuestion', () => {
    it('should process a travel question successfully', async () => {

      mockedRateLimit.mockImplementation(async (_req, _res, next) => next());
      mockedAIService.processQuestion.mockResolvedValue(mockAIServiceResponse);
      mockedTravelQuestionsModel.create.mockResolvedValue(mockTravelQuestion);


      const result = await travelService.askQuestion(mockTravelQuestionRequest, clientIp, sessionId);


      expect(result).toEqual(mockTravelQuestionResponse);
      expect(mockedAIService.processQuestion).toHaveBeenCalledWith(
        mockTravelQuestionRequest.question,
        mockTravelQuestionRequest.model,
        sessionId
      );
      expect(mockedTravelQuestionsModel.create).toHaveBeenCalledWith(
        clientIp,
        mockTravelQuestionRequest.question,
        mockAIServiceResponse.content,
        mockTravelQuestionRequest.model,
        sessionId
      );
      expect(mockedLogger.info).toHaveBeenCalledWith(
        'Processing travel question',
        expect.objectContaining({
          clientIp,
          model: mockTravelQuestionRequest.model,
          questionLength: mockTravelQuestionRequest.question.length,
          sessionId
        })
      );
    });

    it('should handle rate limit error', async () => {

      mockedRateLimit.mockImplementation(async (_req, res, _next) => {
        res.status(429).json({ error: 'Rate limit exceeded' });
      });

      // Act & Assert
      await expect(
        travelService.askQuestion(mockTravelQuestionRequest, clientIp, sessionId)
      ).rejects.toThrow('Rate limit exceeded. Please try again later.');
    });

    it('should handle AI service error', async () => {

      const aiError = new Error('AI service unavailable') as Error & { provider: string };
      aiError.provider = 'groq';
      
      mockedRateLimit.mockImplementation(async (_req, _res, next) => next());
      mockedAIService.processQuestion.mockRejectedValue(aiError);

      // Act & Assert
      await expect(
        travelService.askQuestion(mockTravelQuestionRequest, clientIp, sessionId)
      ).rejects.toThrow('AI service error: AI service unavailable');

      expect(mockedLogger.error).toHaveBeenCalledWith(
        'Failed to process travel question',
        expect.objectContaining({
          error: 'AI service unavailable',
          clientIp,
          model: mockTravelQuestionRequest.model
        })
      );
    });

    it('should handle database error', async () => {

      const dbError = new Error('Database connection failed');
      mockedRateLimit.mockImplementation(async (_req, _res, next) => next());
      mockedAIService.processQuestion.mockResolvedValue(mockAIServiceResponse);
      mockedTravelQuestionsModel.create.mockRejectedValue(dbError);

      // Act & Assert
      await expect(
        travelService.askQuestion(mockTravelQuestionRequest, clientIp, sessionId)
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('getQuestionById', () => {
    it('should return a specific travel question', async () => {

      mockedTravelQuestionsModel.findById.mockResolvedValue(mockTravelQuestion);


      const result = await travelService.getQuestionById(1);


      expect(result).toEqual(mockTravelQuestionResponse);
      expect(mockedTravelQuestionsModel.findById).toHaveBeenCalledWith(1);
    });

    it('should return null when question not found', async () => {

      mockedTravelQuestionsModel.findById.mockResolvedValue(null);


      const result = await travelService.getQuestionById(999);


      expect(result).toBeNull();
      expect(mockedTravelQuestionsModel.findById).toHaveBeenCalledWith(999);
    });

    it('should handle database error', async () => {

      const dbError = new Error('Database error');
      mockedTravelQuestionsModel.findById.mockRejectedValue(dbError);

      // Act & Assert
      await expect(travelService.getQuestionById(1)).rejects.toThrow('Database error');
      expect(mockedLogger.error).toHaveBeenCalledWith(
        'Failed to get travel question by ID',
        expect.objectContaining({
          error: 'Database error',
          id: 1
        })
      );
    });
  });

  describe('getRecentQuestions', () => {
    it('should return recent questions with pagination', async () => {

      const mockResult = {
        questions: mockTravelQuestionsList,
        total: mockTravelQuestionsList.length
      };
      mockedTravelQuestionsModel.findRecent.mockResolvedValue(mockResult);


      const result = await travelService.getRecentQuestions(10, 0);


      expect(result).toEqual({
        questions: mockTravelQuestionsList.map(q => ({
          id: q.id,
          question: q.question,
          response: q.response,
          model_used: q.model_used,
          created_at: q.created_at.toISOString()
        })),
        total: mockTravelQuestionsList.length,
        limit: 10,
        offset: 0
      });
      expect(mockedTravelQuestionsModel.findRecent).toHaveBeenCalledWith(10, 0);
    });

    it('should use default pagination values', async () => {

      const mockResult = {
        questions: mockTravelQuestionsList,
        total: mockTravelQuestionsList.length
      };
      mockedTravelQuestionsModel.findRecent.mockResolvedValue(mockResult);


      await travelService.getRecentQuestions();


      expect(mockedTravelQuestionsModel.findRecent).toHaveBeenCalledWith(10, 0);
    });
  });

  describe('getQuestionsByClientIp', () => {
    it('should return questions for a specific client IP', async () => {

      mockedTravelQuestionsModel.findByClientIp.mockResolvedValue(mockTravelQuestionsList);


      const result = await travelService.getQuestionsByClientIp(clientIp, 5, 0);


      expect(result).toHaveLength(mockTravelQuestionsList.length);
      expect(mockedTravelQuestionsModel.findByClientIp).toHaveBeenCalledWith(clientIp, 5, 0);
    });
  });

  describe('getQuestionsBySessionId', () => {
    it('should return questions for a specific session', async () => {

      mockedTravelQuestionsModel.findBySessionId.mockResolvedValue(mockTravelQuestionsList);


      const result = await travelService.getQuestionsBySessionId(sessionId);


      expect(result).toHaveLength(mockTravelQuestionsList.length);
      expect(mockedTravelQuestionsModel.findBySessionId).toHaveBeenCalledWith(sessionId);
    });
  });

  describe('getStats', () => {
    it('should return travel questions statistics', async () => {

      mockedTravelQuestionsModel.getStats.mockResolvedValue(mockTravelStats);


      const result = await travelService.getStats();


      expect(result).toEqual(mockTravelStats);
      expect(mockedTravelQuestionsModel.getStats).toHaveBeenCalled();
    });
  });

  describe('checkModelHealth', () => {
    it('should return health status for all models', async () => {

      const mockHealthCheck = {
        groq: { status: 'healthy' as const },
        gemini: { status: 'healthy' as const }
      };
      const mockModelInfo = {
        groq: { model: 'llama-3.1-8b-instant', available: true },
        gemini: { model: 'gemini-1.5-pro', available: true }
      };
      
      mockedAIService.healthCheck.mockResolvedValue(mockHealthCheck);
      mockedAIService.getModelInfo.mockReturnValue(mockModelInfo);


      const result = await travelService.checkModelHealth();


      expect(result).toEqual(mockModelHealth);
      expect(mockedAIService.healthCheck).toHaveBeenCalled();
      expect(mockedAIService.getModelInfo).toHaveBeenCalled();
    });

    it('should handle health check failures', async () => {

      const healthError = new Error('Health check failed');
      mockedAIService.healthCheck.mockRejectedValue(healthError);


      const result = await travelService.checkModelHealth();


      expect(result.overall).toBe('unhealthy');
      expect(result.groq.status).toBe('unhealthy');
      expect(result.gemini.status).toBe('unhealthy');
      expect(mockedLogger.error).toHaveBeenCalledWith(
        'Failed to check model health',
        expect.objectContaining({
          error: 'Health check failed'
        })
      );
    });
  });

  describe('validateModel', () => {
    it('should validate groq model availability', () => {

      const mockModelInfo = {
        groq: { model: 'llama-3.1-8b-instant', available: true },
        gemini: { model: 'gemini-1.5-pro', available: false }
      };
      mockedAIService.getModelInfo.mockReturnValue(mockModelInfo);


      const isGroqValid = travelService.validateModel('groq');
      const isGeminiValid = travelService.validateModel('gemini');


      expect(isGroqValid).toBe(true);
      expect(isGeminiValid).toBe(false);
    });
  });

  describe('getPreferredModel', () => {
    it('should return groq as preferred model when available', () => {

      const mockModelInfo = {
        groq: { model: 'llama-3.1-8b-instant', available: true },
        gemini: { model: 'gemini-1.5-pro', available: true }
      };
      mockedAIService.getModelInfo.mockReturnValue(mockModelInfo);


      const preferredModel = travelService.getPreferredModel();


      expect(preferredModel).toBe('groq');
    });

    it('should return gemini when groq is unavailable', () => {

      const mockModelInfo = {
        groq: { model: 'llama-3.1-8b-instant', available: false },
        gemini: { model: 'gemini-1.5-pro', available: true }
      };
      mockedAIService.getModelInfo.mockReturnValue(mockModelInfo);


      const preferredModel = travelService.getPreferredModel();


      expect(preferredModel).toBe('gemini');
    });

    it('should return null when no models are available', () => {

      const mockModelInfo = {
        groq: { model: 'llama-3.1-8b-instant', available: false },
        gemini: { model: 'gemini-1.5-pro', available: false }
      };
      mockedAIService.getModelInfo.mockReturnValue(mockModelInfo);


      const preferredModel = travelService.getPreferredModel();


      expect(preferredModel).toBeNull();
    });
  });

  describe('cleanupOldQuestions', () => {
    it('should cleanup old questions successfully', async () => {

      const deletedCount = 15;
      mockedTravelQuestionsModel.deleteOlderThan.mockResolvedValue(deletedCount);


      const result = await travelService.cleanupOldQuestions(30);


      expect(result).toBe(deletedCount);
      expect(mockedTravelQuestionsModel.deleteOlderThan).toHaveBeenCalledWith(30);
      expect(mockedLogger.info).toHaveBeenCalledWith(
        'Old travel questions cleaned up',
        expect.objectContaining({
          deletedCount,
          olderThanDays: 30
        })
      );
    });

    it('should handle cleanup errors', async () => {

      const cleanupError = new Error('Cleanup failed');
      mockedTravelQuestionsModel.deleteOlderThan.mockRejectedValue(cleanupError);

      // Act & Assert
      await expect(travelService.cleanupOldQuestions(30)).rejects.toThrow('Cleanup failed');
      expect(mockedLogger.error).toHaveBeenCalledWith(
        'Failed to cleanup old travel questions',
        expect.objectContaining({
          error: 'Cleanup failed',
          olderThanDays: 30
        })
      );
    });
  });
});
