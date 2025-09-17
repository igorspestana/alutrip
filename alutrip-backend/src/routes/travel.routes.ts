import { Router } from 'express';
import { travelController } from '../controllers/travel.controller';
import { travelQuestionsRateLimit } from '../middleware/rate-limit';

const router = Router();

/**
 * Travel Q&A Routes (AluTrip Responde)
 * 
 * All endpoints are rate limited to 5 requests per 24 hours per IP
 * No authentication required - open access travel assistance
 */

// Apply rate limiting to travel question endpoints
const travelRateLimit = travelQuestionsRateLimit;

/**
 * @swagger
 * components:
 *   schemas:
 *     TravelQuestionRequest:
 *       type: object
 *       required:
 *         - question
 *         - model
 *       properties:
 *         question:
 *           type: string
 *           minLength: 10
 *           maxLength: 1000
 *           description: The travel question to ask. Only travel-related questions will be answered - non-travel questions will receive a polite decline response.
 *           example: "What's the best time to visit Japan?"
 *         model:
 *           type: string
 *           enum: [groq, gemini]
 *           description: AI model to use for processing
 *           example: "groq"
 *     
 *     TravelQuestionResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Unique question ID
 *           example: 123
 *         question:
 *           type: string
 *           description: The original question
 *           example: "What's the best time to visit Japan?"
 *         response:
 *           type: string
 *           description: AI-generated response
 *           example: "The best time to visit Japan is during spring (March to May)..."
 *         model_used:
 *           type: string
 *           enum: [groq, gemini]
 *           description: AI model used for processing
 *           example: "groq"
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: When the question was processed
 *           example: "2024-01-15T10:30:00Z"
 *     
 *     ModelHealth:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           enum: [healthy, unhealthy]
 *           description: Health status of the model
 *         error:
 *           type: string
 *           description: Error message if unhealthy
 *         model:
 *           type: string
 *           description: Model name/version
 *         available:
 *           type: boolean
 *           description: Whether the model is available
 *     
 *     TravelStats:
 *       type: object
 *       properties:
 *         total:
 *           type: integer
 *           description: Total questions processed
 *         today:
 *           type: integer
 *           description: Questions processed today
 *         byModel:
 *           type: object
 *           properties:
 *             groq:
 *               type: integer
 *               description: Questions processed by Groq
 *             gemini:
 *               type: integer
 *               description: Questions processed by Gemini
 *         avgResponseLength:
 *           type: integer
 *           description: Average response length in characters
 */

/**
 * @swagger
 * /api/travel/ask:
 *   post:
 *     tags:
 *       - Travel Q&A
 *     summary: Submit a travel question
 *     description: Submit a travel question and receive an AI-generated response using either Groq or Gemini models. The system includes guardrails to ensure only travel-related questions are answered - non-travel questions will receive a polite decline response.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TravelQuestionRequest'
 *           examples:
 *             groq_example:
 *               summary: Question with Groq model
 *               value:
 *                 question: "What's the best time to visit Japan for cherry blossoms?"
 *                 model: "groq"
 *             gemini_example:
 *               summary: Question with Gemini model
 *               value:
 *                 question: "What are the must-see attractions in Paris?"
 *                 model: "gemini"
 *     responses:
 *       200:
 *         description: Travel question answered successfully
 *         headers:
 *           X-Processing-Time:
 *             description: Time taken to process the request
 *             schema:
 *               type: string
 *               example: "2500ms"
 *           X-RateLimit-Limit:
 *             description: Rate limit maximum requests
 *             schema:
 *               type: integer
 *               example: 5
 *           X-RateLimit-Remaining:
 *             description: Rate limit remaining requests
 *             schema:
 *               type: integer
 *               example: 4
 *           X-RateLimit-Reset:
 *             description: Rate limit reset time
 *             schema:
 *               type: string
 *               example: "2024-01-16T10:30:00Z"
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
 *                   example: "Travel question answered successfully"
 *                 data:
 *                   $ref: '#/components/schemas/TravelQuestionResponse'
 *       400:
 *         description: Invalid request data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 message:
 *                   type: string
 *                   example: "Invalid request data"
 *                 data:
 *                   type: object
 *                   properties:
 *                     validationErrors:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           field:
 *                             type: string
 *                           message:
 *                             type: string
 *       429:
 *         description: Rate limit exceeded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 message:
 *                   type: string
 *                   example: "Rate limit exceeded. You have reached the maximum of 5 questions per 24 hours."
 *                 data:
 *                   type: object
 *                   properties:
 *                     rateLimitExceeded:
 *                       type: boolean
 *                       example: true
 *                     resetTime:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-16T10:30:00Z"
 *       503:
 *         description: AI service temporarily unavailable
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 message:
 *                   type: string
 *                   example: "AI service is temporarily unavailable. Please try again later."
 *                 data:
 *                   type: object
 */
