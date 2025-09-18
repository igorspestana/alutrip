import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env';
import { incrementRateLimit, getRateLimit, getRateLimitTTL } from '../config/redis';
import { logRateLimit, logger } from '../config/logger';
import { createRateLimitError } from './error-handler';
import { RateLimitFeature, RateLimitInfo } from '../types/travel';

interface RateLimitConfig {
  windowMs: number;
  max: number;
  feature: RateLimitFeature;
  skipSuccessfulRequests?: boolean;
  keyGenerator?: (req: Request) => string;
}

const defaultKeyGenerator = (feature: RateLimitFeature) => (req: Request): string => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  return `rate_limit:${feature}:${ip}`;
};

const rateLimitConfigs: Record<RateLimitFeature, RateLimitConfig> = {
  travel_questions: {
    windowMs: config.RATE_LIMIT_WINDOW,
    max: config.RATE_LIMIT_REQUESTS,
    feature: 'travel_questions',
    skipSuccessfulRequests: false,
    keyGenerator: defaultKeyGenerator('travel_questions')
  },
  itineraries: {
    windowMs: config.RATE_LIMIT_WINDOW,
    max: config.RATE_LIMIT_REQUESTS,
    feature: 'itineraries',
    skipSuccessfulRequests: false,
    keyGenerator: defaultKeyGenerator('itineraries')
  }
};

const addRateLimitHeaders = (res: Response, info: RateLimitInfo, feature: RateLimitFeature) => {
  res.set({
    'X-RateLimit-Limit': info.limit.toString(),
    'X-RateLimit-Remaining': info.remaining.toString(),
    'X-RateLimit-Reset': info.reset_time,
    'X-RateLimit-Feature': feature
  });
};

export const getRateLimitInfo = async(key: string, _windowMs: number, max: number): Promise<RateLimitInfo> => {
  const used = await getRateLimit(key);
  const ttl = await getRateLimitTTL(key);
  const remaining = Math.max(0, max - used);
  const resetTime = new Date(Date.now() + (ttl * 1000)).toISOString();

  return {
    used,
    limit: max,
    remaining,
    reset_time: resetTime
  };
};

export const createRateLimiter = (feature: RateLimitFeature) => {
  const rateLimitConfig = rateLimitConfigs[feature];
  
  return async(req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const keyGenerator = rateLimitConfig.keyGenerator || defaultKeyGenerator(feature);
      const key = keyGenerator(req);
      const ip = req.ip || req.connection.remoteAddress || 'unknown';

      let rateLimitInfo = await getRateLimitInfo(key, rateLimitConfig.windowMs, rateLimitConfig.max);

      if (rateLimitInfo.remaining <= 0) {
        logRateLimit(ip, feature, 'EXCEEDED');
        
        addRateLimitHeaders(res, rateLimitInfo, feature);
        
        const error = createRateLimitError(
          feature,
          rateLimitConfig.max,
          rateLimitInfo.reset_time
        );
        
        throw error;
      }

      const newCount = await incrementRateLimit(key, rateLimitConfig.windowMs);
      
      rateLimitInfo = await getRateLimitInfo(key, rateLimitConfig.windowMs, rateLimitConfig.max);
      
      logger.debug('Rate limit check passed', {
        feature,
        ip,
        used: newCount,
        limit: rateLimitConfig.max,
        remaining: rateLimitInfo.remaining
      });

      addRateLimitHeaders(res, rateLimitInfo, feature);

      req.rateLimitInfo = rateLimitInfo;

      next();
    } catch (error) {
      next(error);
    }
  };
};

export const travelQuestionsRateLimit = createRateLimiter('travel_questions');

export const itinerariesRateLimit = createRateLimiter('itineraries');

export const getRateLimitStatus = async(ip: string) => {
  const results = await Promise.all([
    getRateLimitInfo(
      `rate_limit:travel_questions:${ip}`,
      rateLimitConfigs.travel_questions.windowMs,
      rateLimitConfigs.travel_questions.max
    ),
    getRateLimitInfo(
      `rate_limit:itineraries:${ip}`,
      rateLimitConfigs.itineraries.windowMs,
      rateLimitConfigs.itineraries.max
    )
  ]);

  return {
    ip,
    limits: {
      travel_questions: results[0],
      itineraries: results[1]
    }
  };
};

export const cleanupExpiredRateLimits = async(): Promise<void> => {
  try {
    logger.info('Starting rate limit cleanup');
    logger.info('Rate limit cleanup completed');
  } catch (error) {
    logger.error('Rate limit cleanup failed', { error: (error as Error).message });
  }
};

declare global {
  namespace Express {
    interface Request {
      rateLimitInfo?: RateLimitInfo;
    }
  }
}

