import Redis from 'ioredis';
import { config } from './env';
import { logger } from './logger';

const redisConfig = {
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
  connectTimeout: 10000,
  commandTimeout: 5000,
  retryDelayOnClusterDown: 300
};

export const redis = new Redis(config.REDIS_URL, redisConfig);

export const queueRedis = new Redis(config.REDIS_QUEUE_URL || config.REDIS_URL, redisConfig);

redis.on('connect', () => {
  logger.info('Redis client connected');
});

redis.on('ready', () => {
  logger.info('Redis client ready');
});

redis.on('error', (error) => {
  logger.error('Redis client error', { error: error.message });
});

redis.on('close', () => {
  logger.info('Redis client connection closed');
});

redis.on('reconnecting', () => {
  logger.info('Redis client reconnecting');
});

queueRedis.on('connect', () => {
  logger.info('Queue Redis client connected');
});

queueRedis.on('ready', () => {
  logger.info('Queue Redis client ready');
});

queueRedis.on('error', (error) => {
  logger.error('Queue Redis client error', { error: error.message });
});

export const checkRedisHealth = async(): Promise<boolean> => {
  try {
    const pong = await redis.ping();
    if (pong === 'PONG') {
      logger.info('Redis health check passed');
      return true;
    }
    return false;
  } catch (error) {
    logger.error('Redis health check failed', { error: (error as Error).message });
    return false;
  }
};

export const getRateLimit = async(key: string): Promise<number> => {
  try {
    const count = await redis.get(key);
    return count ? parseInt(count, 10) : 0;
  } catch (error) {
    logger.error('Failed to get rate limit', { key, error: (error as Error).message });
    return 0;
  }
};

export const incrementRateLimit = async(key: string, windowMs: number): Promise<number> => {
  try {
    const pipeline = redis.pipeline();
    pipeline.incr(key);
    pipeline.expire(key, Math.ceil(windowMs / 1000));
    const results = await pipeline.exec();
    
    if (results && results[0] && results[0][1]) {
      const count = results[0][1] as number;
      logger.debug('Rate limit incremented', { key, count });
      return count;
    }
    return 1;
  } catch (error) {
    logger.error('Failed to increment rate limit', { key, error: (error as Error).message });
    throw error;
  }
};

export const getRateLimitTTL = async(key: string): Promise<number> => {
  try {
    const ttl = await redis.ttl(key);
    return ttl > 0 ? ttl : 0;
  } catch (error) {
    logger.error('Failed to get rate limit TTL', { key, error: (error as Error).message });
    return 0;
  }
};

export const getCachedValue = async(key: string): Promise<string | null> => {
  try {
    const value = await redis.get(key);
    logger.debug('Cache get', { key, hit: !!value });
    return value;
  } catch (error) {
    logger.error('Failed to get cached value', { key, error: (error as Error).message });
    return null;
  }
};

export const setCachedValue = async(key: string, value: string, ttlSeconds?: number): Promise<void> => {
  try {
    if (ttlSeconds) {
      await redis.setex(key, ttlSeconds, value);
    } else {
      await redis.set(key, value);
    }
    logger.debug('Cache set', { key, ttl: ttlSeconds });
  } catch (error) {
    logger.error('Failed to set cached value', { key, error: (error as Error).message });
  }
};

export const deleteCachedValue = async(key: string): Promise<void> => {
  try {
    await redis.del(key);
    logger.debug('Cache delete', { key });
  } catch (error) {
    logger.error('Failed to delete cached value', { key, error: (error as Error).message });
  }
};

export const closeRedis = async(): Promise<void> => {
  try {
    await redis.quit();
    await queueRedis.quit();
    logger.info('Redis connections closed gracefully');
  } catch (error) {
    logger.error('Error closing Redis connections', { error: (error as Error).message });
  }
};

export const initializeRedis = async(): Promise<void> => {
  try {
    await redis.connect();
    await queueRedis.connect();
    
    const isHealthy = await checkRedisHealth();
    if (!isHealthy) {
      throw new Error('Redis health check failed');
    }
    
    logger.info('Redis initialized successfully', {
      url: config.REDIS_URL.replace(/:\/\/([^:]+):([^@]+)@/, '://[USER]:[PASSWORD]@')
    });
  } catch (error) {
    logger.error('Failed to initialize Redis', { error: (error as Error).message });
    throw error;
  }
};

export default redis;

