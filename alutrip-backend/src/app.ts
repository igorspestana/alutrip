import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { config } from './config/env';
import { logger } from './config/logger';
import { initializeDatabase } from './config/database';
import { initializeRedis } from './config/redis';
import { routes } from './routes';
import { errorHandler, notFoundHandler } from './middleware/error-handler';

// Create Express application
const app = express();

// Security middleware
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

// CORS configuration
const corsOptions = {
  origin: config.CORS_ORIGIN,
  credentials: config.CORS_CREDENTIALS,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Compression middleware
app.use(compression());

// Body parsing middleware
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

// Routes
app.use('/', routes);

// 404 handler
app.use('*', notFoundHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

// Initialize database and Redis connections
const initializeServices = async(): Promise<void> => {
  try {
    await initializeDatabase();
    await initializeRedis();
    
    logger.info('All services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize services', { 
      error: (error as Error).message 
    });
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = async(signal: string): Promise<void> => {
  logger.info(`Received ${signal}, shutting down gracefully`);
  
  try {
    // Close database connections
    const { closeDatabase } = await import('./config/database');
    await closeDatabase();
    
    // Close Redis connections
    const { closeRedis } = await import('./config/redis');
    await closeRedis();
    
    logger.info('All connections closed, exiting process');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown', { 
      error: (error as Error).message 
    });
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception', { 
    error: error.message, 
    stack: error.stack 
  });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled Rejection', { 
    reason: reason?.message || reason,
    promise: promise.toString()
  });
  process.exit(1);
});

// Start server
const startServer = async(): Promise<void> => {
  try {
    // Initialize services
    await initializeServices();
    
    // Start HTTP server
    const PORT = config.PORT;
    
    const server = app.listen(PORT, () => {
      const baseUrl = `http://localhost:${PORT}`;
      
      // Server startup banner
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
      console.log(`   📚 API Documentation: ${baseUrl}/docs (coming soon)`);
      console.log(`   🔧 API Base: ${baseUrl}/api (coming soon)`);
      console.log('');
      console.log('🛡️  SECURITY SETTINGS:');
      console.log(`   🌐 CORS Origin: ${config.CORS_ORIGIN}`);
      console.log('   🚫 No Authentication Required');
      console.log(`   📊 Rate Limiting: IP-based (${config.RATE_LIMIT_REQUESTS} requests/24h per feature)`);
      console.log('');
      
      // Environment warnings
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
      
      // Also log to winston
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
    
    // Handle server errors
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

// Start the server
if (require.main === module) {
  startServer();
}

export default app;

