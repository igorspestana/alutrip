import { Router } from 'express';
import { ItineraryController } from '../controllers/itinerary.controller';

/**
 * Itinerary Routes
 * Handles all itinerary-related endpoints
 */
const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     ItineraryRequest:
 *       type: object
 *       required:
 *         - destination
 *         - start_date
 *         - end_date
 *       properties:
 *         destination:
 *           type: string
 *           minLength: 2
 *           maxLength: 255
 *           description: Travel destination
 *           example: "Tokyo, Japan"
 *         start_date:
 *           type: string
 *           format: date
 *           description: Start date in YYYY-MM-DD format
 *           example: "2024-04-15"
 *         end_date:
 *           type: string
 *           format: date
 *           description: End date in YYYY-MM-DD format
 *           example: "2024-04-22"
 *         budget:
 *           type: number
 *           minimum: 100
 *           maximum: 50000
 *           description: Budget in USD
 *           example: 2000
 *         interests:
 *           type: array
 *           maxItems: 10
 *           items:
 *             type: string
 *             maxLength: 50
 *           description: Array of interests
 *           example: ["culture", "food", "temples"]
 * 
 *     ItineraryResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Itinerary ID
 *           example: 456
 *         destination:
 *           type: string
 *           description: Travel destination
 *           example: "Tokyo, Japan"
 *         start_date:
 *           type: string
 *           format: date
 *           description: Start date
 *           example: "2024-04-15"
 *         end_date:
 *           type: string
 *           format: date
 *           description: End date
 *           example: "2024-04-22"
 *         processing_status:
 *           type: string
 *           enum: [pending, processing, completed, failed]
 *           description: Current processing status
 *           example: "pending"
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *           example: "2024-01-15T10:30:00Z"
 *         completed_at:
 *           type: string
 *           format: date-time
 *           description: Completion timestamp
 *           example: "2024-01-15T10:32:00Z"
 *         pdf_available:
 *           type: boolean
 *           description: Whether PDF is available for download
 *           example: true
 *         pdf_filename:
 *           type: string
 *           description: PDF filename
 *           example: "tokyo_itinerary_456.pdf"
 */

/**
 * @swagger
 * /api/itinerary/create:
 *   post:
 *     summary: Submit an itinerary request for generation
 *     description: Creates a new itinerary request that will be processed asynchronously. Limited to 5 requests per 24 hours per IP.
 *     tags:
 *       - Itinerary Planning
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ItineraryRequest'
 *     responses:
 *       200:
 *         description: Itinerary request submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 message:
 *                   type: string
 *                   example: "Itinerary request submitted successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 456
 *                     destination:
 *                       type: string
 *                       example: "Tokyo, Japan"
 *                     start_date:
 *                       type: string
 *                       format: date
 *                       example: "2024-04-15"
 *                     end_date:
 *                       type: string
 *                       format: date
 *                       example: "2024-04-22"
 *                     processing_status:
 *                       type: string
 *                       example: "pending"
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-15T10:30:00Z"
 *                     estimated_completion:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-15T10:35:00Z"
 *       400:
 *         description: Invalid input data
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Internal server error
 */
router.post('/create', ItineraryController.createItinerary);

/**
 * Process stuck itineraries that are pending for too long
 * POST /api/itinerary/process-stuck
 */
router.post('/process-stuck', ItineraryController.processStuckItineraries);

/**
 * TEST ENDPOINT: Create itinerary with forced direct processing
 * POST /api/itinerary/create-direct
 * This endpoint bypasses Bull queue and uses direct processing to test fallback
 */
router.post('/create-direct', ItineraryController.createItineraryDirect);

