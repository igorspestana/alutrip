import { logger } from '../config/logger';
import { ItinerariesModel } from '../models/itineraries.model';
import { aiService } from './ai.service';
import { pdfService } from './pdf.service';
import { 
  Itinerary, 
  ItineraryRequestData, 
  ProcessingStatus, 
  AIModel 
} from '../types/travel';

/**
 * Itinerary Service for handling travel itinerary generation and management
 * Integrates with AI services for content generation and PDF services for document creation
 */
export class ItineraryService {

  /**
   * Create a new itinerary request
   */
  static async createItinerary(
    clientIp: string,
    requestData: ItineraryRequestData,
    sessionId?: string
  ): Promise<Itinerary> {
    try {
      logger.info('Creating itinerary request', {
        clientIp,
        destination: requestData.destination,
        startDate: requestData.start_date,
        endDate: requestData.end_date
      });

      // Parse dates
      const startDate = new Date(requestData.start_date);
      const endDate = new Date(requestData.end_date);

      // Create itinerary record
      const itinerary = await ItinerariesModel.create(
        clientIp,
        requestData.destination,
        startDate,
        endDate,
        requestData,
        sessionId,
        requestData.budget,
        requestData.interests
      );

      logger.info('Itinerary request created successfully', {
        itineraryId: itinerary.id,
        destination: requestData.destination
      });

      return itinerary;

    } catch (error) {
      logger.error('Failed to create itinerary request', {
        error: (error as Error).message,
        clientIp,
        destination: requestData.destination
      });
      throw error;
    }
  }

  /**
   * Process itinerary generation (for background job)
   */
  static async processItinerary(itineraryId: number): Promise<void> {
    const startTime = Date.now();
    
    try {
      logger.info('Starting itinerary processing', {
        context: 'itinerary',
        itineraryId
      });

      // Get itinerary data
      const itinerary = await ItinerariesModel.findById(itineraryId);
      if (!itinerary) {
        throw new Error('Itinerary not found');
      }

      // Update status to processing
      await ItinerariesModel.updateStatus(itineraryId, 'processing');

      // Generate AI content
      const generatedContent = await this.generateItineraryContent(itinerary);

      // Determine which model was used (for now, default to groq)
      const modelUsed: AIModel = 'groq'; // This could be dynamic based on load or other factors

      // Generate PDF
      const pdfInfo = await pdfService.generateItineraryPDF(itinerary, generatedContent);

      // Update itinerary with generated content and PDF info
      await ItinerariesModel.updateContent(
        itineraryId,
        generatedContent,
        modelUsed,
        pdfInfo.filename,
        pdfInfo.filepath
      );

      // Update status to completed
      await ItinerariesModel.updateStatus(itineraryId, 'completed', new Date());

      const processingTime = Date.now() - startTime;

      logger.info('Itinerary processing completed successfully', {
        context: 'itinerary',
        itineraryId,
        processingTime: `${processingTime}ms`,
        contentLength: generatedContent.length,
        pdfFilename: pdfInfo.filename
      });

    } catch (error) {
      const processingTime = Date.now() - startTime;

      logger.error('Itinerary processing failed', {
        context: 'itinerary',
        itineraryId,
        error: (error as Error).message,
        processingTime: `${processingTime}ms`
      });

      // Update status to failed
      await ItinerariesModel.updateStatus(itineraryId, 'failed');

      throw error;
    }
  }

