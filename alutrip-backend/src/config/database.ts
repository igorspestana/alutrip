import { Pool, PoolConfig } from 'pg';
import { config } from './env';
import { logger } from './logger';

// Database connection configuration
const poolConfig: PoolConfig = {
  connectionString: config.DATABASE_URL,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 2000, // How long to wait when connecting a new client
  statement_timeout: 30000, // Maximum duration of any statement
  query_timeout: 30000 // Maximum duration of any query
};

// Create connection pool
export const pool = new Pool(poolConfig);

// Pool event handlers
pool.on('connect', () => {
  logger.info('Database client connected', { 
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount
  });
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle database client', { error: err.message });
});

pool.on('acquire', () => {
  logger.debug('Database client acquired from pool');
});

pool.on('release', () => {
  logger.debug('Database client released back to pool');
});

// Database health check
export const checkDatabaseHealth = async(): Promise<boolean> => {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    logger.info('Database health check passed');
    return true;
  } catch (error) {
    logger.error('Database health check failed', { error: (error as Error).message });
    return false;
  }
};

// Execute a query with automatic error handling and logging
export const query = async(text: string, params?: any[]): Promise<any> => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    
    logger.debug('Database query executed', {
      text,
      params: params?.map(() => '[PARAM]'), // Hide parameter values for security
      duration: `${duration}ms`,
      rows: result.rowCount
    });
    
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    logger.error('Database query failed', {
      text,
      params: params?.map(() => '[PARAM]'),
      duration: `${duration}ms`,
      error: (error as Error).message
    });
    throw error;
  }
};

// Get a client from the pool for transactions
export const getClient = async() => {
  try {
    const client = await pool.connect();
    return client;
  } catch (error) {
    logger.error('Failed to get database client from pool', { error: (error as Error).message });
    throw error;
  }
};

// Graceful shutdown
export const closeDatabase = async(): Promise<void> => {
  try {
    await pool.end();
    logger.info('Database pool closed gracefully');
  } catch (error) {
    logger.error('Error closing database pool', { error: (error as Error).message });
  }
};

// Initialize database connection
export const initializeDatabase = async(): Promise<void> => {
  try {
    const isHealthy = await checkDatabaseHealth();
    if (!isHealthy) {
      throw new Error('Database health check failed');
    }
    logger.info('Database initialized successfully', {
      connectionString: config.DATABASE_URL.replace(/:\/\/([^:]+):([^@]+)@/, '://[USER]:[PASSWORD]@')
    });
  } catch (error) {
    logger.error('Failed to initialize database', { error: (error as Error).message });
    throw error;
  }
};

export default pool;

