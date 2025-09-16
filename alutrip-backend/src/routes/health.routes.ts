import { Router } from 'express';
import { healthController } from '@/controllers/health.controller';

const router = Router();

// Basic health check endpoint
router.get('/', healthController.getHealth);

// Detailed health check (for monitoring)
router.get('/detailed', healthController.getDetailedHealth);

// Readiness probe (for Kubernetes)
router.get('/ready', healthController.getReadiness);

// Liveness probe (for Kubernetes)
router.get('/live', healthController.getLiveness);

export { router as healthRoutes };

