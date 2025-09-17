import { Router } from 'express';
import { healthRoutes } from './health.routes';
import { travelRoutes } from './travel.routes';
import { itineraryRoutes } from './itinerary.routes';
import { debugRoutes } from './debug.routes';

const router = Router();

// Health check routes
router.use('/health', healthRoutes);

// API routes
router.use('/api/travel', travelRoutes);
router.use('/api/itinerary', itineraryRoutes);

// Debug routes (development only)
router.use('/debug', debugRoutes);

// Future API routes (to be added in future phases)
// router.use('/api/limits', rateLimitRoutes);
// router.use('/api/chat', chatRoutes);

export { router as routes };

