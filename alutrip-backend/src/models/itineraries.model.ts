import { query } from '../config/database';
import { logger } from '../config/logger';
import { 
  Itinerary, 
  ItineraryRequestData, 
  ProcessingStatus, 
  AIModel 
} from '../types/travel';

export class ItinerariesModel {
  // Create a new itinerary request
  static async create(
    clientIp: string,
    destination: string,
    startDate: Date,
    endDate: Date,
    requestData: ItineraryRequestData,
    sessionId?: string,
    budget?: number,
    interests?: string[]
  ): Promise<Itinerary> {
    const sql = `
      INSERT INTO itineraries (
        session_id, client_ip, destination, start_date, end_date, 
        budget, interests, request_data, generated_content, 
        model_used, processing_status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      RETURNING *
    `;
    
    try {
      const result = await query(sql, [
        sessionId,
        clientIp,
        destination,
        startDate,
        endDate,
        budget,
        interests || [],
        JSON.stringify(requestData),
        '', // Empty generated content initially
        'groq', // Default model, will be updated when processing
        'pending'
      ]);
      
      logger.info('Itinerary request created', {
        id: result.rows[0].id,
        clientIp,
        destination,
        startDate,
        endDate
      });
      
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to create itinerary request', {
        error: (error as Error).message,
        clientIp,
        destination
      });
      throw error;
    }
  }

  // Get an itinerary by ID
  static async findById(id: number): Promise<Itinerary | null> {
    const sql = `
      SELECT * FROM itineraries 
      WHERE id = $1
    `;
    
    try {
      const result = await query(sql, [id]);
      const itinerary = result.rows[0];
      
      if (itinerary) {
        // Parse JSON fields if they are strings
        if (typeof itinerary.request_data === 'string') {
          itinerary.request_data = JSON.parse(itinerary.request_data);
        }
      }
      
      return itinerary || null;
    } catch (error) {
      logger.error('Failed to find itinerary by ID', {
        error: (error as Error).message,
        id
      });
      throw error;
    }
  }

  // Update itinerary status
  static async updateStatus(
    id: number,
    status: ProcessingStatus,
    completedAt?: Date
  ): Promise<Itinerary | null> {
    const sql = `
      UPDATE itineraries 
      SET processing_status = $1, completed_at = $2
      WHERE id = $3
      RETURNING *
    `;
    
    try {
      const result = await query(sql, [status, completedAt, id]);
      const itinerary = result.rows[0];
      
      if (itinerary) {
        if (typeof itinerary.request_data === 'string') {
          itinerary.request_data = JSON.parse(itinerary.request_data);
        }
      }
      
      logger.info('Itinerary status updated', {
        id,
        status,
        completedAt
      });
      
      return itinerary || null;
    } catch (error) {
      logger.error('Failed to update itinerary status', {
        error: (error as Error).message,
        id,
        status
      });
      throw error;
    }
  }

  // Update generated content and PDF info
  static async updateContent(
    id: number,
    generatedContent: string,
    modelUsed: AIModel,
    pdfFilename?: string,
    pdfPath?: string
  ): Promise<Itinerary | null> {
    const sql = `
      UPDATE itineraries 
      SET generated_content = $1, model_used = $2, pdf_filename = $3, pdf_path = $4
      WHERE id = $5
      RETURNING *
    `;
    
    try {
      const result = await query(sql, [generatedContent, modelUsed, pdfFilename, pdfPath, id]);
      const itinerary = result.rows[0];
      
      if (itinerary) {
        if (typeof itinerary.request_data === 'string') {
          itinerary.request_data = JSON.parse(itinerary.request_data);
        }
      }
      
      logger.info('Itinerary content updated', {
        id,
        modelUsed,
        contentLength: generatedContent.length,
        pdfFilename
      });
      
      return itinerary || null;
    } catch (error) {
      logger.error('Failed to update itinerary content', {
        error: (error as Error).message,
        id,
        modelUsed
      });
      throw error;
    }
  }

  // Get recent itineraries with pagination and optional status filter
  static async findRecent(
    limit: number = 10,
    offset: number = 0,
    status?: ProcessingStatus
  ): Promise<{ itineraries: Itinerary[]; total: number }> {
    const whereClause = status ? 'WHERE processing_status = $1' : '';
    const dataParams = status ? [status, limit, offset] : [limit, offset];
    const countParams = status ? [status] : [];
    
    const countSql = `SELECT COUNT(*) FROM itineraries ${whereClause}`;
    const dataSql = `
      SELECT * FROM itineraries 
      ${whereClause}
      ORDER BY created_at DESC 
      LIMIT ${status ? '$2' : '$1'} OFFSET ${status ? '$3' : '$2'}
    `;
    
    try {
      const [countResult, dataResult] = await Promise.all([
        query(countSql, countParams),
        query(dataSql, dataParams)
      ]);
      
      const itineraries = dataResult.rows.map((itinerary: any) => ({
        ...itinerary,
        request_data: typeof itinerary.request_data === 'string' 
          ? JSON.parse(itinerary.request_data) 
          : itinerary.request_data
      }));
      
      return {
        itineraries,
        total: parseInt(countResult.rows[0].count, 10)
      };
    } catch (error) {
      logger.error('Failed to find recent itineraries', {
        error: (error as Error).message,
        limit,
        offset,
        status
      });
      throw error;
    }
  }

  // Get itineraries by client IP
  static async findByClientIp(
    clientIp: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<Itinerary[]> {
    const sql = `
      SELECT * FROM itineraries 
      WHERE client_ip = $1 
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `;
    
    try {
      const result = await query(sql, [clientIp, limit, offset]);
      
      return result.rows.map((itinerary: any) => ({
        ...itinerary,
        request_data: typeof itinerary.request_data === 'string'
          ? JSON.parse(itinerary.request_data)
          : itinerary.request_data
      }));
    } catch (error) {
      logger.error('Failed to find itineraries by client IP', {
        error: (error as Error).message,
        clientIp,
        limit,
        offset
      });
      throw error;
    }
  }

  // Get pending itineraries for processing
  static async findPending(limit: number = 10): Promise<Itinerary[]> {
    const sql = `
      SELECT * FROM itineraries 
      WHERE processing_status = 'pending'
      ORDER BY created_at ASC
      LIMIT $1
    `;
    
    try {
      const result = await query(sql, [limit]);
      
      return result.rows.map((itinerary: any) => ({
        ...itinerary,
        request_data: typeof itinerary.request_data === 'string'
          ? JSON.parse(itinerary.request_data)
          : itinerary.request_data
      }));
    } catch (error) {
      logger.error('Failed to find pending itineraries', {
        error: (error as Error).message,
        limit
      });
      throw error;
    }
  }

  // Get itinerary statistics
  static async getStats(): Promise<{
    total: number;
    today: number;
    byStatus: Record<ProcessingStatus, number>;
    byModel: { groq: number; gemini: number };
    avgProcessingTime: number;
  }> {
    const statsSql = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) as today,
        COUNT(*) FILTER (WHERE processing_status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE processing_status = 'processing') as processing_count,
        COUNT(*) FILTER (WHERE processing_status = 'completed') as completed_count,
        COUNT(*) FILTER (WHERE processing_status = 'failed') as failed_count,
        COUNT(*) FILTER (WHERE model_used = 'groq') as groq_count,
        COUNT(*) FILTER (WHERE model_used = 'gemini') as gemini_count,
        AVG(EXTRACT(EPOCH FROM (completed_at - created_at)))::INTEGER as avg_processing_seconds
      FROM itineraries
    `;
    
    try {
      const result = await query(statsSql);
      const stats = result.rows[0];
      
      return {
        total: parseInt(stats.total, 10),
        today: parseInt(stats.today, 10),
        byStatus: {
          pending: parseInt(stats.pending_count, 10),
          processing: parseInt(stats.processing_count, 10),
          completed: parseInt(stats.completed_count, 10),
          failed: parseInt(stats.failed_count, 10)
        },
        byModel: {
          groq: parseInt(stats.groq_count, 10),
          gemini: parseInt(stats.gemini_count, 10)
        },
        avgProcessingTime: parseInt(stats.avg_processing_seconds, 10) || 0
      };
    } catch (error) {
      logger.error('Failed to get itinerary stats', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  // Delete old itineraries (for cleanup)
  static async deleteOlderThan(days: number): Promise<number> {
    const sql = `
      DELETE FROM itineraries 
      WHERE created_at < NOW() - INTERVAL '${days} days'
    `;
    
    try {
      const result = await query(sql);
      
      logger.info('Old itineraries deleted', {
        deletedCount: result.rowCount,
        days
      });
      
      return result.rowCount;
    } catch (error) {
      logger.error('Failed to delete old itineraries', {
        error: (error as Error).message,
        days
      });
      throw error;
    }
  }
}

