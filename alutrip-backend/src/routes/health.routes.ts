import { Router } from 'express';
import { healthController } from '../controllers/health.controller';

const router = Router();

/**
 * @swagger
 * /health:
 *   get:
 *     tags:
 *       - Health
 *     summary: API health check
 *     description: Basic health check endpoint to verify the API is running
 *     responses:
 *       200:
 *         description: API is healthy
 */
router.get('/', healthController.getHealth);

/**
 * @swagger
 * /health/detailed:
 *   get:
 *     tags:
 *       - Health
 *     summary: Detailed system information (for monitoring)
 *     description: Provides detailed information about the system status, including dependencies and environment
 *     responses:
 *       200:
 *         description: Detailed health information
 *       500:
 *         description: Failed to retrieve detailed health information
 */
router.get('/detailed', healthController.getDetailedHealth);

/**
 * @swagger
 * /health/ready:
 *   get:
 *     tags:
 *       - Health
 *     summary: Readiness probe (for Kubernetes)
 *     description: Indicates whether the application is ready to serve traffic
 *     responses:
 *       200:
 *         description: Application is ready
 *       503:
 *         description: Application is not ready
 */
router.get('/ready', healthController.getReadiness);

/**
 * @swagger
 * /health/live:
 *   get:
 *     tags:
 *       - Health
 *     summary: Liveness probe (for Kubernetes)
 *     description: Indicates whether the application is alive
 *     responses:
 *       200:
 *         description: Application is alive
 */
router.get('/live', healthController.getLiveness);

export { router as healthRoutes };