router.post('/ask', travelRateLimit, travelController.askQuestion);

/**
 * @swagger
 * /api/travel/questions/{id}:
 *   get:
 *     tags:
 *       - Travel Q&A
 *     summary: Get a specific travel question
 *     description: Retrieve a specific travel question and its AI-generated response by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Question ID
 *         schema:
 *           type: integer
 *           minimum: 1
 *           example: 123
 *     responses:
 *       200:
 *         description: Travel question retrieved successfully
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
 *                   example: "Travel question retrieved successfully"
 *                 data:
 *                   $ref: '#/components/schemas/TravelQuestionResponse'
 *       400:
 *         description: Invalid question ID
 *       404:
 *         description: Travel question not found
 *       500:
 *         description: Internal server error
 */
router.get('/questions/:id', travelController.getQuestion);

/**
 * @swagger
 * /api/travel/questions:
 *   get:
 *     tags:
 *       - Travel Q&A
 *     summary: Get recent travel questions
 *     description: Retrieve recent travel questions with pagination support
 *     parameters:
 *       - in: query
 *         name: limit
 *         description: Number of questions to return
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *           example: 10
 *       - in: query
 *         name: offset
 *         description: Number of questions to skip
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *           example: 0
 *     responses:
 *       200:
 *         description: Recent travel questions retrieved successfully
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
 *                   example: "Recent travel questions retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     questions:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/TravelQuestionResponse'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                           example: 150
 *                         limit:
 *                           type: integer
 *                           example: 10
 *                         offset:
 *                           type: integer
 *                           example: 0
 *                         hasMore:
 *                           type: boolean
 *                           example: true
 *       400:
 *         description: Invalid query parameters
 *       500:
 *         description: Internal server error
 */
router.get('/questions', travelController.getRecentQuestions);

/**
 * @swagger
 * /api/travel/models/health:
 *   get:
 *     tags:
 *       - Travel Q&A
 *     summary: Check AI models health
 *     description: Check the health and availability of AI models (Groq and Gemini)
 *     responses:
 *       200:
 *         description: All AI models are healthy
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
 *                   example: "AI models health check completed - healthy"
 *                 data:
 *                   type: object
 *                   properties:
 *                     groq:
 *                       $ref: '#/components/schemas/ModelHealth'
 *                     gemini:
 *                       $ref: '#/components/schemas/ModelHealth'
 *                     overall:
 *                       type: string
 *                       enum: [healthy, partial, unhealthy]
 *                       example: "healthy"
 *       206:
 *         description: Some AI models are healthy (partial availability)
 *       503:
 *         description: All AI models are unhealthy
 *       500:
 *         description: Failed to check AI models health
 */
router.get('/models/health', travelController.checkModelsHealth);

/**
 * @swagger
 * /api/travel/stats:
 *   get:
 *     tags:
 *       - Travel Q&A
 *     summary: Get travel questions statistics
 *     description: Retrieve statistics about processed travel questions
 *     responses:
 *       200:
 *         description: Travel questions statistics retrieved successfully
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
 *                   example: "Travel questions statistics retrieved successfully"
 *                 data:
 *                   $ref: '#/components/schemas/TravelStats'
 *       500:
 *         description: Internal server error
 */
router.get('/stats', travelController.getStats);

/**
 * @swagger
 * /api/travel/history:
 *   get:
 *     tags:
 *       - Travel Q&A
 *     summary: Get client travel history
 *     description: Retrieve travel question history for the current client (based on IP address)
 *     parameters:
 *       - in: query
 *         name: limit
 *         description: Number of questions to return
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *           example: 10
 *       - in: query
 *         name: offset
 *         description: Number of questions to skip
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *           example: 0
 *     responses:
 *       200:
 *         description: Client travel history retrieved successfully
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
 *                   example: "Client travel history retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     questions:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/TravelQuestionResponse'
 *                     clientIp:
 *                       type: string
 *                       example: "192.168.1.1"
 *                     total:
 *                       type: integer
 *                       example: 3
 *       400:
 *         description: Invalid query parameters
 *       500:
 *         description: Internal server error
 */
router.get('/history', travelController.getClientHistory);

export { router as travelRoutes };