  /**
   * Generate itinerary content using AI
   */
  private static async generateItineraryContent(itinerary: Itinerary): Promise<string> {
    try {
      logger.info('Generating AI content for itinerary', {
        context: 'itinerary',
        itineraryId: itinerary.id,
        destination: itinerary.destination
      });

      // Build comprehensive prompt for itinerary generation
      const prompt = this.buildItineraryPrompt(itinerary);

      // Use AI service to generate content (using groq as primary)
      const aiResponse = await aiService.processItineraryRequest(prompt, 'groq');

      logger.info('AI content generated successfully', {
        context: 'itinerary',
        itineraryId: itinerary.id,
        contentLength: aiResponse.content.length,
        modelUsed: aiResponse.model_used
      });

      return aiResponse.content;

    } catch (error) {
      logger.error('Failed to generate AI content for itinerary', {
        context: 'itinerary',
        itineraryId: itinerary.id,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Build comprehensive prompt for itinerary generation
   */
  private static buildItineraryPrompt(itinerary: Itinerary): string {

    // Calculate trip duration
    const startDate = new Date(itinerary.start_date);
    const endDate = new Date(itinerary.end_date);
    const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    // Format dates
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    let prompt = `
Por favor, crie um roteiro detalhado de viagem com as seguintes informações:

🎯 INFORMAÇÕES DA VIAGEM:
- Destino: ${itinerary.destination}
- Data de início: ${formatDate(startDate)}
- Data de término: ${formatDate(endDate)}
- Duração: ${duration} dia${duration > 1 ? 's' : ''}`;

    if (itinerary.budget) {
      prompt += `\n- Orçamento: $${itinerary.budget.toLocaleString()} USD`;
    }

    if (itinerary.interests && itinerary.interests.length > 0) {
      prompt += `\n- Interesses específicos: ${itinerary.interests.join(', ')}`;
    }

    prompt += `

📋 ESTRUTURA OBRIGATÓRIA DO ROTEIRO:

1. **Introdução ao Destino**
   - Breve descrição do destino
   - Melhor época para visitar
   - Dicas climáticas para as datas da viagem

2. **Informações Práticas**
   - Documentação necessária
   - Moeda local e dicas de câmbio
   - Transporte no destino
   - Segurança e dicas importantes

3. **Roteiro Diário Detalhado**
   Para cada dia (Dia 1, Dia 2, etc.), inclua:
   - **Manhã (9h-12h):** Atividade principal, como chegar, tempo necessário
   - **Almoço (12h-14h):** Sugestão de restaurante com faixa de preço
   - **Tarde (14h-18h):** Atividade secundária, dicas de aproveitamento
   - **Jantar (19h-21h):** Sugestão de restaurante diferente do almoço
   - **Noite (21h+):** Atividade noturna ou descanso

4. **Sugestões de Hospedagem**
   - 3 opções de hospedagem com faixas de preço diferentes
   - Localização e vantagens de cada uma

5. **Orçamento Estimado**
   - Breakdown por categoria (hospedagem, alimentação, transporte, atrações)
   - Dicas para economizar
   - Custos por pessoa

6. **Dicas Extras**
   - O que levar na mala
   - Aplicativos úteis
   - Frases básicas no idioma local (se aplicável)
   - Souvenirs típicos

🎨 FORMATO DA RESPOSTA:
- Use títulos claros (Dia 1, Dia 2, etc.)
- Inclua horários específicos
- Mencione preços aproximados quando possível
- Seja específico com nomes de restaurantes, atrações e locais
- Inclua dicas práticas e links importantes quando relevante
- Mantenha um tom entusiasmado e inspirador

🚨 IMPORTANTE:
- O roteiro deve ser detalhado e prático
- Considere tempo de deslocamento entre atividades
- Adapte as sugestões ao orçamento informado
- Inclua pelo menos uma atividade gratuita por dia
- Considere as datas específicas para eventos sazonais

Crie um roteiro completo e inspirador que torne esta viagem inesquecível!`;

    return prompt;
  }

  /**
   * Get itinerary by ID
   */
  static async getItinerary(id: number): Promise<Itinerary | null> {
    try {
      return await ItinerariesModel.findById(id);
    } catch (error) {
      logger.error('Failed to get itinerary', {
        error: (error as Error).message,
        id
      });
      throw error;
    }
  }

  /**
   * Get recent itineraries with pagination
   */
  static async getRecentItineraries(
    limit: number = 10,
    offset: number = 0,
    status?: ProcessingStatus
  ): Promise<{ itineraries: Itinerary[]; total: number; pagination: any }> {
    try {
      const result = await ItinerariesModel.findRecent(limit, offset, status);
      
      return {
        itineraries: result.itineraries,
        total: result.total,
        pagination: {
          total: result.total,
          limit,
          offset,
          has_more: result.total > (offset + limit)
        }
      };
    } catch (error) {
      logger.error('Failed to get recent itineraries', {
        error: (error as Error).message,
        limit,
        offset,
        status
      });
      throw error;
    }
  }

  /**
   * Get itineraries by client IP
   */
  static async getClientItineraries(
    clientIp: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<Itinerary[]> {
    try {
      return await ItinerariesModel.findByClientIp(clientIp, limit, offset);
    } catch (error) {
      logger.error('Failed to get client itineraries', {
        error: (error as Error).message,
        clientIp,
        limit,
        offset
      });
      throw error;
    }
  }

  /**
   * Get pending itineraries for processing
   */
  static async getPendingItineraries(limit: number = 10): Promise<Itinerary[]> {
    try {
      return await ItinerariesModel.findPending(limit);
    } catch (error) {
      logger.error('Failed to get pending itineraries', {
        error: (error as Error).message,
        limit
      });
      throw error;
    }
  }

  /**
   * Get itinerary statistics
   */
  static async getStats(): Promise<{
    total: number;
    today: number;
    byStatus: Record<ProcessingStatus, number>;
    byModel: { groq: number; gemini: number };
    avgProcessingTime: number;
  }> {
    try {
      return await ItinerariesModel.getStats();
    } catch (error) {
      logger.error('Failed to get itinerary stats', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Check if PDF is available for download
   */
  static async isPDFAvailable(itinerary: Itinerary): Promise<boolean> {
    if (!itinerary.pdf_path || !itinerary.pdf_filename) {
      return false;
    }

    return await pdfService.pdfExists(itinerary.pdf_path);
  }

  /**
   * Get estimated completion time for new itinerary
   */
  static getEstimatedCompletionTime(): Date {
    // Estimate 3-5 minutes for processing
    const estimatedMinutes = 4;
    const completionTime = new Date();
    completionTime.setMinutes(completionTime.getMinutes() + estimatedMinutes);
    return completionTime;
  }

  /**
   * Validate itinerary request data
   */
  static validateItineraryDates(startDate: string, endDate: string): void {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if start date is not in the past
    if (start < today) {
      throw new Error('Start date cannot be in the past');
    }

    // Check if end date is after start date
    if (end <= start) {
      throw new Error('End date must be after start date');
    }

    // Check maximum trip duration (7 days)
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 7) {
      throw new Error('Trip duration cannot exceed 7 days');
    }
  }

  /**
   * Clean up old PDFs (for maintenance)
   */
  static async cleanupOldPDFs(days: number = 30): Promise<number> {
    try {
      logger.info('Starting PDF cleanup process', { days });

      // Get old itineraries
      const deletedCount = await ItinerariesModel.deleteOlderThan(days);

      logger.info('PDF cleanup completed', { deletedCount });

      return deletedCount;
    } catch (error) {
      logger.error('Failed to cleanup old PDFs', {
        error: (error as Error).message,
        days
      });
      throw error;
    }
  }
}

// Export class instance
export const itineraryService = ItineraryService;

