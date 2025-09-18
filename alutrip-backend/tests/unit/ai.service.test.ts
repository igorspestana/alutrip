import { AIService } from '../../src/services/ai.service';
import { config } from '../../src/config/env';
import { logger } from '../../src/config/logger';
import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  mockGroqChatCompletion,
  mockGroqItineraryChatCompletion,
  mockGeminiResponse,
  mockGeminiItineraryResponse,
  mockNonTravelDeclineResponse,
  travelQuestions,
  nonTravelQuestions
} from '../fixtures/ai.fixtures';

// Mock dependencies
jest.mock('groq-sdk');
jest.mock('@google/generative-ai');
jest.mock('../../src/config/env');
jest.mock('../../src/config/logger');

const MockedGroq = Groq as jest.MockedClass<typeof Groq>;
const MockedGoogleGenerativeAI = GoogleGenerativeAI as jest.MockedClass<typeof GoogleGenerativeAI>;
const mockedLogger = logger as jest.Mocked<typeof logger>;

// Mock config values
const mockConfig = config as jest.Mocked<typeof config>;
(mockConfig as any).GROQ_API_KEY = 'test-groq-key';
(mockConfig as any).GROQ_MODEL = 'llama-3.1-8b-instant';
(mockConfig as any).GEMINI_API_KEY = 'test-gemini-key';
(mockConfig as any).GEMINI_MODEL = 'gemini-1.5-pro';

