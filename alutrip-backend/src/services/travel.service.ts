import { aiService } from './ai.service';
import { TravelQuestionsModel } from '../models/travel-questions.model';
import { travelQuestionsRateLimit } from '../middleware/rate-limit';
import { logger } from '../config/logger';
import { 
  AIModel, 
  TravelQuestion, 
  TravelQuestionRequest, 
  TravelQuestionResponse
} from '../types/travel';

/**
 * Travel Service for handling travel question business logic
 * Integrates AI processing with rate limiting and data persistence
 */
export class TravelService {
  
  /**
   * Process a travel question with AI and store the result
   */
  async askQuestion(
    request: TravelQuestionRequest,
    clientIp: string,
    sessionId?: string
  ): Promise<TravelQuestionResponse> {
    const { question, model } = request;
    
    try {
      logger.info('Processing travel question', {
        clientIp,
        model,
        questionLength: question.length,
        sessionId
      });

      // Check rate limiting first
      await this.checkRateLimit(clientIp);

      // Process question with AI
      const aiResponse = await aiService.processQuestion(question, model, sessionId);
      
      // Store in database
      const travelQuestion = await TravelQuestionsModel.create(
        clientIp,
        question,
        aiResponse.content,
        model,
        sessionId
      );

      // Log successful processing
      logger.info('Travel question processed successfully', {
        questionId: travelQuestion.id,
        clientIp,
        model,
        processingTime: `${aiResponse.processing_time_ms}ms`,
        responseLength: aiResponse.content.length,
        sessionId
      });

      // Return formatted response
      return this.formatQuestionResponse(travelQuestion);

    } catch (error) {
      logger.error('Failed to process travel question', {
        error: (error as Error).message,
        clientIp,
        model,
        questionLength: question.length,
        sessionId
      });

      // Re-throw with appropriate error handling
      if ((error as any).provider) {
        throw new Error(`AI service error: ${(error as Error).message}`);
      }
      
      throw error;
    }
  }

  /**
   * Get a specific travel question by ID
   */
  async getQuestionById(id: number): Promise<TravelQuestionResponse | null> {
    try {
      const question = await TravelQuestionsModel.findById(id);
      
      if (!question) {
        return null;
      }

      return this.formatQuestionResponse(question);
      
    } catch (error) {
      logger.error('Failed to get travel question by ID', {
        error: (error as Error).message,
        id
      });
      throw error;
    }
  }

  /**
   * Get recent travel questions with pagination
   */
  async getRecentQuestions(
    limit: number = 10,
    offset: number = 0
  ): Promise<{
    questions: TravelQuestionResponse[];
    total: number;
    limit: number;
    offset: number;
  }> {
    try {
      const result = await TravelQuestionsModel.findRecent(limit, offset);
      
      return {
        questions: result.questions.map(q => this.formatQuestionResponse(q)),
        total: result.total,
        limit,
        offset
      };
      
    } catch (error) {
      logger.error('Failed to get recent travel questions', {
        error: (error as Error).message,
        limit,
        offset
      });
      throw error;
    }
  }

