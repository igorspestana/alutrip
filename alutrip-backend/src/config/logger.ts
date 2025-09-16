import winston from 'winston';
import path from 'path';
import { config } from './env';

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

export const logger = winston.createLogger({
  level: config.LOG_LEVEL,
  format: logFormat,
  defaultMeta: { service: 'alutrip-api' },
  transports: [
    // Write all logs with importance level of 'error' or less to error.log
    new winston.transports.File({
      filename: path.join(config.LOG_DIR, 'error.log'),
      level: 'error'
    }),
    // Write all logs to combined.log
    new winston.transports.File({
      filename: path.join(config.LOG_DIR, 'combined.log')
    }),
    // Separate log file for AI/LLM operations
    new winston.transports.File({
      filename: path.join(config.LOG_DIR, 'ai-operations.log'),
      level: 'info',
      format: winston.format.combine(
        logFormat,
        winston.format((info: any) => {
          const context = info.context;
          return (typeof context === 'string' && (context.includes('ai') || context.includes('llm'))) ? info : false;
        })()
      )
    })
  ]
});

// If we're not in production, log to console as well
if (config.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Helper functions for specific logging contexts
export const logAiOperation = (operation: string, data: any) => {
  logger.info(`AI Operation: ${operation}`, { context: 'ai', ...data });
};

export const logRateLimit = (ip: string, feature: string, action: string) => {
  logger.warn('Rate Limit Event', { context: 'rate-limit', ip, feature, action });
};

export const logSecurityEvent = (event: string, details: any) => {
  logger.warn('Security Event', {
    event,
    ip: details.ip,
    userAgent: details.userAgent,
    timestamp: new Date().toISOString(),
    details
  });
};

export default logger;

