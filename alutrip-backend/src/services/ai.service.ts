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
    this.groqClient = new Groq({
      apiKey: config.GROQ_API_KEY,
    });
    
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

      const isTravelRelated = this.isTravelRelatedQuestion(question);
      
      if (!isTravelRelated) {
        logger.info('Question filtered as non-travel related', {
          context: 'ai',
          model,
          question: question.substring(0, 100) + '...',
          sessionId
        });

        const declineMessage = 
          'Olá! Eu sou o AluTrip, seu assistente de viagem! Eu estou aqui para ajudar você com tudo que envolve ' +
          'destinos, hospedagens, passeios, restaurantes e dicas de viagem. Essa pergunta que você fez foge um pouquinho ' +
          'do tema de viagens, mas se quiser, pode me mandar uma dúvida sobre sua próxima aventura que vou adorar ajudar!';
        
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
      
      const aiError = new Error(
        `Failed to process question with ${model}: ${(error as Error).message}`
      ) as Error & { provider: string; status?: number; code?: string };
      aiError.provider = model;
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
   * Process itinerary request using the specified AI model
   */
  async processItineraryRequest(
    prompt: string,
    model: AIModel,
    sessionId?: string
  ): Promise<AIServiceResponse> {
    const startTime = Date.now();
    
    try {
      logger.info('Starting AI itinerary processing', {
        context: 'ai',
        model,
        promptLength: prompt.length,
        sessionId
      });
      
      let response: AIServiceResponse;
      
      switch (model) {
      case 'groq':
        response = await this.processItineraryWithGroq(prompt, sessionId);
        break;
      case 'gemini':
        response = await this.processItineraryWithGemini(prompt, sessionId);
        break;
      default:
        throw new Error(`Unsupported AI model: ${model}`);
      }
      
      const totalTime = Date.now() - startTime;
      
      logger.info('AI itinerary processing completed', {
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
      
      logger.error('AI itinerary processing failed', {
        context: 'ai',
        model,
        error: (error as Error).message,
        processingTime: `${totalTime}ms`,
        sessionId
      });
      
      const aiError = new Error(
        `Failed to process itinerary with ${model}: ${(error as Error).message}`
      ) as Error & { provider: string; status?: number; code?: string };
      aiError.provider = model;
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
        max_tokens: 2048,
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
        processing_time_ms: 0
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
   * Process itinerary request using Groq (Llama model)
   */
  private async processItineraryWithGroq(prompt: string, sessionId?: string): Promise<AIServiceResponse> {
    try {
      const chatCompletion = await this.groqClient.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: this.getItinerarySystemPrompt()
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        model: config.GROQ_MODEL,
        temperature: 0.8,
        max_tokens: 8192,
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
        processing_time_ms: 0
      };
      
    } catch (error) {
      logger.error('Groq itinerary processing failed', {
        context: 'ai',
        error: (error as Error).message,
        sessionId
      });
      throw error;
    }
  }

  /**
   * Process itinerary request using Google Gemini
   */
  private async processItineraryWithGemini(prompt: string, sessionId?: string): Promise<AIServiceResponse> {
    try {
      const model = this.geminiAI.getGenerativeModel({ 
        model: config.GEMINI_MODEL,
        generationConfig: {
          maxOutputTokens: 8192,
        }
      });
      
      const fullPrompt = `${this.getItinerarySystemPrompt()}\n\n${prompt}`;
      
      const result = await model.generateContent(fullPrompt);
      const response = await result.response;
      const text = response.text();
      
      if (!text.trim()) {
        throw new Error('Empty response from Gemini API');
      }

      return {
        content: text.trim(),
        model_used: 'gemini',
        token_usage: {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0
        },
        processing_time_ms: 0
      };
      
    } catch (error) {
      logger.error('Gemini itinerary processing failed', {
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
      const model = this.geminiAI.getGenerativeModel({ 
        model: config.GEMINI_MODEL,
        generationConfig: {
          maxOutputTokens: 2048,
        }
      });
      
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
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0
        },
        processing_time_ms: 0
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
    
    if (lowerQuestion.length < 3) {
      return false;
    }
    
    const travelScore = TRAVEL_KEYWORDS.reduce((score, keyword) => {
      return score + (lowerQuestion.includes(keyword) ? 1 : 0);
    }, 0);
    
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
   'Olá! Eu sou o AluTrip, seu assistente de viagem! Eu estou aqui para ajudar você com tudo que envolve destinos, hospedagens, ` +
   `passeios, restaurantes e dicas de viagem. Essa pergunta que você fez foge um pouquinho do tema de viagens, mas se quiser, ` +
   `pode me mandar uma dúvida sobre sua próxima aventura que vou adorar ajudar!'`;

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

LEMBRE-SE: Sua função é SER UM ASSISTENTE DE VIAGEM. Qualquer pergunta que não seja sobre viagem ` +
      'deve ser recusada imediatamente com a mensagem padrão.';

    return `${basePrompt} ${refusalMessage} ${validationRules}`;
  }

  /**
   * Get system prompt specifically for itinerary generation
   */
  private getItinerarySystemPrompt(): string {
    return `Você é o AluTrip, um especialista em planejamento de viagens que cria roteiros detalhados e personalizados.

🎯 SEU PAPEL:
- Você é um planejador de viagens experiente e especializado
- Crie roteiros detalhados, práticos e inspiradores
- Considere sempre o orçamento, preferências e estilo de viagem do usuário
- Forneça informações precisas e atualizadas sobre destinos

📋 DIRETRIZES PARA ROTEIROS:

1. **ESTRUTURA OBRIGATÓRIA:**
   - Introdução ao destino
   - Informações práticas (documentação, moeda, transporte)
   - Roteiro diário detalhado com horários específicos
   - Sugestões de hospedagem com diferentes faixas de preço
   - Orçamento estimado por categoria
   - Dicas extras e informações práticas

2. **FORMATO DIÁRIO:**
   - Manhã (9h-12h): Atividade principal
   - Almoço (12h-14h): Sugestão de restaurante
   - Tarde (14h-18h): Atividade secundária
   - Jantar (19h-21h): Sugestão de restaurante
   - Noite (21h+): Atividade noturna ou descanso

3. **INFORMAÇÕES ESSENCIAIS:**
   - Nomes específicos de restaurantes, atrações e locais
   - Preços aproximados em USD
   - Tempo necessário para cada atividade
   - Como chegar entre os locais
   - Horários de funcionamento

4. **PERSONALIZAÇÃO:**
   - Adapte ao orçamento informado
   - Considere os interesses específicos
   - Respeite o estilo de viagem (econômico, intermediário, luxo)
   - Inclua pelo menos uma atividade gratuita por dia

5. **TOM E ESTILO:**
   - Use um tom entusiasmado e inspirador
   - Seja específico e prático
   - Inclua dicas valiosas de insider
   - Mantenha o foco na experiência do usuário

🚨 IMPORTANTE:
- Sempre considere as datas específicas para eventos sazonais
- Inclua tempo realista para deslocamentos
- Forneça alternativas para dias de chuva (se aplicável)
- Mencione aspectos culturais e etiqueta local quando relevante

Seu objetivo é criar um roteiro completo que torne a viagem inesquecível e bem organizada!`;
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

export const aiService = new AIService();
