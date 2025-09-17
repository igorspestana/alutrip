import { itineraryQueue } from '../config/queue';
import { processItineraryJob, setupJobHandlers } from './itinerary-generation.job';
import { config } from '../config/env';
import { logger } from '../config/logger';

/**
 * Background job worker for processing queued jobs
 * Handles concurrent job processing with configurable concurrency
 */

/**
 * Start the job worker
 */
export const startWorker = async (): Promise<void> => {
  try {
    logger.info('Starting job worker', {
      context: 'worker',
      concurrency: config.QUEUE_CONCURRENCY
    });

    // Wait for queue to be ready
    logger.info('Waiting for queue to be ready...', {
      context: 'worker'
    });
    await itineraryQueue.isReady();
    
    logger.info('Queue is ready, setting up job handlers...', {
      context: 'worker'
    });

    // Setup job handlers
    setupJobHandlers();

    // Process itinerary jobs with explicit logging
    logger.info('Registering job processor...', {
      context: 'worker',
      jobType: 'process-itinerary',
      concurrency: config.QUEUE_CONCURRENCY
    });
    
    itineraryQueue.process(
      'process-itinerary',
      config.QUEUE_CONCURRENCY,
      processItineraryJob
    );

    // Add additional event listeners for debugging
    itineraryQueue.on('waiting', (jobId) => {
      logger.info('Job is waiting to be processed', {
        context: 'worker',
        jobId: jobId
      });
    });

    itineraryQueue.on('active', (job, _jobPromise) => {
      logger.info('Job started processing', {
        context: 'worker',
        jobId: job.id,
        jobData: job.data
      });
    });

    logger.info('Job worker started successfully', {
      context: 'worker',
      concurrency: config.QUEUE_CONCURRENCY,
      queueName: 'itinerary processing',
      processingJobType: 'process-itinerary'
    });

    // Log current queue stats
    try {
      const waiting = await itineraryQueue.getWaiting();
      const active = await itineraryQueue.getActive();
      
      logger.info('Current queue status after worker start', {
        context: 'worker',
        waitingJobs: waiting.length,
        activeJobs: active.length,
        waitingJobIds: waiting.map(j => ({ id: j.id, data: j.data }))
      });
    } catch (statsError) {
      logger.error('Could not get queue stats', {
        context: 'worker',
        error: (statsError as Error).message
      });
    }

  } catch (error) {
    logger.error('Failed to start job worker', {
      context: 'worker',
      error: (error as Error).message
    });
    throw error;
  }
};

/**
 * Stop the job worker
 */
export const stopWorker = async (): Promise<void> => {
  try {
    logger.info('Stopping job worker', { context: 'worker' });

    // Close queue connections
    await itineraryQueue.close();

    logger.info('Job worker stopped', { context: 'worker' });
  } catch (error) {
    logger.error('Error stopping job worker', {
      context: 'worker',
      error: (error as Error).message
    });
  }
};

// Auto-start worker if this file is run directly
if (require.main === module) {
  startWorker().catch((error) => {
    logger.error('Worker startup failed', {
      context: 'worker',
      error: error.message
    });
    process.exit(1);
  });
}