  /**
   * Get questions by client IP (for analytics)
   */
  async getQuestionsByClientIp(
    clientIp: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<TravelQuestionResponse[]> {
    try {
      const questions = await TravelQuestionsModel.findByClientIp(clientIp, limit, offset);
      
      return questions.map(q => this.formatQuestionResponse(q));
      
    } catch (error) {
      logger.error('Failed to get travel questions by client IP', {
        error: (error as Error).message,
        clientIp,
        limit,
        offset
      });
      throw error;
    }
  }

  /**
   * Get questions by session ID (for future chat support)
   */
  async getQuestionsBySessionId(sessionId: string): Promise<TravelQuestionResponse[]> {
    try {
      const questions = await TravelQuestionsModel.findBySessionId(sessionId);
      
      return questions.map(q => this.formatQuestionResponse(q));
      
    } catch (error) {
      logger.error('Failed to get travel questions by session ID', {
        error: (error as Error).message,
        sessionId
      });
      throw error;
    }
  }

  /**
   * Get travel questions statistics
   */
  async getStats(): Promise<{
    total: number;
    today: number;
    byModel: { groq: number; gemini: number };
    avgResponseLength: number;
  }> {
    try {
      return await TravelQuestionsModel.getStats();
      
    } catch (error) {
      logger.error('Failed to get travel questions stats', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Check if AI models are available and healthy
   */
  async checkModelHealth(): Promise<{
    groq: { status: 'healthy' | 'unhealthy'; error?: string; model: string; available: boolean };
    gemini: { status: 'healthy' | 'unhealthy'; error?: string; model: string; available: boolean };
    overall: 'healthy' | 'partial' | 'unhealthy';
  }> {
    try {
      const [healthCheck, modelInfo] = await Promise.all([
        aiService.healthCheck(),
        aiService.getModelInfo()
      ]);

      const groqHealth = {
        ...healthCheck.groq,
        ...modelInfo.groq
      };

      const geminiHealth = {
        ...healthCheck.gemini,
        ...modelInfo.gemini
      };

      // Determine overall health
      let overall: 'healthy' | 'partial' | 'unhealthy' = 'unhealthy';
      
      const healthyModels = [groqHealth, geminiHealth].filter(model => 
        model.status === 'healthy' && model.available
      );
      
      if (healthyModels.length === 2) {
        overall = 'healthy';
      } else if (healthyModels.length === 1) {
        overall = 'partial';
      }

      return {
        groq: groqHealth,
        gemini: geminiHealth,
        overall
      };

    } catch (error) {
      logger.error('Failed to check model health', {
        error: (error as Error).message
      });
      
      return {
        groq: { status: 'unhealthy', error: 'Health check failed', model: 'unknown', available: false },
        gemini: { status: 'unhealthy', error: 'Health check failed', model: 'unknown', available: false },
        overall: 'unhealthy'
      };
    }
  }

  /**
   * Validate if the specified model is available
   */
  validateModel(model: AIModel): boolean {
    const modelInfo = aiService.getModelInfo();
    
    switch (model) {
      case 'groq':
        return modelInfo.groq.available;
      case 'gemini':
        return modelInfo.gemini.available;
      default:
        return false;
    }
  }

  /**
   * Get preferred model based on availability
   */
  getPreferredModel(): AIModel | null {
    const modelInfo = aiService.getModelInfo();
    
    // Prefer Groq if available, fallback to Gemini
    if (modelInfo.groq.available) {
      return 'groq';
    } else if (modelInfo.gemini.available) {
      return 'gemini';
    }
    
    return null;
  }

  /**
   * Check rate limiting for travel questions
   */
  private async checkRateLimit(clientIp: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Use existing rate limit middleware
      const rateLimiter = travelQuestionsRateLimit;
      
      // Mock request/response objects for rate limiter
      const req: any = {
        ip: clientIp,
        headers: {},
        method: 'POST',
        path: '/api/travel/ask'
      };
      
      const res: any = {
        status: (code: number) => ({
          json: (_data: any) => {
            if (code === 429) {
              reject(new Error('Rate limit exceeded. Please try again later.'));
            }
          }
        }),
        set: () => {},
        get: () => undefined
      };
      
      rateLimiter(req, res, (err?: any) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Format travel question for API response
   */
  private formatQuestionResponse(question: TravelQuestion): TravelQuestionResponse {
    return {
      id: question.id,
      question: question.question,
      response: question.response,
      model_used: question.model_used,
      created_at: question.created_at.toISOString()
    };
  }

  /**
   * Clean up old questions (maintenance task)
   */
  async cleanupOldQuestions(olderThanDays: number = 30): Promise<number> {
    try {
      const deletedCount = await TravelQuestionsModel.deleteOlderThan(olderThanDays);
      
      logger.info('Old travel questions cleaned up', {
        deletedCount,
        olderThanDays
      });
      
      return deletedCount;
      
    } catch (error) {
      logger.error('Failed to cleanup old travel questions', {
        error: (error as Error).message,
        olderThanDays
      });
      throw error;
    }
  }
}

// Export singleton instance
export const travelService = new TravelService();
