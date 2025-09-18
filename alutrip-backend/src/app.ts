import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { config } from './config/env';
import { logger } from './config/logger';
import { initializeDatabase } from './config/database';
import { initializeRedis } from './config/redis';
import { initializeQueue } from './config/queue';
import { startWorker } from './jobs/worker';
import { startAutoFallback } from './jobs/auto-fallback.job';
import { routes } from './routes';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import { errorHandler, notFoundHandler } from './middleware/error-handler';

const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
const corsOptions = {
  origin: config.CORS_ORIGIN,
  credentials: config.CORS_CREDENTIALS,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Trust proxy (for accurate IP addresses behind load balancers)
app.set('trust proxy', true);

// Request logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    logger.info('HTTP Request', {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      contentLength: res.get('content-length'),
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  });
  
  next();
});

app.use('/', routes);

// Swagger docs (available without auth; restrict in production if needed)
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

app.use('*', notFoundHandler);
app.use(errorHandler);

const initializeServices = async(): Promise<void> => {
  try {
    await initializeDatabase();
    await initializeRedis();
    await initializeQueue();
    
    await startWorker();
    startAutoFallback();
    
    logger.info('All services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize services', { 
      error: (error as Error).message 
    });
    process.exit(1);
  }
};

const gracefulShutdown = async(signal: string): Promise<void> => {
  logger.info(`Received ${signal}, shutting down gracefully`);
  
  try {
    const { closeDatabase } = await import('./config/database');
    await closeDatabase();
    
    const { closeRedis } = await import('./config/redis');
    await closeRedis();
    
    const { closeQueue } = await import('./config/queue');
    await closeQueue();
    
    const { stopWorker } = await import('./jobs/worker');
    await stopWorker();
    
    const { stopAutoFallback } = await import('./jobs/auto-fallback.job');
    stopAutoFallback();
    
    logger.info('All connections closed, exiting process');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown', { 
      error: (error as Error).message 
    });
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception', { 
    error: error.message, 
    stack: error.stack 
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled Rejection', { 
    reason: reason?.message || reason,
    promise: promise.toString()
  });
  process.exit(1);
});

const startServer = async(): Promise<void> => {
  try {
    await initializeServices();
    
    const PORT = config.PORT;
    
    const server = app.listen(PORT, () => {
      const baseUrl = `http://localhost:${PORT}`;
      
      console.log('\n' + '='.repeat(60));
      console.log('🚀 AluTrip Travel Assistant API');
      console.log('='.repeat(60));
      console.log(`🌍 Environment: ${config.NODE_ENV.toUpperCase()}`);
      console.log(`📡 Server running on: ${baseUrl}`);
      console.log(`🕐 Started at: ${new Date().toLocaleString()}`);
      console.log('');
      console.log('📍 AVAILABLE ENDPOINTS:');
      console.log(`   🏥 Health Check: ${baseUrl}/health`);
      console.log(`   🔧 Detailed Health: ${baseUrl}/health/detailed`);
      console.log(`   📚 API Documentation: ${baseUrl}/docs`);
      console.log('');
      console.log('🛡️  SECURITY SETTINGS:');
      console.log(`   🌐 CORS Origin: ${config.CORS_ORIGIN}`);
      console.log('   🚫 No Authentication Required');
      console.log(`   📊 Rate Limiting: IP-based (${config.RATE_LIMIT_REQUESTS} requests/24h per feature)`);
      console.log('');
      
      const warnings = [];
      if (config.GROQ_API_KEY.includes('your-groq-api-key')) {
        warnings.push('⚠️  Groq API Key is using default value');
      }
      if (config.GEMINI_API_KEY.includes('your-gemini-api-key')) {
        warnings.push('⚠️  Gemini API Key is using default value');
      }
      
      if (warnings.length > 0) {
        console.log('⚠️  CONFIGURATION WARNINGS:');
        warnings.forEach(warning => console.log(`   ${warning}`));
        console.log('   💡 Create .env file with your actual AI API keys');
        console.log('');
      }
      
      console.log('💡 QUICK COMMANDS:');
      console.log('   • Test API: curl ' + baseUrl + '/health');
      console.log('   • Detailed Health: curl ' + baseUrl + '/health/detailed');
      console.log('   • Stop Server: Ctrl+C');
      console.log('='.repeat(60) + '\n');
      
      logger.info('='.repeat(60));
      logger.info(`🌍 Environment: ${config.NODE_ENV.toUpperCase()}`);
      logger.info(`🚀 AluTrip Travel Assistant API server started on port ${PORT}`);
      logger.info(`🏥 Health check available at: ${baseUrl}/health`);
      logger.info(`🛡️  SECURITY SETTINGS:
   🌐 CORS Origin: ${config.CORS_ORIGIN}
   🚫 No Authentication Required
   📊 Rate Limiting: IP-based (${config.RATE_LIMIT_REQUESTS} requests/24h per feature)`); 
      logger.info('='.repeat(60));
    });
    
    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${PORT} is already in use`);
        process.exit(1);
      } else {
        logger.error('Server error', { error: error.message });
        process.exit(1);
      }
    });
    
  } catch (error) {
    logger.error('Failed to start server', { 
      error: (error as Error).message 
    });
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

export default app;