describe('AIService', () => {
  let aiService: AIService;
  let mockGroqClient: jest.Mocked<Groq>;
  let mockGeminiClient: any;
  let mockGeminiModel: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup Groq mock
    mockGroqClient = {
      chat: {
        completions: {
          create: jest.fn()
        }
      }
    } as any;
    MockedGroq.mockImplementation(() => mockGroqClient);

    // Setup Gemini mock
    mockGeminiModel = {
      generateContent: jest.fn()
    };
    mockGeminiClient = {
      getGenerativeModel: jest.fn().mockReturnValue(mockGeminiModel)
    };
    MockedGoogleGenerativeAI.mockImplementation(() => mockGeminiClient);

    aiService = new AIService();
  });

  describe('processQuestion', () => {
    const sessionId = 'test-session';

    describe('Travel-related questions', () => {
      it('should process travel question with Groq successfully', async () => {
        // Arrange
        (mockGroqClient.chat.completions.create as jest.Mock).mockResolvedValue(mockGroqChatCompletion);

        // Act
        const result = await aiService.processQuestion(travelQuestions[0]!!, 'groq', sessionId);

        // Assert
        expect(result.content).toBe(mockGroqChatCompletion.choices[0]?.message?.content);
        expect(result.model_used).toBe('groq');
        expect(result.token_usage?.total_tokens).toBe(225);
        expect(result.processing_time_ms).toBeGreaterThanOrEqual(0);
        expect(mockGroqClient.chat.completions.create).toHaveBeenCalledWith(expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'system' }),
            expect.objectContaining({ role: 'user' })
          ]),
          model: 'llama-3.1-8b-instant',
          temperature: 0.7,
          max_tokens: 2048,
          top_p: 1,
          stream: false,
          stop: null
        }));
      });

      it('should process travel question with Gemini successfully', async () => {
        // Arrange
        mockGeminiModel.generateContent.mockResolvedValue(mockGeminiResponse);

        // Act
        const result = await aiService.processQuestion(travelQuestions[1]!, 'gemini', sessionId);

        // Assert
        expect(result.content).toBe(mockGeminiResponse.response.text());
        expect(result.model_used).toBe('gemini');
        // processing_time_ms is computed in the public wrapper and may be 0 in tests
        expect(result.processing_time_ms).toBeGreaterThanOrEqual(0);
        expect(mockGeminiClient.getGenerativeModel).toHaveBeenCalledWith({
          model: 'gemini-1.5-pro',
          generationConfig: {
            maxOutputTokens: 2048
          }
        });
      });
    });

    describe('Non-travel questions', () => {
      it('should decline non-travel questions without calling AI APIs', async () => {
        // Act
        const result = await aiService.processQuestion(nonTravelQuestions[0]!, 'groq', sessionId);

        // Assert
        expect(result.content).toBe(mockNonTravelDeclineResponse.content);
        expect(result.token_usage?.total_tokens).toBe(0);
        expect(mockGroqClient.chat.completions.create).not.toHaveBeenCalled();
        expect(mockedLogger.info).toHaveBeenCalledWith(
          'Question filtered as non-travel related',
          expect.objectContaining({
            context: 'ai',
            model: 'groq'
          })
        );
      });
    });

    describe('Error handling', () => {
      it('should handle Groq API errors', async () => {
        // Arrange
        const groqError = new Error('Groq API rate limit exceeded');
        (mockGroqClient.chat.completions.create as jest.Mock).mockRejectedValue(groqError);

        // Act & Assert
        await expect(
          aiService.processQuestion(travelQuestions[0]!, 'groq', sessionId)
        ).rejects.toThrow('Failed to process question with groq: Groq API rate limit exceeded');

        expect(mockedLogger.error).toHaveBeenCalledWith(
          'AI question processing failed',
          expect.objectContaining({
            context: 'ai',
            model: 'groq',
            error: 'Groq API rate limit exceeded'
          })
        );
      });

      it('should handle Gemini API errors', async () => {
        // Arrange
        const geminiError = new Error('Gemini API timeout');
        mockGeminiModel.generateContent.mockRejectedValue(geminiError);

        // Act & Assert
        await expect(
          aiService.processQuestion(travelQuestions[0]!, 'gemini', sessionId)
        ).rejects.toThrow('Failed to process question with gemini: Gemini API timeout');
      });

      it('should handle empty responses from APIs', async () => {
        // Arrange - Groq empty response
        const emptyResponse = {
          ...mockGroqChatCompletion,
          choices: [{ message: { content: '' } }]
        };
        (mockGroqClient.chat.completions.create as jest.Mock).mockResolvedValue(emptyResponse);

        // Act & Assert
        await expect(
          aiService.processQuestion(travelQuestions[0]!, 'groq', sessionId)
        ).rejects.toThrow('Empty response from Groq API');
      });

      it('should handle unsupported models', async () => {
        // Act & Assert
        await expect(
          aiService.processQuestion(travelQuestions[0]!, 'unsupported' as any, sessionId)
        ).rejects.toThrow('Unsupported AI model: unsupported');
      });
    });
  });

  describe('processItineraryRequest', () => {
    const testPrompt = 'Create a 3-day itinerary for Paris with a budget of $1000';
    const sessionId = 'test-session';

    it('should process itinerary request with Groq successfully', async () => {
      // Arrange
      (mockGroqClient.chat.completions.create as jest.Mock).mockResolvedValue(mockGroqItineraryChatCompletion);

      // Act
      const result = await aiService.processItineraryRequest(testPrompt, 'groq', sessionId);

      // Assert
      expect(result.content).toContain('Paris, França');
      expect(result.model_used).toBe('groq');
      expect(mockGroqClient.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'system' }),
            expect.objectContaining({ role: 'user', content: testPrompt })
          ]),
          model: 'llama-3.1-8b-instant',
          temperature: 0.8, // Higher creativity for itineraries
          max_tokens: 8192
        }));
    });

    it('should process itinerary request with Gemini successfully', async () => {
      // Arrange
      mockGeminiModel.generateContent.mockResolvedValue(mockGeminiItineraryResponse);

      // Act
      const result = await aiService.processItineraryRequest(testPrompt, 'gemini', sessionId);

      // Assert
      expect(result.content).toContain('Paris');
      expect(result.model_used).toBe('gemini');
      expect(mockGeminiClient.getGenerativeModel).toHaveBeenCalledWith({
        model: 'gemini-1.5-pro',
        generationConfig: {
          maxOutputTokens: 8192
        }
      });
    });

    it('should handle itinerary processing errors', async () => {
      // Arrange
      const itineraryError = new Error('Itinerary generation failed');
      (mockGroqClient.chat.completions.create as jest.Mock).mockRejectedValue(itineraryError);

      // Act & Assert
      await expect(
        aiService.processItineraryRequest(testPrompt, 'groq', sessionId)
      ).rejects.toThrow('Failed to process itinerary with groq: Itinerary generation failed');
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status for all services', async () => {
      // Arrange
      (mockGroqClient.chat.completions.create as jest.Mock).mockResolvedValue({
        choices: [{ message: { content: 'Hello' } }]
      } as any);
      mockGeminiModel.generateContent.mockResolvedValue({
        response: { text: () => 'Hello' }
      });

      // Act
      const result = await aiService.healthCheck();

      // Assert
      expect(result.groq.status).toBe('healthy');
      expect(result.gemini.status).toBe('healthy');
      expect(mockGroqClient.chat.completions.create).toHaveBeenCalledWith(expect.objectContaining({
        messages: [{ role: 'user', content: 'Hello' }],
        model: 'llama-3.1-8b-instant',
        max_tokens: 5
      }));
    });

    it('should return unhealthy status when services fail', async () => {
      // Arrange
      (mockGroqClient.chat.completions.create as jest.Mock).mockRejectedValue(new Error('Connection failed'));
      mockGeminiModel.generateContent.mockRejectedValue(new Error('API key invalid'));

      // Act
      const result = await aiService.healthCheck();

      // Assert
      expect(result.groq.status).toBe('unhealthy');
      expect(result.groq.error).toBe('Connection failed');
      expect(result.gemini.status).toBe('unhealthy');
      expect(result.gemini.error).toBe('API key invalid');
    });

    it('should handle partial health check success', async () => {
      // Arrange
      (mockGroqClient.chat.completions.create as jest.Mock).mockResolvedValue({
        choices: [{ message: { content: 'Hello' } }]
      } as any);
      mockGeminiModel.generateContent.mockRejectedValue(new Error('Service unavailable'));

      // Act
      const result = await aiService.healthCheck();

      // Assert
      expect(result.groq.status).toBe('healthy');
      expect(result.gemini.status).toBe('unhealthy');
      expect(result.gemini.error).toBe('Service unavailable');
    });
  });

  describe('getModelInfo', () => {
    it('should return model information with availability', () => {
      // Act
      const result = aiService.getModelInfo();

      // Assert
      expect(result).toEqual({
        groq: {
          model: 'llama-3.1-8b-instant',
          available: true // test-groq-key doesn't contain 'your-groq-api-key'
        },
        gemini: {
          model: 'gemini-1.5-pro',
          available: true // test-gemini-key doesn't contain 'your-gemini-api-key'
        }
      });
    });

    it('should mark models as unavailable with default API keys', () => {
      // Arrange
      const originalConfig = { ...mockConfig };
      (mockConfig as any).GROQ_API_KEY = 'your-groq-api-key';
      (mockConfig as any).GEMINI_API_KEY = 'your-gemini-api-key';

      // Act
      const result = aiService.getModelInfo();

      // Assert
      expect(result.groq.available).toBe(false);
      expect(result.gemini.available).toBe(false);

      // Restore config
      Object.assign(mockConfig, originalConfig);
    });
  });

  describe('Travel question filtering', () => {
    it('should correctly identify travel-related questions', async () => {
      // Arrange
      (mockGroqClient.chat.completions.create as jest.Mock).mockResolvedValue(mockGroqChatCompletion);

      // Test all travel questions
      for (const question of travelQuestions) {
        // Act
        const result = await aiService.processQuestion(question, 'groq');

        // Assert
        expect(result.content).not.toBe(mockNonTravelDeclineResponse.content);
        expect(mockGroqClient.chat.completions.create).toHaveBeenCalled();
      }
    });

    it('should correctly reject non-travel questions', async () => {
      // Test all non-travel questions
      for (const question of nonTravelQuestions) {
        // Act
        const result = await aiService.processQuestion(question, 'groq');

        // Assert
        expect(result.content).toBe(mockNonTravelDeclineResponse.content);
        expect(result.token_usage?.total_tokens).toBe(0);
      }

      // Verify AI APIs were never called
      expect(mockGroqClient.chat.completions.create).not.toHaveBeenCalled();
    });

    it('should handle edge cases in question filtering', async () => {
      const edgeCases = [
        '', // Empty string
        '   ', // Whitespace only
        'hi', // Too short
        'travel programming vacation javascript' // Mixed keywords
      ];

      // Ensure Groq mock returns a valid completion when called
      (mockGroqClient.chat.completions.create as jest.Mock).mockResolvedValue(mockGroqChatCompletion);

      for (const question of edgeCases) {
        const result = await aiService.processQuestion(question, 'groq');
        if (question.trim().length < 3) {
          expect(result.content).toBe(mockNonTravelDeclineResponse.content);
        } else if (question.includes('travel')) {
          // Mixed keywords case should be accepted
          expect(result.content).toBe(mockGroqChatCompletion.choices[0]?.message?.content);
        }
      }
    });
  });
});
