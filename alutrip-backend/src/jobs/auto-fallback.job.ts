import { logger } from '../config/logger';
import { itineraryService } from '../services/itinerary.service';
import { getQueueStats } from '../config/queue';

/**
 * Automatic fallback system for stuck itinerary jobs
 * Monitors pending jobs and processes them via direct fallback if they're stuck too long
 */

const STUCK_THRESHOLD_MINUTES = 1;
const CHECK_INTERVAL_MS = 1 * 60 * 1000;

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
    const now = new Date();
    const thresholdTime = new Date(Date.now() - STUCK_THRESHOLD_MINUTES * 60 * 1000);
    
    logger.info('🔍 Auto-fallback: Checking for stuck jobs', {
      context: 'auto-fallback',
      stuckThreshold: `${STUCK_THRESHOLD_MINUTES} minutes`,
      currentTime: now.toISOString(),
      thresholdTime: thresholdTime.toISOString()
    });

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

    const pendingItineraries = await itineraryService.getPendingItineraries(20);
    
    logger.info('🔍 Auto-fallback: DEBUG - Raw pending itineraries', {
      context: 'auto-fallback',
      pendingCount: pendingItineraries.length,
      timezoneNote: 'DETECTED: PostgreSQL vs Node.js timezone mismatch - applying UTC normalization',
      itineraries: pendingItineraries.map(itinerary => {
        const createdAtUTC = new Date(itinerary.created_at);
        const createdAtNormalized = new Date(createdAtUTC.toISOString());
        const ageMinutes = Math.floor((now.getTime() - createdAtNormalized.getTime()) / (1000 * 60));
        
        return {
          id: itinerary.id,
          destination: itinerary.destination,
          created_at_raw: itinerary.created_at,
          created_at_iso: createdAtUTC.toISOString(),
          created_at_normalized: createdAtNormalized.toISOString(),
          created_at_ms: createdAtNormalized.getTime(),
          threshold_ms: thresholdTime.getTime(),
          age_minutes: ageMinutes,
          timezone_issue_detected: ageMinutes < 0 ? 'YES - Future timestamp detected' : 'NO'
        };
      })
    });
    
    const stuckItineraries = pendingItineraries.filter(itinerary => {
      const createdAtRaw = new Date(itinerary.created_at);
      const createdAtNormalized = new Date(createdAtRaw.toISOString());
      const ageMinutes = Math.floor((now.getTime() - createdAtNormalized.getTime()) / (1000 * 60));
      
      let correctedAgeMinutes = ageMinutes;
      if (ageMinutes < 0) {
        const timezoneOffsetHours = Math.abs(Math.round(ageMinutes / 60));
        if (timezoneOffsetHours <= 12) {
          correctedAgeMinutes = ageMinutes + (timezoneOffsetHours * 60);
          logger.warn('🚨 Auto-fallback: Timezone correction applied', {
            context: 'auto-fallback',
            itineraryId: itinerary.id,
            originalAgeMinutes: ageMinutes,
            correctedAgeMinutes,
            timezoneOffsetHours
          });
        }
      }
      
      const isStuck = Math.max(correctedAgeMinutes, ageMinutes) >= STUCK_THRESHOLD_MINUTES;
      
      logger.info('🔍 Auto-fallback: DEBUG - Checking itinerary [TIMEZONE AWARE]', {
        context: 'auto-fallback',
        itineraryId: itinerary.id,
        destination: itinerary.destination,
        created_at_raw: createdAtRaw.toISOString(),
        created_at_normalized: createdAtNormalized.toISOString(),
        ageMinutes,
        correctedAgeMinutes,
        stuckThreshold: STUCK_THRESHOLD_MINUTES,
        isStuck,
        timezoneIssue: ageMinutes < 0
      });
      
      return isStuck;
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

  logger.info('🤖 Starting auto-fallback monitoring system [ENHANCED DEBUG MODE]', {
    context: 'auto-fallback',
    checkInterval: `${CHECK_INTERVAL_MS / 1000}s`,
    stuckThreshold: `${STUCK_THRESHOLD_MINUTES}min`,
    improvements: ['Robust timezone handling', 'Age-based detection', 'Detailed debugging logs']
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
