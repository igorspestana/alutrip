import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { config } from './env';
import { logger } from './logger';

/**
 * Queue configuration and setup for background job processing
 * Uses BullMQ with Redis for reliable job queue management
 */

// Create Redis connection for BullMQ
const redisUrl = config.REDIS_QUEUE_URL || config.REDIS_URL;
const redisOptions = {
  host: redisUrl.includes('://') 
    ? new URL(redisUrl).hostname 
    : redisUrl.split(':')[0] || 'localhost',
  port: redisUrl.includes('://') 
    ? parseInt(new URL(redisUrl).port || '6379') || 6379
    : parseInt(redisUrl.split(':')[1] || '6379') || 6379,
  maxRetriesPerRequest: null, // Required for BullMQ
  retryDelayOnFailover: 100,
  connectTimeout: 30000,
  commandTimeout: 30000, // Increased for BullMQ operations
};

// Create BullMQ queue for itinerary processing
export const itineraryQueue = new Queue('itinerary_processing', {
  connection: redisOptions,
  defaultJobOptions: {
    removeOnComplete: 10, // Keep last 10 completed jobs
    removeOnFail: 5, // Keep last 5 failed jobs
    attempts: config.QUEUE_MAX_ATTEMPTS,
    backoff: {
      type: 'exponential',
      delay: 5000, // Start with 5 second delay
    },
    delay: 1000, // 1 second delay before processing
  },
});

// BullMQ Worker instance (will be created in worker.ts)
export let itineraryWorker: Worker | null = null;

// Queue event listeners for monitoring and logging
itineraryQueue.on('error', (error: Error) => {
  logger.error('Itinerary queue error', { 
    context: 'queue', 
    error: error.message 
  });
});

/**
 * Initialize queue system
 */
export const initializeQueue = async (): Promise<void> => {
  try {
    logger.info('Initializing BullMQ queue system', { context: 'queue' });

    // Test Redis connection
    const testRedis = new Redis(redisOptions);
    await testRedis.ping();
    await testRedis.quit();

    logger.info('BullMQ queue system initialized successfully', { context: 'queue' });
  } catch (error) {
    logger.error('Failed to initialize BullMQ queue system', { 
      context: 'queue',
      error: (error as Error).message 
    });
    throw error;
  }
};

/**
 * Close queue connections
 */
export const closeQueue = async (): Promise<void> => {
  try {
    logger.info('Closing BullMQ queue connections', { context: 'queue' });

    await itineraryQueue.close();
    if (itineraryWorker) {
      await itineraryWorker.close();
    }

    logger.info('BullMQ queue connections closed', { context: 'queue' });
  } catch (error) {
    logger.error('Error closing BullMQ queue connections', { 
      context: 'queue',
      error: (error as Error).message 
    });
  }
};

/**
 * Add job to itinerary processing queue
 */
export const addItineraryJob = async (itineraryId: number): Promise<void> => {
  try {
    const job = await itineraryQueue.add(
      'process-itinerary',
      { itineraryId },
      {
        priority: 1, // Normal priority
        delay: 0, // No delay - process immediately
      }
    );

    logger.info('Itinerary job added to queue', {
      context: 'queue',
      jobId: job.id,
      itineraryId
    });
  } catch (error) {
    logger.error('Failed to add itinerary job to queue', {
      context: 'queue',
      itineraryId,
      error: (error as Error).message
    });
    throw error;
  }
};

/**
 * Get queue statistics
 */
export const getQueueStats = async (): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}> => {
  try {
    const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
      itineraryQueue.getWaiting(),
      itineraryQueue.getActive(),
      itineraryQueue.getCompleted(),
      itineraryQueue.getFailed(),
      itineraryQueue.getDelayed(),
      itineraryQueue.isPaused()
    ]);

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
      paused
    };
  } catch (error) {
    logger.error('Failed to get BullMQ queue stats', {
      context: 'queue',
      error: (error as Error).message
    });
    throw error;
  }
};

/**
 * Clean old jobs from queue
 */
export const cleanQueue = async (olderThan: number = 24 * 60 * 60 * 1000): Promise<void> => {
  try {
    logger.info('Starting BullMQ queue cleanup', { 
      context: 'queue',
      olderThan: `${olderThan / 1000 / 60 / 60} hours`
    });

    const cleaned = await itineraryQueue.clean(olderThan, 0, 'completed');
    const cleanedFailed = await itineraryQueue.clean(olderThan, 0, 'failed');

    logger.info('BullMQ queue cleanup completed', {
      context: 'queue',
      cleanedCompleted: cleaned.length,
      cleanedFailed: cleanedFailed.length
    });
  } catch (error) {
    logger.error('BullMQ queue cleanup failed', {
      context: 'queue',
      error: (error as Error).message
    });
  }
};

/**
 * Clean stuck/stalled jobs from queue
 */
