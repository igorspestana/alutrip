import { Router } from 'express';
import { logger } from '../config/logger';
import { getQueueStats, getDetailedQueueInfo, itineraryQueue, cleanStalledJobs } from '../config/queue';
import { startWorker } from '../jobs/worker';

const router = Router();

/**
 * Debug queue status
 * GET /debug/queue-status
 */
router.get('/queue-status', async (req, res) => {
  try {
    const stats = await getQueueStats();
    const detailed = await getDetailedQueueInfo();

    logger.info('Queue debug request', {
      context: 'debug',
      clientIp: req.ip,
      stats
    });

    res.json({
      status: 'success',
      message: 'Queue status retrieved successfully',
      data: {
        stats,
        detailed,
        queue_name: itineraryQueue.name,
        redis_status: 'connected' // Assuming connected if we got here
      }
    });

  } catch (error) {
    logger.error('Failed to get queue debug info', {
      context: 'debug',
      error: (error as Error).message
    });

    res.status(500).json({
      status: 'error',
      message: 'Failed to get queue debug info',
      data: { error: (error as Error).message }
    });
  }
});

/**
 * Force process a specific job
 * POST /debug/force-process/:jobId
 */
router.post('/force-process/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    
    logger.info('Force process job request', {
      context: 'debug',
      jobId,
      clientIp: req.ip
    });

    // Get the job
    const job = await itineraryQueue.getJob(jobId);
    
    if (!job) {
      res.status(404).json({
        status: 'error',
        message: `Job ${jobId} not found`,
        data: {}
      });
      return;
    }

    logger.info('Job found, details', {
      context: 'debug',
      jobId,
      jobData: job.data,
      jobStatus: await job.getState(),
      attempts: job.attemptsMade,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn
    });

    // Try to retry the job
    await job.retry();

    res.json({
      status: 'success',
      message: `Job ${jobId} retried successfully`,
      data: {
        jobId,
        jobData: job.data,
        attempts: job.attemptsMade
      }
    });

  } catch (error) {
    logger.error('Failed to force process job', {
      context: 'debug',
      jobId: req.params.jobId,
      error: (error as Error).message
    });

    res.status(500).json({
      status: 'error',
      message: 'Failed to force process job',
      data: { error: (error as Error).message }
    });
  }
});

/**
 * Clean stuck/stalled jobs
 * POST /debug/clean-stuck-jobs
 */
router.post('/clean-stuck-jobs', async (req, res) => {
  try {
    logger.info('Clean stuck jobs request', {
      context: 'debug',
      clientIp: req.ip
    });

    const result = await cleanStalledJobs();

    res.json({
      status: 'success',
      message: 'Stuck jobs cleaned successfully',
      data: result
    });

  } catch (error) {
    logger.error('Failed to clean stuck jobs', {
      context: 'debug',
      error: (error as Error).message
    });

    res.status(500).json({
      status: 'error',
      message: 'Failed to clean stuck jobs',
      data: { error: (error as Error).message }
    });
  }
});

/**
 * Restart worker
 * POST /debug/restart-worker
 */
router.post('/restart-worker', async (req, res) => {
  try {
    logger.info('Restart worker request', {
      context: 'debug',
      clientIp: req.ip
    });

    // Skip cleaning for now due to Bull typing issues
    logger.info('Restarting worker...', {
      context: 'debug'
    });

    // Restart worker (this will re-register the processor)
    await startWorker();

    res.json({
      status: 'success',
      message: 'Worker restarted successfully',
      data: {
        workerStatus: 'restarted'
      }
    });

  } catch (error) {
    logger.error('Failed to restart worker', {
      context: 'debug',
      error: (error as Error).message
    });

    res.status(500).json({
      status: 'error',
      message: 'Failed to restart worker',
      data: { error: (error as Error).message }
    });
  }
});

export const debugRoutes = router;
