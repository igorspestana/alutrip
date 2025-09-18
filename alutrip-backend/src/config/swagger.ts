import swaggerJSDoc, { OAS3Options } from 'swagger-jsdoc';
import path from 'path';

const swaggerDefinition = {
  openapi: '3.0.3',
  info: {
    title: 'AluTrip Travel Assistant API',
    version: '1.0.0',
    description: 'Open API for AluTrip - travel questions and itinerary planning. No authentication required.',
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Local development server',
    },
  ],
  tags: [
    { name: 'Health', description: 'Health and readiness endpoints' },
    { name: 'Travel Q&A', description: 'Ask and retrieve travel questions' },
    { name: 'Itinerary Planning', description: 'Create and manage itineraries' },
  ],
  components: {
    responses: {
      RateLimited: {
        description: 'Rate limit exceeded',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'error' },
                message: { type: 'string', example: 'Rate limit exceeded.' },
                data: {
                  type: 'object',
                  properties: {
                    rateLimitExceeded: { type: 'boolean', example: true },
                    resetTime: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

const options: OAS3Options = {
  swaggerDefinition,
  apis: [
    path.join(__dirname, '..', 'routes', '*.ts'),
  ],
};

export const swaggerSpec = swaggerJSDoc(options);