export const cleanStalledJobs = async (): Promise<{
  stalledCleaned: number;
  waitingCleaned: number;
  activeCleaned: number;
}> => {
  try {
    logger.info('Starting cleanup of stuck/stalled jobs', { context: 'queue' });

    // Clean stalled jobs (older than 5 minutes) 
    const stalledCleaned = await itineraryQueue.clean(5 * 60 * 1000, 0, 'failed');
    
    // Clean old waiting jobs (older than 30 minutes)
    const waitingCleaned = await itineraryQueue.clean(30 * 60 * 1000, 0, 'waiting');
    
    // Clean active jobs that are too old (older than 60 minutes)
    const activeCleaned = await itineraryQueue.clean(60 * 60 * 1000, 0, 'active');

    const result = {
      stalledCleaned: stalledCleaned.length,
      waitingCleaned: waitingCleaned.length,
      activeCleaned: activeCleaned.length
    };

    logger.info('BullMQ stuck/stalled jobs cleanup completed', {
      context: 'queue',
      ...result
    });

    return result;
  } catch (error) {
    logger.error('Failed to clean BullMQ stuck/stalled jobs', {
      context: 'queue',
      error: (error as Error).message
    });
    throw error;
  }
};

/**
 * Perform emergency queue cleanup - removes ALL jobs
 * Use with caution! This will remove all jobs regardless of state
 */
export const emergencyQueueCleanup = async (): Promise<{
  completedCleaned: number;
  failedCleaned: number;
  activeCleaned: number;
  waitingCleaned: number;
  delayedCleaned: number;
}> => {
  try {
    logger.warn('Starting EMERGENCY BullMQ queue cleanup - removing ALL jobs', { 
      context: 'queue' 
    });

    const [completed, failed, active, waiting, delayed] = await Promise.all([
      itineraryQueue.clean(0, 0, 'completed'),
      itineraryQueue.clean(0, 0, 'failed'), 
      itineraryQueue.clean(0, 0, 'active'),
      itineraryQueue.clean(0, 0, 'waiting'),
      itineraryQueue.clean(0, 0, 'delayed')
    ]);

    const result = {
      completedCleaned: completed.length,
      failedCleaned: failed.length,
      activeCleaned: active.length,
      waitingCleaned: waiting.length,
      delayedCleaned: delayed.length
    };

    logger.warn('EMERGENCY BullMQ queue cleanup completed', {
      context: 'queue',
      ...result,
      totalCleaned: Object.values(result).reduce((sum, count) => sum + count, 0)
    });

    return result;
  } catch (error) {
    logger.error('Emergency BullMQ queue cleanup failed', {
      context: 'queue',
      error: (error as Error).message
    });
    throw error;
  }
};

/**
 * Get detailed queue information for debugging
 */
export const getDetailedQueueInfo = async (): Promise<{
  stats: any;
  waitingJobs: any[];
  activeJobs: any[];
  completedJobs: any[];
  failedJobs: any[];
  delayedJobs: any[];
}> => {
  try {
    const [stats, waiting, active, completed, failed, delayed] = await Promise.all([
      getQueueStats(),
      itineraryQueue.getWaiting(),
      itineraryQueue.getActive(),
      itineraryQueue.getCompleted(),
      itineraryQueue.getFailed(),
      itineraryQueue.getDelayed()
    ]);

    return {
      stats,
      waitingJobs: waiting.map(job => ({
        id: job.id,
        data: job.data,
        timestamp: job.timestamp,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
        attemptsMade: job.attemptsMade
      })),
      activeJobs: active.map(job => ({
        id: job.id,
        data: job.data,
        timestamp: job.timestamp,
        processedOn: job.processedOn,
        attemptsMade: job.attemptsMade
      })),
      completedJobs: completed.slice(0, 5).map(job => ({ // Only last 5 to avoid too much data
        id: job.id,
        data: job.data,
        finishedOn: job.finishedOn,
        processedOn: job.processedOn
      })),
      failedJobs: failed.map(job => ({
        id: job.id,
        data: job.data,
        failedReason: job.failedReason,
        finishedOn: job.finishedOn,
        attemptsMade: job.attemptsMade
      })),
      delayedJobs: delayed.map(job => ({
        id: job.id,
        data: job.data,
        delay: job.opts.delay,
        timestamp: job.timestamp
      }))
    };
  } catch (error) {
    logger.error('Failed to get detailed queue info', {
      context: 'queue',
      error: (error as Error).message
    });
    throw error;
  }
};

/**
 * Health check for BullMQ queue system
 */
export const queueHealthCheck = async (): Promise<{
  status: 'healthy' | 'unhealthy';
  error?: string;
  stats?: any;
}> => {
  try {
    // Test Redis connection
    const testRedis = new Redis(redisOptions);
    await testRedis.ping();
    await testRedis.quit();

    // Get queue stats
    const stats = await getQueueStats();

    return {
      status: 'healthy',
      stats
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: (error as Error).message
    };
  }
};