/**
 * @swagger
 * /api/itinerary/{id}/status:
 *   get:
 *     summary: Check the status of an itinerary generation
 *     description: Returns the current status of an itinerary processing request
 *     tags:
 *       - Itinerary Planning
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Itinerary ID
 *         example: 456
 *     responses:
 *       200:
 *         description: Itinerary status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 message:
 *                   type: string
 *                   example: "Itinerary status retrieved successfully"
 *                 data:
 *                   $ref: '#/components/schemas/ItineraryResponse'
 *       400:
 *         description: Invalid itinerary ID
 *       404:
 *         description: Itinerary not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id/status', ItineraryController.getItineraryStatus);

/**
 * @swagger
 * /api/itinerary/{id}/download:
 *   get:
 *     summary: Download the generated PDF itinerary
 *     description: Downloads the PDF file for a completed itinerary
 *     tags:
 *       - Itinerary Planning
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Itinerary ID
 *         example: 456
 *     responses:
 *       200:
 *         description: PDF downloaded successfully
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Itinerary not ready for download
 *       404:
 *         description: Itinerary not found
 *       410:
 *         description: PDF file no longer available
 *       500:
 *         description: Internal server error
 */
router.get('/:id/download', ItineraryController.downloadItinerary);

/**
 * @swagger
 * /api/itinerary/list:
 *   get:
 *     summary: List recent itineraries
 *     description: Returns a paginated list of recent itineraries with optional status filtering
 *     tags:
 *       - Itinerary Planning
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Number of itineraries to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of itineraries to skip
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, processing, completed, failed]
 *         description: Filter by processing status
 *     responses:
 *       200:
 *         description: Itineraries retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 message:
 *                   type: string
 *                   example: "Itineraries retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     itineraries:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ItineraryResponse'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 10
 *                         offset:
 *                           type: integer
 *                           example: 0
 *                         has_more:
 *                           type: boolean
 *                           example: false
 *       400:
 *         description: Invalid query parameters
 *       500:
 *         description: Internal server error
 */
router.get('/list', ItineraryController.listItineraries);

/**
 * @swagger
 * /api/itinerary/stats:
 *   get:
 *     summary: Get itinerary statistics
 *     description: Returns statistics about itinerary processing (for monitoring/admin purposes)
 *     tags:
 *       - Itinerary Planning
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 message:
 *                   type: string
 *                   example: "Itinerary statistics retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       description: Total itineraries created
 *                       example: 150
 *                     today:
 *                       type: integer
 *                       description: Itineraries created today
 *                       example: 5
 *                     byStatus:
 *                       type: object
 *                       properties:
 *                         pending:
 *                           type: integer
 *                           example: 2
 *                         processing:
 *                           type: integer
 *                           example: 1
 *                         completed:
 *                           type: integer
 *                           example: 140
 *                         failed:
 *                           type: integer
 *                           example: 7
 *                     byModel:
 *                       type: object
 *                       properties:
 *                         groq:
 *                           type: integer
 *                           example: 120
 *                         gemini:
 *                           type: integer
 *                           example: 30
 *                     avgProcessingTime:
 *                       type: integer
 *                       description: Average processing time in seconds
 *                       example: 180
 *                     avgProcessingTimeFormatted:
 *                       type: string
 *                       description: Formatted average processing time
 *                       example: "3 minutes"
 *       500:
 *         description: Internal server error
 */
router.get('/stats', ItineraryController.getStats);

/**
 * @swagger
 * /api/itinerary/history:
 *   get:
 *     summary: Get client itinerary history
 *     description: Returns the itinerary history for the current client IP address
 *     tags:
 *       - Itinerary Planning
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Number of itineraries to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of itineraries to skip
 *     responses:
 *       200:
 *         description: Client history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 message:
 *                   type: string
 *                   example: "Client itinerary history retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     client_ip:
 *                       type: string
 *                       example: "192.168.1.100"
 *                     itineraries:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ItineraryResponse'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         limit:
 *                           type: integer
 *                           example: 10
 *                         offset:
 *                           type: integer
 *                           example: 0
 *                         total:
 *                           type: integer
 *                           example: 3
 *                         has_more:
 *                           type: boolean
 *                           example: false
 *       400:
 *         description: Invalid query parameters
 *       500:
 *         description: Internal server error
 */
router.get('/history', ItineraryController.getClientHistory);

export { router as itineraryRoutes };
