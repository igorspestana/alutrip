import { query } from '../config/database';
import { logger } from '../config/logger';
import { TravelQuestion, AIModel } from '../types/travel';

export class TravelQuestionsModel {
  static async create(
    clientIp: string,
    question: string,
    response: string,
    modelUsed: AIModel,
    sessionId?: string
  ): Promise<TravelQuestion> {
    const sql = `
      INSERT INTO travel_questions (
        session_id, client_ip, question, response, model_used, created_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING *
    `;
    
    try {
      const result = await query(sql, [sessionId, clientIp, question, response, modelUsed]);
      
      logger.info('Travel question created', {
        id: result.rows[0].id,
        clientIp,
        modelUsed,
        questionLength: question.length,
        responseLength: response.length
      });
      
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to create travel question', {
        error: (error as Error).message,
        clientIp,
        modelUsed
      });
      throw error;
    }
  }

  static async findById(id: number): Promise<TravelQuestion | null> {
    const sql = `
      SELECT * FROM travel_questions 
      WHERE id = $1
    `;
    
    try {
      const result = await query(sql, [id]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to find travel question by ID', {
        error: (error as Error).message,
        id
      });
      throw error;
    }
  }

  static async findRecent(
    limit: number = 10,
    offset: number = 0
  ): Promise<{ questions: TravelQuestion[]; total: number }> {
    const countSql = 'SELECT COUNT(*) FROM travel_questions';
    const dataSql = `
      SELECT * FROM travel_questions 
      ORDER BY created_at DESC 
      LIMIT $1 OFFSET $2
    `;
    
    try {
      const [countResult, dataResult] = await Promise.all([
        query(countSql),
        query(dataSql, [limit, offset])
      ]);
      
      return {
        questions: dataResult.rows,
        total: parseInt(countResult.rows[0].count, 10)
      };
    } catch (error) {
      logger.error('Failed to find recent travel questions', {
        error: (error as Error).message,
        limit,
        offset
      });
      throw error;
    }
  }

  static async findByClientIp(
    clientIp: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<TravelQuestion[]> {
    const sql = `
      SELECT * FROM travel_questions 
      WHERE client_ip = $1 
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `;
    
    try {
      const result = await query(sql, [clientIp, limit, offset]);
      return result.rows;
    } catch (error) {
      logger.error('Failed to find travel questions by client IP', {
        error: (error as Error).message,
        clientIp,
        limit,
        offset
      });
      throw error;
    }
  }

  static async findBySessionId(sessionId: string): Promise<TravelQuestion[]> {
    const sql = `
      SELECT * FROM travel_questions 
      WHERE session_id = $1 
      ORDER BY created_at ASC
    `;
    
    try {
      const result = await query(sql, [sessionId]);
      return result.rows;
    } catch (error) {
      logger.error('Failed to find travel questions by session ID', {
        error: (error as Error).message,
        sessionId
      });
      throw error;
    }
  }

  static async getStats(): Promise<{
    total: number;
    today: number;
    byModel: { groq: number; gemini: number };
    avgResponseLength: number;
  }> {
    const statsSql = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) as today,
        COUNT(*) FILTER (WHERE model_used = 'groq') as groq_count,
        COUNT(*) FILTER (WHERE model_used = 'gemini') as gemini_count,
        AVG(LENGTH(response))::INTEGER as avg_response_length
      FROM travel_questions
    `;
    
    try {
      const result = await query(statsSql);
      const stats = result.rows[0];
      
      return {
        total: parseInt(stats.total, 10),
        today: parseInt(stats.today, 10),
        byModel: {
          groq: parseInt(stats.groq_count, 10),
          gemini: parseInt(stats.gemini_count, 10)
        },
        avgResponseLength: parseInt(stats.avg_response_length, 10) || 0
      };
    } catch (error) {
      logger.error('Failed to get travel questions stats', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  static async deleteOlderThan(days: number): Promise<number> {
    const sql = `
      DELETE FROM travel_questions 
      WHERE created_at < NOW() - INTERVAL '${days} days'
    `;
    
    try {
      const result = await query(sql);
      
      logger.info('Old travel questions deleted', {
        deletedCount: result.rowCount,
        days
      });
      
      return result.rowCount;
    } catch (error) {
      logger.error('Failed to delete old travel questions', {
        error: (error as Error).message,
        days
      });
      throw error;
    }
  }
}

