import { Router } from 'express';
import { healthRoutes } from './health.routes';
import { travelRoutes } from './travel.routes';

const router = Router();

// Health check routes
router.use('/health', healthRoutes);

// API routes
router.use('/api/travel', travelRoutes);

// Future API routes (to be added in future phases)
// router.use('/api/itinerary', itineraryRoutes);
// router.use('/api/limits', rateLimitRoutes);
// router.use('/api/chat', chatRoutes);

export { router as routes };

