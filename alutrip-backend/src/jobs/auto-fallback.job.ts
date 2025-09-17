import { logger } from '../config/logger';
import { itineraryService } from '../services/itinerary.service';
import { getQueueStats } from '../config/queue';

/**
 * Automatic fallback system for stuck itinerary jobs
 * Monitors pending jobs and processes them via direct fallback if they're stuck too long
 */

const STUCK_THRESHOLD_MINUTES = 3; // Jobs stuck for more than 3 minutes
const CHECK_INTERVAL_MS = 2 * 60 * 1000; // Check every 2 minutes

let autoFallbackInterval: NodeJS.Timeout | null = null;

/**
 * Check for stuck jobs and process them via direct fallback
 */
export const processStuckJobs = async (): Promise<{
  checked: number;
  processed: number;
  processedIds: number[];
}> => {
  try {
    logger.info('🔍 Auto-fallback: Checking for stuck jobs', {
      context: 'auto-fallback',
      stuckThreshold: `${STUCK_THRESHOLD_MINUTES} minutes`
    });

    // Get queue stats
    const queueStats = await getQueueStats();
    
    if (queueStats.waiting === 0) {
      logger.info('✅ Auto-fallback: No waiting jobs found', {
        context: 'auto-fallback',
        queueStats
      });
      return { checked: 0, processed: 0, processedIds: [] };
    }

    logger.info('🔍 Auto-fallback: Found waiting jobs in queue', {
      context: 'auto-fallback',
      waitingJobs: queueStats.waiting,
      queueStats
    });

    // Get pending itineraries older than threshold
    const thresholdTime = new Date(Date.now() - STUCK_THRESHOLD_MINUTES * 60 * 1000);
    
    // Get all pending itineraries
    const pendingItineraries = await itineraryService.getPendingItineraries(20);
    
    // Filter by stuck time
    const stuckItineraries = pendingItineraries.filter(itinerary => {
      const createdAt = new Date(itinerary.created_at);
      return createdAt < thresholdTime;
    });

    logger.info('🔍 Auto-fallback: Analysis results', {
      context: 'auto-fallback',
      totalPending: pendingItineraries.length,
      stuckCount: stuckItineraries.length,
      thresholdTime: thresholdTime.toISOString(),
      stuckIds: stuckItineraries.map(i => ({ 
        id: i.id, 
        destination: i.destination,
        createdAt: i.created_at 
      }))
    });

    if (stuckItineraries.length === 0) {
      logger.info('✅ Auto-fallback: No stuck jobs found', {
        context: 'auto-fallback',
        checked: pendingItineraries.length,
        stuckThreshold: `${STUCK_THRESHOLD_MINUTES} minutes`
      });
      return { 
        checked: pendingItineraries.length, 
        processed: 0, 
        processedIds: [] 
      };
    }

    logger.warn('🚨 Auto-fallback: Found stuck jobs, processing via direct fallback', {
      context: 'auto-fallback',
      stuckCount: stuckItineraries.length,
      stuckIds: stuckItineraries.map(i => i.id)
    });

    // Process stuck jobs directly (in background)
    const processedIds: number[] = [];
    
    stuckItineraries.forEach(itinerary => {
      const itineraryId = itinerary.id;
      processedIds.push(itineraryId);
      
      setImmediate(async () => {
        try {
          logger.info('🔄 Auto-fallback: Processing stuck itinerary', {
            context: 'auto-fallback-direct',
            itineraryId,
            destination: itinerary.destination,
            stuckSince: itinerary.created_at
          });
          
          await itineraryService.processItinerary(itineraryId);
          
          logger.info('✅ Auto-fallback: Stuck itinerary processed successfully', {
            context: 'auto-fallback-direct',
            itineraryId,
            destination: itinerary.destination
          });
          
        } catch (error) {
          logger.error('❌ Auto-fallback: Failed to process stuck itinerary', {
            context: 'auto-fallback-direct',
            itineraryId,
            destination: itinerary.destination,
            error: (error as Error).message
          });
        }
      });
    });

    logger.info('🚀 Auto-fallback: Dispatched stuck jobs for direct processing', {
      context: 'auto-fallback',
      processedIds,
      totalProcessed: processedIds.length
    });

    return {
      checked: pendingItineraries.length,
      processed: stuckItineraries.length,
      processedIds
    };

  } catch (error) {
    logger.error('❌ Auto-fallback: Failed to check/process stuck jobs', {
      context: 'auto-fallback',
      error: (error as Error).message
    });
    
    return { checked: 0, processed: 0, processedIds: [] };
  }
};

/**
 * Start the automatic fallback monitoring system
 */
export const startAutoFallback = (): void => {
  if (autoFallbackInterval) {
    logger.warn('Auto-fallback monitoring is already running', {
      context: 'auto-fallback'
    });
    return;
  }

  logger.info('🤖 Starting auto-fallback monitoring system', {
    context: 'auto-fallback',
    checkInterval: `${CHECK_INTERVAL_MS / 1000}s`,
    stuckThreshold: `${STUCK_THRESHOLD_MINUTES}min`
  });

  autoFallbackInterval = setInterval(async () => {
    try {
      const result = await processStuckJobs();
      
      if (result.processed > 0) {
        logger.info('🔄 Auto-fallback: Periodic check completed with actions', {
          context: 'auto-fallback',
          ...result
        });
      }
    } catch (error) {
      logger.error('❌ Auto-fallback: Periodic check failed', {
        context: 'auto-fallback',
        error: (error as Error).message
      });
    }
  }, CHECK_INTERVAL_MS);

  // Run initial check
  setImmediate(async () => {
    try {
      const result = await processStuckJobs();
      logger.info('🚀 Auto-fallback: Initial check completed', {
        context: 'auto-fallback',
        ...result
      });
    } catch (error) {
      logger.error('❌ Auto-fallback: Initial check failed', {
        context: 'auto-fallback',
        error: (error as Error).message
      });
    }
  });
};

/**
 * Stop the automatic fallback monitoring system
 */
export const stopAutoFallback = (): void => {
  if (autoFallbackInterval) {
    clearInterval(autoFallbackInterval);
    autoFallbackInterval = null;
    
    logger.info('🛑 Auto-fallback monitoring system stopped', {
      context: 'auto-fallback'
    });
  }
};

/**
 * Get status of auto-fallback system
 */
export const getAutoFallbackStatus = (): {
  running: boolean;
  checkInterval: number;
  stuckThreshold: number;
} => {
  return {
    running: autoFallbackInterval !== null,
    checkInterval: CHECK_INTERVAL_MS,
    stuckThreshold: STUCK_THRESHOLD_MINUTES
  };
};
