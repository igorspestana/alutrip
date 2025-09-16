import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../config/logger';
import { config } from '../config/env';
import { AIModel, AIServiceResponse } from '../types/travel';
import axios from 'axios';

/**
 * AI Service for integrating with multiple providers (Groq and Gemini)
 * Handles travel-related question processing and response generation
 */
export class AIService {
  private groqClient: Groq;
  private geminiAI: GoogleGenerativeAI;
  
  constructor() {
    // Initialize Groq SDK
    this.groqClient = new Groq({
      apiKey: config.GROQ_API_KEY,
    });
    
    // Initialize Gemini AI
    this.geminiAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
  }

  /**
   * Process a travel question using the specified AI model
   */
  async processQuestion(
    question: string, 
    model: AIModel,
    sessionId?: string
  ): Promise<AIServiceResponse> {
    const startTime = Date.now();
    
    try {
      logger.info('Starting AI question processing', {
        context: 'ai',
        model,
        questionLength: question.length,
        sessionId
      });
      
      let response: AIServiceResponse;
      
      switch (model) {
        case 'groq':
          response = await this.processWithGroq(question, sessionId);
          break;
        case 'gemini':
          response = await this.processWithGemini(question, sessionId);
          break;
        default:
          throw new Error(`Unsupported AI model: ${model}`);
      }
      
      const totalTime = Date.now() - startTime;
      
      logger.info('AI question processing completed', {
        context: 'ai',
        model,
        processingTime: `${totalTime}ms`,
        responseLength: response.content.length,
        sessionId
      });
      
      return {
        ...response,
        processing_time_ms: totalTime
      };
      
    } catch (error) {
      const totalTime = Date.now() - startTime;
      
      logger.error('AI question processing failed', {
        context: 'ai',
        model,
        error: (error as Error).message,
        processingTime: `${totalTime}ms`,
        sessionId
      });
      
      // Create AI service specific error
      const aiError = new Error(
        `Failed to process question with ${model}: ${(error as Error).message}`
      ) as any;
      aiError.provider = model;
      
      // Add specific error codes if available
      if (axios.isAxiosError(error)) {
        aiError.status = error.response?.status;
        aiError.code = error.code;
      }
      
      throw aiError;
    }
  }

  /**
   * Process question using Groq (Llama model)
   */
  private async processWithGroq(question: string, sessionId?: string): Promise<AIServiceResponse> {
    try {
      const prompt = this.buildTravelPrompt(question);
      
      const chatCompletion = await this.groqClient.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt()
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        model: config.GROQ_MODEL,
        temperature: 0.7,
        max_tokens: 1024,
        top_p: 1,
        stream: false,
        stop: null
      });

      const response = chatCompletion.choices[0]?.message?.content || '';
      
      if (!response.trim()) {
        throw new Error('Empty response from Groq API');
      }

      return {
        content: response.trim(),
        model_used: 'groq',
        token_usage: chatCompletion.usage ? {
          prompt_tokens: chatCompletion.usage.prompt_tokens || 0,
          completion_tokens: chatCompletion.usage.completion_tokens || 0,
          total_tokens: chatCompletion.usage.total_tokens || 0
        } : {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0
        },
        processing_time_ms: 0 // Will be set by parent method
      };
      
    } catch (error) {
      logger.error('Groq processing failed', {
        context: 'ai',
        error: (error as Error).message,
        sessionId
      });
      throw error;
    }
  }

  /**
   * Process question using Google Gemini
   */
  private async processWithGemini(question: string, sessionId?: string): Promise<AIServiceResponse> {
    try {
      const model = this.geminiAI.getGenerativeModel({ model: config.GEMINI_MODEL });
      
      const prompt = `${this.getSystemPrompt()}\n\nUser Question: ${this.buildTravelPrompt(question)}`;
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      if (!text.trim()) {
        throw new Error('Empty response from Gemini API');
      }

      return {
        content: text.trim(),
        model_used: 'gemini',
        token_usage: {
          prompt_tokens: 0, // Gemini doesn't provide token usage details in current SDK
          completion_tokens: 0,
          total_tokens: 0
        },
        processing_time_ms: 0 // Will be set by parent method
      };
      
    } catch (error) {
      logger.error('Gemini processing failed', {
        context: 'ai',
        error: (error as Error).message,
        sessionId
      });
      throw error;
    }
  }

  /**
   * Build travel-specific prompt with context
   */
  private buildTravelPrompt(question: string): string {
    return `
Travel Question: ${question}

Please provide a comprehensive and helpful response about this travel-related question.
Include specific recommendations, practical tips, and relevant details that would be valuable for trip planning.
If the question involves destinations, include information about best times to visit, local customs, budget considerations, and must-see attractions.
Keep the response informative yet concise, focusing on actionable travel advice.
`;
  }

  /**
   * Get system prompt for travel assistant
   */
  private getSystemPrompt(): string {
    return `You are AluTrip, an expert travel assistant AI that helps people plan amazing trips without any bureaucracy or barriers.

Your role:
- Provide accurate, helpful, and personalized travel advice
- Share practical tips about destinations, accommodations, transportation, and activities
- Consider budget, time, and personal preferences in your recommendations
- Offer insider knowledge about local customs, best times to visit, and hidden gems
- Help with itinerary planning, packing suggestions, and travel logistics
- Be enthusiastic and encouraging while being realistic about expectations

Guidelines:
- Always be helpful, friendly, and encouraging
- Provide specific, actionable advice rather than generic responses
- Include practical details like approximate costs, timing, and booking tips
- Mention potential challenges or considerations travelers should know
- Suggest alternatives when appropriate
- Keep responses comprehensive but not overwhelming
- Use a conversational, approachable tone

Focus areas: destination guides, trip planning, budget travel, luxury travel, solo travel, family travel, adventure travel, cultural experiences, food and dining, accommodation advice, transportation options, travel safety, and local customs.`;
  }

  /**
   * Health check for AI services
   */
  async healthCheck(): Promise<{
    groq: { status: 'healthy' | 'unhealthy'; error?: string };
    gemini: { status: 'healthy' | 'unhealthy'; error?: string };
  }> {
    const results: {
      groq: { status: 'healthy' | 'unhealthy'; error?: string };
      gemini: { status: 'healthy' | 'unhealthy'; error?: string };
    } = {
      groq: { status: 'unhealthy' },
      gemini: { status: 'unhealthy' }
    };

    // Test Groq
    try {
      await this.groqClient.chat.completions.create({
        messages: [{ role: 'user', content: 'Hello' }],
        model: config.GROQ_MODEL,
        max_tokens: 5
      });
      results.groq.status = 'healthy';
    } catch (error) {
      results.groq.error = (error as Error).message;
    }

    // Test Gemini
    try {
      const model = this.geminiAI.getGenerativeModel({ model: config.GEMINI_MODEL });
      await model.generateContent('Hello');
      results.gemini.status = 'healthy';
    } catch (error) {
      results.gemini.error = (error as Error).message;
    }

    return results;
  }

  /**
   * Get model availability and configuration
   */
  getModelInfo(): {
    groq: { model: string; available: boolean };
    gemini: { model: string; available: boolean };
  } {
    return {
      groq: {
        model: config.GROQ_MODEL,
        available: !config.GROQ_API_KEY.includes('your-groq-api-key')
      },
      gemini: {
        model: config.GEMINI_MODEL,
        available: !config.GEMINI_API_KEY.includes('your-gemini-api-key')
      }
    };
  }
}

// Export singleton instance
export const aiService = new AIService();
