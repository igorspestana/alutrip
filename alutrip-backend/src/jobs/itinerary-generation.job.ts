import { Job } from 'bull';
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
 * Process itinerary generation job
 */
export const processItineraryJob = async (job: Job<ItineraryJobData>): Promise<void> => {
  const { itineraryId } = job.data;
  const startTime = Date.now();

  try {
    logger.info('Starting itinerary generation job', {
      context: 'job',
      jobId: job.id,
      itineraryId,
      jobName: job.name,
      jobQueue: job.queue.name,
      jobAttempts: job.attemptsMade,
      jobOpts: job.opts
    });

    // Update job progress
    await job.progress(10);
    logger.info('Job progress updated to 10%', {
      context: 'job',
      jobId: job.id,
      itineraryId
    });

    // Process the itinerary (this will handle AI generation and PDF creation)
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

    // Update job progress
    await job.progress(100);
    logger.info('Job progress updated to 100%', {
      context: 'job',
      jobId: job.id,
      itineraryId
    });

    const processingTime = Date.now() - startTime;

    logger.info('Itinerary generation job completed successfully', {
      context: 'job',
      jobId: job.id,
      itineraryId,
      processingTime: `${processingTime}ms`
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;

    logger.error('Itinerary generation job failed', {
      context: 'job',
      jobId: job.id,
      itineraryId,
      error: (error as Error).message,
      processingTime: `${processingTime}ms`
    });

    // Re-throw error to mark job as failed
    throw error;
  }
};

/**
 * Job event handlers
 */
export const setupJobHandlers = () => {
  // These handlers are set up in the queue configuration
  // This function is available if additional job-specific handlers are needed
  
  logger.info('Itinerary job handlers configured', { context: 'job' });
};
