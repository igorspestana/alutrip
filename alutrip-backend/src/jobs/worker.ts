import { Worker } from 'bullmq';
import { itineraryQueue } from '../config/queue';
import { processItineraryJob } from './itinerary-generation.job';
import { config } from '../config/env';
import { logger } from '../config/logger';

/**
 * Background job worker for processing queued jobs
 * Handles concurrent job processing with configurable concurrency
 */

const redisConfig = {
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null,
  retryDelayOnFailover: 100,
  connectTimeout: 30000,
  commandTimeout: 30000,
};

/**
 * Start the BullMQ job worker
 */
export const startWorker = async (): Promise<void> => {
  try {
    logger.info('Starting BullMQ job worker', {
      context: 'worker',
      concurrency: config.QUEUE_CONCURRENCY
    });

    const worker = new Worker('itinerary_processing', processItineraryJob, {
      connection: redisConfig,
      concurrency: config.QUEUE_CONCURRENCY,
    });

    (global as any).itineraryWorker = worker;
    worker.on('ready', () => {
      logger.info('BullMQ worker is ready', { context: 'worker' });
    });

    worker.on('error', (error: Error) => {
      logger.error('BullMQ worker error', { 
        context: 'worker', 
        error: error.message 
      });
    });

    worker.on('active', (job) => {
      logger.info('BullMQ job started processing', {
        context: 'worker',
        jobId: job.id,
        jobData: job.data
      });
    });

    worker.on('completed', (job, result) => {
      logger.info('BullMQ job completed successfully', {
        context: 'worker',
        jobId: job.id,
        itineraryId: job.data.itineraryId,
        result: result !== undefined ? 'success' : 'unknown'
      });
    });

    worker.on('failed', (job, error: Error) => {
      logger.error('BullMQ job failed', {
        context: 'worker',
        jobId: job?.id,
        itineraryId: job?.data?.itineraryId,
        error: error.message,
        attempts: job?.attemptsMade
      });
    });

    worker.on('stalled', (jobId) => {
      logger.warn('BullMQ job stalled', { 
        context: 'worker',
        jobId
      });
    });

    worker.on('progress', (job, progress) => {
      logger.info('BullMQ job progress', { 
        context: 'worker',
        jobId: job.id,
        itineraryId: job.data.itineraryId,
        progress: typeof progress === 'number' ? `${progress}%` : progress
      });
    });

    logger.info('BullMQ job worker started successfully', {
      context: 'worker',
      concurrency: config.QUEUE_CONCURRENCY,
      queueName: 'itinerary_processing',
      processingJobType: 'process-itinerary'
    });

    try {
      const waiting = await itineraryQueue.getWaiting();
      const active = await itineraryQueue.getActive();
      
      logger.info('Current BullMQ queue status after worker start', {
        context: 'worker',
        waitingJobs: waiting.length,
        activeJobs: active.length,
        waitingJobIds: waiting.map(j => ({ id: j.id, data: j.data }))
      });
    } catch (statsError) {
      logger.error('Could not get BullMQ queue stats', {
        context: 'worker',
        error: (statsError as Error).message
      });
    }

  } catch (error) {
    logger.error('Failed to start BullMQ job worker', {
      context: 'worker',
      error: (error as Error).message
    });
    throw error;
  }
};

/**
 * Stop the BullMQ job worker
 */
export const stopWorker = async (): Promise<void> => {
  try {
    logger.info('Stopping BullMQ job worker', { context: 'worker' });

    const worker = (global as any).itineraryWorker;
    if (worker) {
      await worker.close();
    }

    await itineraryQueue.close();

    logger.info('BullMQ job worker stopped', { context: 'worker' });
  } catch (error) {
    logger.error('Error stopping BullMQ job worker', {
      context: 'worker',
      error: (error as Error).message
    });
  }
};

if (require.main === module) {
  startWorker().catch((error) => {
    logger.error('Worker startup failed', {
      context: 'worker',
      error: error.message
    });
    process.exit(1);
  });
}
