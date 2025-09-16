import { Router } from 'express';
import { healthRoutes } from './health.routes';

const router = Router();

// Health check routes
router.use('/health', healthRoutes);

// API routes (to be added in future phases)
// router.use('/api/travel', travelRoutes);
// router.use('/api/itinerary', itineraryRoutes);
// router.use('/api/limits', rateLimitRoutes);
// router.use('/api/chat', chatRoutes);

export { router as routes };

