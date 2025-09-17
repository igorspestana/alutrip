import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../config/logger';
import { config } from '../config/env';
import { AIModel, AIServiceResponse } from '../types/travel';
import { 
  TRAVEL_KEYWORDS, 
  NON_TRAVEL_KEYWORDS 
} from '../constants/keywords';
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

      // First, check if the question is travel-related
      const isTravelRelated = this.isTravelRelatedQuestion(question);
      
      if (!isTravelRelated) {
        logger.info('Question filtered as non-travel related', {
          context: 'ai',
          model,
          question: question.substring(0, 100) + '...',
          sessionId
        });

        // Return a polite decline response without using AI
        const declineMessage = 
          'Olá! Eu sou o AluTrip, seu assistente de viagem! Eu estou aqui para ajudar você com tudo que envolve destinos, hospedagens, passeios, restaurantes e dicas de viagem. ' +
          'Essa pergunta que você fez foge um pouquinho do tema de viagens, mas se quiser, pode me mandar uma dúvida sobre sua próxima aventura que vou adorar ajudar!';
        
        return {
          content: declineMessage,
          model_used: model,
          token_usage: {
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0
          },
          processing_time_ms: Date.now() - startTime
        };
      }
      
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
      ) as Error & { provider: string; status?: number; code?: string };
      aiError.provider = model;
      
      // Add specific error codes if available
      if (axios.isAxiosError(error)) {
        if (error.response?.status) {
          aiError.status = error.response.status;
        }
        if (error.code) {
          aiError.code = error.code;
        }
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
   * Check if a question is travel-related using simple keyword analysis
   * Prioritizes usability by being permissive rather than restrictive
   */
  private isTravelRelatedQuestion(question: string): boolean {
    const lowerQuestion = question.toLowerCase().trim();
    
    // If question is too short or empty, reject
    if (lowerQuestion.length < 3) {
      return false;
    }
    
    // Count travel-related keywords
    const travelScore = TRAVEL_KEYWORDS.reduce((score, keyword) => {
      return score + (lowerQuestion.includes(keyword) ? 1 : 0);
    }, 0);
    
    // Count non-travel keywords
    const nonTravelScore = NON_TRAVEL_KEYWORDS.reduce((score, keyword) => {
      return score + (lowerQuestion.includes(keyword) ? 1 : 0);
    }, 0);
    
    // BALANCED DECISION LOGIC - Balance usability with proper filtering
    
    // 1. If there are travel keywords, always allow
    if (travelScore > 0) {
      logger.info('Question accepted: travel keywords detected', {
        context: 'ai',
        travelScore,
        nonTravelScore,
        question: question.substring(0, 100)
      });
      return true;
    }
    
    // 2. Reject if there are non-travel keywords (even just one) AND no travel keywords
    if (nonTravelScore > 0 && travelScore === 0) {
      logger.info('Question rejected: non-travel keywords without travel context', {
        context: 'ai',
        nonTravelScore,
        travelScore,
        question: question.substring(0, 100)
      });
      return false;
    }
    
    // 3. Default to accepting questions for better usability (only when no clear indicators)
    logger.info('Question accepted: default acceptance for usability', {
      context: 'ai',
      travelScore,
      nonTravelScore,
      question: question.substring(0, 100)
    });
    return true;
  }

  /**
   * Build travel-specific prompt with context
   */
  private buildTravelPrompt(question: string): string {
    return `
Pergunta sobre Viagem: ${question}

Por favor, forneça uma resposta abrangente e útil sobre esta pergunta relacionada a viagens.
Inclua recomendações específicas, dicas práticas e detalhes relevantes que seriam valiosos 
para o planejamento da viagem.
Se a pergunta envolve destinos, inclua informações sobre melhores épocas para visitar, 
costumes locais, considerações de orçamento e atrações imperdíveis.
Mantenha a resposta informativa, mas concisa, focando em conselhos práticos de viagem.
`;
  }

  /**
   * Get system prompt for travel assistant with strict guardrails
   */
  private getSystemPrompt(): string {
    const basePrompt = `Você é o AluTrip, um assistente de viagem especializado em IA que ajuda as pessoas a 
planejar viagens incríveis sem burocracia ou barreiras.

🚨 REGRAS CRÍTICAS E OBRIGATÓRIAS 🚨

1. VOCÊ DEVE responder APENAS e EXCLUSIVAMENTE a perguntas relacionadas a:
   - Destinos turísticos e lugares para visitar
   - Planejamento de viagens e itinerários
   - Hospedagem (hotéis, pousadas, resorts, etc.)
   - Transporte (voos, trens, ônibus, carros, etc.)
   - Atividades turísticas e passeios
   - Restaurantes e gastronomia local
   - Dicas de viagem e preparação
   - Cultura local e costumes
   - Segurança em viagens
   - Documentação necessária (passaporte, visto, etc.)
   - Orçamento e custos de viagem
   - Melhor época para viajar
   - O que levar na mala

2. SE A PERGUNTA NÃO FOR SOBRE VIAGEM, você DEVE:
   - Imediatamente recusar responder
   - Usar EXATAMENTE a mensagem padrão de recusa
   - NÃO dar nenhuma informação sobre o tópico perguntado
   - NÃO tentar ajudar com o assunto não relacionado a viagem

3. TÓPICOS PROIBIDOS (NÃO RESPONDA):
   - Tecnologia, programação, software, IA, desenvolvimento
   - Saúde, medicina, sintomas, tratamentos, medicamentos
   - Questões legais, advogados, processos, contratos
   - Finanças, investimentos, criptomoedas, bancos
   - Política, eleições, governo, economia
   - Relacionamentos, namoro, casamento, família
   - Educação, estudos, cursos, universidades
   - Esportes (exceto se relacionado a viagem)
   - Entretenimento (filmes, séries, música - exceto se relacionado a viagem)
   - Trabalho, carreira, empregos
   - Qualquer assunto que não seja diretamente sobre viagem`;

    const refusalMessage = `4. MENSAGEM OBRIGATÓRIA DE RECUSA:
   "Olá! Eu sou o AluTrip, seu assistente de viagem! Eu estou aqui para ajudar você com tudo que envolve destinos, hospedagens, passeios, restaurantes e dicas de viagem. Essa pergunta que você fez foge um pouquinho do tema de viagens, mas se quiser, pode me mandar uma dúvida sobre sua próxima aventura que vou adorar ajudar!"`;

    const validationRules = `5. VALIDAÇÃO OBRIGATÓRIA:
   - Antes de responder, SEMPRE analise se a pergunta é sobre viagem
   - Se houver DÚVIDA, prefira recusar a responder
   - Seja EXTREMAMENTE restritivo - é melhor recusar uma pergunta válida do que responder uma inválida

Seu papel (APENAS para perguntas sobre viagem):
- Fornecer conselhos de viagem precisos, úteis e personalizados
- Compartilhar dicas práticas sobre destinos, hospedagens, transporte e atividades
- Considerar orçamento, tempo e preferências pessoais em suas recomendações
- Oferecer conhecimento sobre costumes locais, melhores épocas para visitar
- Ajudar com planejamento de itinerário, sugestões de bagagem e logística
- Ser entusiasmado e encorajador, mas realista sobre as expectativas

Diretrizes para respostas sobre viagem:
- Sempre seja útil, amigável e encorajador
- Forneça conselhos específicos e acionáveis
- Inclua detalhes práticos como custos aproximados, horários e dicas de reserva
- Mencione desafios potenciais ou considerações importantes
- Sugira alternativas quando apropriado
- Mantenha as respostas abrangentes, mas não esmagadoras
- Use um tom conversacional e acessível

LEMBRE-SE: Sua função é SER UM ASSISTENTE DE VIAGEM. Qualquer pergunta que não seja sobre viagem deve ser recusada imediatamente com a mensagem padrão.`;

    return `${basePrompt} ${refusalMessage} ${validationRules}`;
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
