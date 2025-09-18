import axios from 'axios';
import { logger } from './logger';
import { config } from './env';

export const httpClient = axios.create({
  timeout: config.HTTP_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'AluTrip/1.0.0'
  }
});

export const groqClient = axios.create({
  baseURL: 'https://api.groq.com/openai/v1',
  timeout: config.GROQ_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${config.GROQ_API_KEY}`
  }
});

export const geminiClient = axios.create({
  baseURL: 'https://generativelanguage.googleapis.com/v1',
  timeout: config.GEMINI_TIMEOUT,
  headers: {
    'Content-Type': 'application/json'
  }
});

const addRequestStartTime = (config: any) => {
  (config as any).metadata = { requestStartedAt: Date.now() };
  return config;
};

[httpClient, groqClient, geminiClient].forEach(client => {
  client.interceptors.request.use(
    (requestConfig) => {
      const configWithStartTime = addRequestStartTime(requestConfig);
      
      logger.info('HTTP Request', {
        method: configWithStartTime.method,
        url: configWithStartTime.url,
        baseURL: configWithStartTime.baseURL,
        headers: { 
          ...configWithStartTime.headers, 
          Authorization: configWithStartTime.headers?.Authorization ? '[REDACTED]' : undefined 
        }
      });
      return configWithStartTime;
    },
    (error) => {
      logger.error('HTTP Request Error', { error: error.message });
      return Promise.reject(error);
    }
  );

  client.interceptors.response.use(
    (response) => {
      const duration = (response.config as any).metadata?.requestStartedAt 
        ? Date.now() - (response.config as any).metadata.requestStartedAt 
        : undefined;
        
      logger.info('HTTP Response', {
        status: response.status,
        url: response.config.url,
        method: response.config.method,
        duration: duration ? `${duration}ms` : undefined
      });
      return response;
    },
    (error) => {
      if (axios.isAxiosError(error)) {
        const duration = (error.config as any)?.metadata?.requestStartedAt 
          ? Date.now() - (error.config as any).metadata.requestStartedAt 
          : undefined;
          
        logger.error('HTTP Response Error', {
          status: error.response?.status,
          url: error.config?.url,
          method: error.config?.method,
          message: error.message,
          duration: duration ? `${duration}ms` : undefined,
          response: error.response?.data
        });
      }
      return Promise.reject(error);
    }
  );
});

export default { httpClient, groqClient, geminiClient };
