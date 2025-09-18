import { Job } from 'bullmq';
import { logger } from '../config/logger';
import { itineraryService } from '../services/itinerary.service';

/**
 * Background job processor for itinerary generation
 * Handles the asynchronous processing of travel itineraries
 */

export interface ItineraryJobData {
  itineraryId: number;
}

/**
 * Process itinerary generation job (BullMQ)
 */
export const processItineraryJob = async (job: Job<ItineraryJobData>): Promise<void> => {
  const { itineraryId } = job.data;
  const startTime = Date.now();

  try {
    logger.info('Starting BullMQ itinerary generation job', {
      context: 'job',
      jobId: job.id,
      itineraryId,
      jobName: job.name,
      jobAttempts: job.attemptsMade,
      jobOpts: job.opts
    });

    await job.updateProgress(10);
    logger.info('BullMQ job progress updated to 10%', {
      context: 'job',
      jobId: job.id,
      itineraryId
    });

    logger.info('Starting itinerary service processing', {
      context: 'job',
      jobId: job.id,
      itineraryId
    });
    
    await itineraryService.processItinerary(itineraryId);
    
    logger.info('Itinerary service processing completed', {
      context: 'job',
      jobId: job.id,
      itineraryId
    });

    await job.updateProgress(100);
    logger.info('BullMQ job progress updated to 100%', {
      context: 'job',
      jobId: job.id,
      itineraryId
    });

    const processingTime = Date.now() - startTime;

    logger.info('BullMQ itinerary generation job completed successfully', {
      context: 'job',
      jobId: job.id,
      itineraryId,
      processingTime: `${processingTime}ms`
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;

    logger.error('BullMQ itinerary generation job failed', {
      context: 'job',
      jobId: job.id,
      itineraryId,
      error: (error as Error).message,
      processingTime: `${processingTime}ms`
    });

    throw error;
  }
};

/**
 * Job event handlers
 */
export const setupJobHandlers = () => {
  logger.info('Itinerary job handlers configured', { context: 'job' });
};
