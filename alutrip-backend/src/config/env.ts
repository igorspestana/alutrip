import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const envSchema = z.object({
  // Server
  PORT: z.string().transform(Number).default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Database
  DATABASE_URL: z.string().default('postgresql://alutrip_user:your_postgres_password@localhost:5432/alutrip_backend'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  
  // AI Services
  GROQ_API_KEY: z.string().default('your-groq-api-key'),
  GROQ_MODEL: z.string().default('llama3-8b-8192'),
  GEMINI_API_KEY: z.string().default('your-gemini-api-key'),
  GEMINI_MODEL: z.string().default('gemini-2.5-flash'),
  
  // Rate Limiting
  RATE_LIMIT_REQUESTS: z.string().transform(Number).default('5'),
  RATE_LIMIT_WINDOW: z.string().transform(Number).default('86400000'),
  RATE_LIMIT_CLEANUP_INTERVAL: z.string().transform(Number).default('3600000'),
  
  // PDF Configuration
  PDF_STORAGE_PATH: z.string().default('./pdfs'),
  PDF_MAX_PAGES: z.string().transform(Number).default('50'),
  PDF_TIMEOUT: z.string().transform(Number).default('300000'),
  
  // Queue Configuration
  REDIS_QUEUE_URL: z.string().default('redis://localhost:6379'),
  QUEUE_CONCURRENCY: z.string().transform(Number).default('5'),
  QUEUE_MAX_ATTEMPTS: z.string().transform(Number).default('3'),
  
  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('info'),
  LOG_DIR: z.string().default('logs'),
  
  // HTTP Client
  HTTP_TIMEOUT: z.string().transform(Number).default('30000'),
  GROQ_TIMEOUT: z.string().transform(Number).default('60000'),
  GEMINI_TIMEOUT: z.string().transform(Number).default('60000'),
  
  // CORS Configuration
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  CORS_CREDENTIALS: z.string().transform(val => val === 'true').default('false'),
  
  // Session Configuration
  SESSION_TIMEOUT: z.string().transform(Number).default('7200000')
});

type EnvType = z.infer<typeof envSchema>;

let config: EnvType;

try {
  // Parse and validate environment variables
  config = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Invalid environment variables:', JSON.stringify(error.format(), null, 2));
    process.exit(1);
  }
  throw error;
}

// Export validated environment
export { config };
export default config;

