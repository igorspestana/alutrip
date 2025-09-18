import { Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '../config/logger';
import { itineraryService } from '../services/itinerary.service';
import { addItineraryJob } from '../config/queue';
import { getRateLimitInfo } from '../middleware/rate-limit';
import { incrementRateLimit } from '../config/redis';
import { pdfService } from '../services/pdf.service';
import { 
  ItineraryRequestInput,
  PaginationInput,
  StatusFilterInput,
  IdParamInput,
  itineraryRequestSchema,
  paginationSchema,
  statusFilterSchema,
  idParamSchema
} from '../schemas/travel.schemas';
import { createReadStream } from 'fs';

/**
 * Itinerary Controller
 * Handles all itinerary-related HTTP requests
 */
export class ItineraryController {

  /**
   * Create new itinerary request
   * POST /api/itinerary/create
   */
  static async createItinerary(req: Request, res: Response): Promise<void> {
    try {
      const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
      
      logger.info('Itinerary creation request received', {
        clientIp,
        body: req.body
      });

      const validatedData: ItineraryRequestInput = itineraryRequestSchema.parse(req.body);

      const key = `rate_limit:itineraries:${clientIp}`;
      const rateLimitInfo = await getRateLimitInfo(key, 86400000, 5);
      
      await incrementRateLimit(key, 86400000);
      
      if (rateLimitInfo.used >= rateLimitInfo.limit) {
        res.status(429).json({
          status: 'error',
          message: 'Rate limit exceeded',
          data: {
            feature: 'itineraries',
            limit: rateLimitInfo.limit,
            used: rateLimitInfo.used,
            reset_time: rateLimitInfo.reset_time
          }
        });
        return;
      }

      itineraryService.validateItineraryDates(validatedData.start_date, validatedData.end_date);

      const itinerary = await itineraryService.createItinerary(
        clientIp,
        validatedData as any,
        undefined // sessionId
      );

      const itineraryId = itinerary['id'] as number;
      let processingMethod = 'unknown';
      let processingError = null;
      
      try {
        logger.info('Attempting to add itinerary job to Bull queue', {
          context: 'hybrid-controller',
          itineraryId,
          clientIp,
          method: 'queue'
        });
        
        await addItineraryJob(itineraryId);
        
        processingMethod = 'queue';
        logger.info('✅ Itinerary job added to Bull queue successfully', {
          context: 'hybrid-controller',
          itineraryId,
          clientIp,
          method: processingMethod
        });
        
      } catch (queueError) {
        processingError = queueError as Error;
        processingMethod = 'direct';
        
        logger.warn('⚠️ Bull queue failed, using direct processing fallback', {
          context: 'hybrid-controller',
          itineraryId,
          clientIp,
          queueError: processingError.message,
          fallback: processingMethod
        });
        
        setImmediate(async () => {
          try {
            logger.info('🔄 Starting direct background processing', {
              context: 'hybrid-direct',
              itineraryId,
              clientIp
            });
            
            await itineraryService.processItinerary(itineraryId);
            
            logger.info('✅ Direct background processing completed successfully', {
              context: 'hybrid-direct',
              itineraryId,
              clientIp
            });
            
          } catch (directError) {
            logger.error('❌ Direct background processing failed', {
              context: 'hybrid-direct',
              itineraryId,
              clientIp,
              error: (directError as Error).message
            });
          }
        });
        
        logger.info('🚀 Direct processing dispatched in background', {
          context: 'hybrid-controller',
          itineraryId,
          clientIp,
          method: processingMethod
        });
      }

      const estimatedCompletion = itineraryService.getEstimatedCompletionTime();

      res.status(200).json({
        status: 'success',
        message: `Itinerary request submitted successfully via ${processingMethod}`,
        data: {
          id: itinerary['id'],
          destination: itinerary.destination,
          start_date: itinerary.start_date,
          end_date: itinerary.end_date,
          processing_status: itinerary.processing_status,
          created_at: itinerary.created_at,
          estimated_completion: estimatedCompletion,
          processing_method: processingMethod,
          ...(processingError && { 
            queue_fallback_reason: processingError.message.substring(0, 100)
          })
        }
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          data: {
            errors: error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message
            }))
          }
        });
        return;
      }

      logger.error('Itinerary creation failed', {
        error: (error as Error).message,
        clientIp: req.ip
      });

      if ((error as Error).message.includes('date')) {
        res.status(400).json({
          status: 'error',
          message: (error as Error).message,
          data: {}
        });
        return;
      }

      res.status(500).json({
        status: 'error',
        message: 'Internal server error',
        data: {}
      });
    }
  }

  /**
   * Get itinerary status
   * GET /api/itinerary/:id/status
   */
  static async getItineraryStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id }: IdParamInput = idParamSchema.parse(req.params);

      const itinerary = await itineraryService.getItinerary(id);

      if (!itinerary) {
        res.status(404).json({
          status: 'error',
          message: 'Itinerary not found',
          data: {}
        });
        return;
      }

      const pdfAvailable = await itineraryService.isPDFAvailable(itinerary);

      res.status(200).json({
        status: 'success',
        message: 'Itinerary status retrieved successfully',
        data: {
          id: itinerary['id'],
          destination: itinerary.destination,
          processing_status: itinerary.processing_status,
          created_at: itinerary.created_at,
          completed_at: itinerary.completed_at,
          pdf_available: pdfAvailable,
          pdf_filename: pdfAvailable ? itinerary.pdf_filename : null
        }
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          status: 'error',
          message: 'Invalid itinerary ID',
          data: {}
        });
        return;
      }

      logger.error('Get itinerary status failed', {
        error: (error as Error).message,
        id: req.params['id']
      });

      res.status(500).json({
        status: 'error',
        message: 'Internal server error',
        data: {}
      });
    }
  }

  /**
   * Download itinerary PDF
   * GET /api/itinerary/:id/download
   */
  static async downloadItinerary(req: Request, res: Response): Promise<void> {
    try {
      const { id }: IdParamInput = idParamSchema.parse(req.params);

      const itinerary = await itineraryService.getItinerary(id);

      if (!itinerary) {
        res.status(404).json({
          status: 'error',
          message: 'Itinerary not found',
          data: {}
        });
        return;
      }

      if (itinerary.processing_status !== 'completed') {
        res.status(400).json({
          status: 'error',
          message: `Itinerary is not ready for download. Current status: ${itinerary.processing_status}`,
          data: {
            processing_status: itinerary.processing_status
          }
        });
        return;
      }

      if (!itinerary.pdf_path || !itinerary.pdf_filename) {
        res.status(410).json({
          status: 'error',
          message: 'PDF file is not available',
          data: {}
        });
        return;
      }

      const pdfExists = await pdfService.pdfExists(itinerary.pdf_path);
      
      if (!pdfExists) {
        res.status(410).json({
          status: 'error',
          message: 'PDF file no longer available',
          data: {}
        });
        return;
      }

      const fileSize = await pdfService.getPDFSize(itinerary.pdf_path);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${itinerary.pdf_filename}"`);
      res.setHeader('Content-Length', fileSize);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      const fileStream = createReadStream(itinerary.pdf_path);
      
      fileStream.on('error', (streamError) => {
        logger.error('PDF file stream error', {
          error: streamError.message,
        itineraryId: itinerary['id'],
        filePath: itinerary.pdf_path
        });
        
        if (!res.headersSent) {
          res.status(500).json({
            status: 'error',
            message: 'Error reading PDF file',
            data: {}
          });
        }
      });

      fileStream.pipe(res);

      logger.info('PDF download initiated', {
        itineraryId: itinerary['id'],
        filename: itinerary.pdf_filename,
        fileSize
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          status: 'error',
          message: 'Invalid itinerary ID',
          data: {}
        });
        return;
      }

      logger.error('PDF download failed', {
        error: (error as Error).message,
        id: req.params['id']
      });

      if (!res.headersSent) {
        res.status(500).json({
          status: 'error',
          message: 'Internal server error',
          data: {}
        });
      }
    }
  }

  /**
   * List recent itineraries
   * GET /api/itinerary/list
   */
  static async listItineraries(req: Request, res: Response): Promise<void> {
    try {
      const pagination: PaginationInput = paginationSchema.parse(req.query);
      const statusFilter: StatusFilterInput = statusFilterSchema.parse(req.query);

      const result = await itineraryService.getRecentItineraries(
        pagination.limit,
        pagination.offset,
        statusFilter.status
      );

      const itinerariesWithPDFInfo = await Promise.all(
        result.itineraries.map(async (itinerary) => ({
          id: itinerary['id'],
          destination: itinerary.destination,
          start_date: itinerary.start_date,
          end_date: itinerary.end_date,
          processing_status: itinerary.processing_status,
          created_at: itinerary.created_at,
          pdf_available: await itineraryService.isPDFAvailable(itinerary)
        }))
      );

      res.status(200).json({
        status: 'success',
        message: 'Itineraries retrieved successfully',
        data: {
          itineraries: itinerariesWithPDFInfo,
          pagination: result.pagination
        }
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          status: 'error',
          message: 'Invalid query parameters',
          data: {
            errors: error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message
            }))
          }
        });
        return;
      }

      logger.error('List itineraries failed', {
        error: (error as Error).message,
        query: req.query
      });

      res.status(500).json({
        status: 'error',
        message: 'Internal server error',
        data: {}
      });
    }
  }

  /**
   * Get itinerary statistics (admin/monitoring endpoint)
   * GET /api/itinerary/stats
   */
  static async getStats(_req: Request, res: Response): Promise<void> {
    try {
      const stats = await itineraryService.getStats();

      res.status(200).json({
        status: 'success',
        message: 'Itinerary statistics retrieved successfully',
        data: {
          ...stats,
          avgProcessingTimeFormatted: `${Math.round(stats.avgProcessingTime / 60)} minutes`
        }
      });

    } catch (error) {
      logger.error('Get itinerary stats failed', {
        error: (error as Error).message
      });

      res.status(500).json({
        status: 'error',
        message: 'Internal server error',
        data: {}
      });
    }
  }

  /**
   * Get client itinerary history (IP-based)
   * GET /api/itinerary/history
   */
  static async getClientHistory(req: Request, res: Response): Promise<void> {
    try {
      const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
      const pagination: PaginationInput = paginationSchema.parse(req.query);

      const itineraries = await itineraryService.getClientItineraries(
        clientIp,
        pagination.limit,
        pagination.offset
      );

      const itinerariesWithPDFInfo = await Promise.all(
        itineraries.map(async (itinerary) => ({
          id: itinerary['id'],
          destination: itinerary.destination,
          start_date: itinerary.start_date,
          end_date: itinerary.end_date,
          processing_status: itinerary.processing_status,
          created_at: itinerary.created_at,
          completed_at: itinerary.completed_at,
          pdf_available: await itineraryService.isPDFAvailable(itinerary)
        }))
      );

      res.status(200).json({
        status: 'success',
        message: 'Client itinerary history retrieved successfully',
        data: {
          client_ip: clientIp,
          itineraries: itinerariesWithPDFInfo,
          pagination: {
            limit: pagination.limit,
            offset: pagination.offset,
            total: itineraries.length,
            has_more: itineraries.length === pagination.limit
          }
        }
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          status: 'error',
          message: 'Invalid query parameters',
          data: {
            errors: error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message
            }))
          }
        });
        return;
      }

      logger.error('Get client itinerary history failed', {
        error: (error as Error).message,
        clientIp: req.ip
      });

      res.status(500).json({
        status: 'error',
        message: 'Internal server error',
        data: {}
      });
    }
  }

  /**
   * Process pending itineraries that are stuck in queue
   * POST /api/itinerary/process-stuck
   */
  static async processStuckItineraries(req: Request, res: Response): Promise<void> {
    try {
      logger.info('🔄 Processing stuck itineraries endpoint called', {
        context: 'stuck-processor',
        clientIp: req.ip || 'unknown'
      });

      const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
      
      const pendingItineraries = await itineraryService.getPendingItineraries(10);
      
      logger.info('🔍 DEBUG: Checking pending itineraries', {
        context: 'stuck-processor',
        pendingCount: pendingItineraries.length,
        pendingIds: pendingItineraries.map(i => ({ id: i.id, created_at: i.created_at })),
        thresholdTime: thirtySecondsAgo.toISOString()
      });

      const stuckItineraries = pendingItineraries;

      if (stuckItineraries.length === 0) {
        res.status(200).json({
          status: 'success',
          message: 'No stuck itineraries found',
          data: {
            checked: pendingItineraries.length,
            processed: 0,
            stuck_threshold: '30 seconds'
          }
        });
        return;
      }

      logger.info('🚨 Found stuck itineraries, processing via direct fallback', {
        context: 'stuck-processor',
        stuckCount: stuckItineraries.length,
        stuckIds: stuckItineraries.map(i => i.id)
      });

      const processedIds: number[] = [];
      
      stuckItineraries.forEach(itinerary => {
        const itineraryId = itinerary.id;
        processedIds.push(itineraryId);
        
        setImmediate(async () => {
          try {
            logger.info('🔄 Processing stuck itinerary via direct fallback', {
              context: 'stuck-direct',
              itineraryId,
              destination: itinerary.destination,
              stuckSince: itinerary.created_at
            });
            
            await itineraryService.processItinerary(itineraryId);
            
            logger.info('✅ Stuck itinerary processed successfully via direct fallback', {
              context: 'stuck-direct',
              itineraryId,
              destination: itinerary.destination
            });
            
          } catch (error) {
            logger.error('❌ Failed to process stuck itinerary', {
              context: 'stuck-direct',
              itineraryId,
              destination: itinerary.destination,
              error: (error as Error).message
            });
          }
        });
      });

      res.status(200).json({
        status: 'success',
        message: `Processing ${stuckItineraries.length} stuck itineraries via direct fallback`,
        data: {
          processed_ids: processedIds,
          total_processed: processedIds.length,
          stuck_threshold: '2 minutes',
          method: 'direct-fallback',
          estimated_completion: new Date(Date.now() + 6 * 60 * 1000) // 6 minutes
        }
      });

    } catch (error) {
      logger.error('Failed to process stuck itineraries', {
        context: 'stuck-processor',
        error: (error as Error).message
      });

      res.status(500).json({
        status: 'error',
        message: 'Failed to process stuck itineraries',
        data: {}
      });
    }
  }

  /**
   * TEST ENDPOINT: Create itinerary with forced direct processing
   * POST /api/itinerary/create-direct
   * This endpoint bypasses Bull queue and uses direct processing to test fallback
   */
  static async createItineraryDirect(req: Request, res: Response): Promise<void> {
    try {
      const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
      
      logger.info('🧪 DIRECT PROCESSING TEST - Itinerary creation request received', {
        clientIp,
        destination: req.body.destination,
        testMode: 'direct-fallback'
      });

      const validatedData: ItineraryRequestInput = itineraryRequestSchema.parse(req.body);

      itineraryService.validateItineraryDates(validatedData.start_date, validatedData.end_date);

      const itinerary = await itineraryService.createItinerary(
        clientIp,
        validatedData as any,
        undefined // sessionId
      );

      const itineraryId = itinerary['id'] as number;
      
      logger.info('🔄 FORCING direct processing (test endpoint)', {
        context: 'test-direct',
        itineraryId,
        clientIp,
        method: 'direct-forced'
      });

      setImmediate(async () => {
        try {
          logger.info('🚀 Starting FORCED direct background processing', {
            context: 'test-direct',
            itineraryId,
            clientIp
          });
          
          await itineraryService.processItinerary(itineraryId);
          
          logger.info('✅ FORCED direct background processing completed successfully', {
            context: 'test-direct',
            itineraryId,
            clientIp
          });
          
        } catch (directError) {
          logger.error('❌ FORCED direct background processing failed', {
            context: 'test-direct',
            itineraryId,
            clientIp,
            error: (directError as Error).message
          });
        }
      });

      const estimatedCompletion = itineraryService.getEstimatedCompletionTime();

      res.status(200).json({
        status: 'success',
        message: 'TEST: Itinerary request submitted successfully via DIRECT PROCESSING',
        data: {
          id: itinerary['id'],
          destination: itinerary.destination,
          start_date: itinerary.start_date,
          end_date: itinerary.end_date,
          processing_status: itinerary.processing_status,
          created_at: itinerary.created_at,
          estimated_completion: estimatedCompletion,
          processing_method: 'direct-forced',
          test_mode: true,
          note: 'This endpoint bypasses Bull queue and uses direct processing fallback'
        }
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          data: {
            errors: error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message
            }))
          }
        });
      } else {
        logger.error('Failed to create itinerary (direct test)', {
          error: (error as Error).message,
          clientIp: req.ip || 'unknown'
        });
        res.status(500).json({
          status: 'error',
          message: 'Internal server error',
          data: {}
        });
      }
    }
  }
}
