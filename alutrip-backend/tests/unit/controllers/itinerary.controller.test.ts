jest.mock('pdfmake', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    createPdfKitDocument: jest.fn().mockReturnValue({
      pipe: jest.fn(),
      end: jest.fn()
    })
  }))
}));

import { Request, Response } from 'express';
import { ItineraryController } from '../../../src/controllers/itinerary.controller';
import { itineraryService } from '../../../src/services/itinerary.service';
import { pdfService } from '../../../src/services/pdf.service';
import { logger } from '../../../src/config/logger';
import * as queueConfig from '../../../src/config/queue';
import * as rateLimit from '../../../src/middleware/rate-limit';
import { createReadStream } from 'fs';
import {
  mockItineraryRequestData,
  mockItineraryPending,
  mockItineraryCompleted,
  mockItinerariesList,
  mockItineraryStats,
} from '../../fixtures/itinerary.fixtures';

// Mock dependencies
jest.mock('../../../src/services/itinerary.service');
jest.mock('../../../src/services/pdf.service');
jest.mock('../../../src/config/logger');
jest.mock('../../../src/config/queue');
jest.mock('../../../src/middleware/rate-limit');
jest.mock('../../../src/config/redis');
jest.mock('fs');

const mockedItineraryService = itineraryService as jest.Mocked<typeof itineraryService>;
const mockedPDFService = pdfService as jest.Mocked<typeof pdfService>;
const mockedLogger = logger as jest.Mocked<typeof logger>;
const mockedQueueConfig = queueConfig as jest.Mocked<typeof queueConfig>;
const mockedRateLimit = rateLimit as jest.Mocked<typeof rateLimit>;
const mockedCreateReadStream = createReadStream as jest.MockedFunction<typeof createReadStream>;

describe('ItineraryController', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonSpy: jest.Mock;
  let statusSpy: jest.Mock;
  let setHeaderSpy: jest.Mock;
  let pipeSpy: jest.Mock;
  let mockReadStream: any;

  beforeEach(() => {
    jsonSpy = jest.fn().mockReturnThis();
    statusSpy = jest.fn().mockReturnValue({ json: jsonSpy });
    setHeaderSpy = jest.fn().mockReturnThis();
    pipeSpy = jest.fn();

    mockReadStream = {
      pipe: pipeSpy,
      on: jest.fn().mockImplementation((_event: string, _callback: Function) => {
        return mockReadStream;
      })
    };

    (mockedCreateReadStream as jest.Mock).mockReturnValue(mockReadStream);

    req = {
      ip: '127.0.0.1',
      socket: {
        remoteAddress: '127.0.0.1'
      } as any,
      body: {},
      params: {},
      query: {},
      headers: {}
    };

    res = {
      status: statusSpy,
      json: jsonSpy,
      setHeader: setHeaderSpy,
      headersSent: false
    };

    jest.clearAllMocks();

    jest.spyOn(Date, 'now').mockReturnValue(new Date('2024-01-15T10:00:00.000Z').getTime());
    mockedItineraryService.getEstimatedCompletionTime.mockReturnValue(
      new Date('2024-01-15T10:05:00.000Z')
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createItinerary', () => {
    beforeEach(() => {
      req.body = mockItineraryRequestData;
      
      mockedRateLimit.getRateLimitInfo.mockResolvedValue({
        used: 1,
        limit: 5,
        remaining: 4,
        reset_time: '2024-01-16T10:00:00.000Z'
      });
    });

    it('should create itinerary successfully with queue processing', async () => {
      mockedItineraryService.createItinerary.mockResolvedValue(mockItineraryPending);
      mockedQueueConfig.addItineraryJob.mockResolvedValue(undefined);

      await ItineraryController.createItinerary(req as Request, res as Response);
      expect(mockedItineraryService.validateItineraryDates).toHaveBeenCalledWith(
        mockItineraryRequestData.start_date,
        mockItineraryRequestData.end_date
      );
      expect(mockedItineraryService.createItinerary).toHaveBeenCalledWith(
        '127.0.0.1',
        mockItineraryRequestData,
        undefined
      );
      expect(mockedQueueConfig.addItineraryJob).toHaveBeenCalledWith(mockItineraryPending.id);
      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        message: expect.stringContaining('Itinerary request submitted successfully via queue'),
        data: expect.objectContaining({
          id: mockItineraryPending.id,
          destination: mockItineraryPending.destination,
          processing_method: 'queue'
        })
      }));
    });

    it('should handle queue failure and use direct processing fallback', async () => {
      mockedItineraryService.createItinerary.mockResolvedValue(mockItineraryPending);
      mockedQueueConfig.addItineraryJob.mockRejectedValue(new Error('Queue connection failed'));
      
      jest.spyOn(global, 'setImmediate').mockImplementation((callback) => {
        callback();
        return 1 as any;
      });

      await ItineraryController.createItinerary(req as Request, res as Response);
      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        message: expect.stringContaining('Itinerary request submitted successfully via direct'),
        data: expect.objectContaining({
          processing_method: 'direct',
          queue_fallback_reason: 'Queue connection failed'
        })
      }));
      
      expect(mockedLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('direct background processing'),
        expect.any(Object)
      );
    });

    it('should handle rate limit exceeded', async () => {
      mockedRateLimit.getRateLimitInfo.mockResolvedValue({
        used: 5,
        limit: 5,
        remaining: 0,
        reset_time: '2024-01-16T10:00:00.000Z'
      });

      await ItineraryController.createItinerary(req as Request, res as Response);
      expect(statusSpy).toHaveBeenCalledWith(429);
      expect(jsonSpy).toHaveBeenCalledWith({
        status: 'error',
        message: 'Rate limit exceeded',
        data: {
          feature: 'itineraries',
          limit: 5,
          used: 5,
          reset_time: '2024-01-16T10:00:00.000Z'
        }
      });
      expect(mockedItineraryService.createItinerary).not.toHaveBeenCalled();
    });

    it('should handle validation errors', async () => {
      req.body = {
        destination: '',
        start_date: '2025-12-15',
        end_date: '2025-12-18',
        budget: -100,
        interests: []
      };

      await ItineraryController.createItinerary(req as Request, res as Response);
      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith(expect.objectContaining({
        status: 'error',
        message: 'Validation failed'
      }));
    });

    it('should handle date validation errors', async () => {
      const dateError = new Error('End date must be after start date');
      mockedItineraryService.validateItineraryDates.mockImplementation(() => {
        throw dateError;
      });

      await ItineraryController.createItinerary(req as Request, res as Response);
      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        status: 'error',
        message: 'End date must be after start date',
        data: {}
      });
    });
  });

  describe('getItineraryStatus', () => {
    it('should return itinerary status successfully', async () => {
      req.params = { id: '1' };
      mockedItineraryService.getItinerary.mockResolvedValue(mockItineraryCompleted);
      mockedItineraryService.isPDFAvailable.mockResolvedValue(true);

      await ItineraryController.getItineraryStatus(req as Request, res as Response);
      expect(mockedItineraryService.getItinerary).toHaveBeenCalledWith(1);
      expect(mockedItineraryService.isPDFAvailable).toHaveBeenCalledWith(mockItineraryCompleted);
      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        status: 'success',
        message: 'Itinerary status retrieved successfully',
        data: {
          id: mockItineraryCompleted.id,
          destination: mockItineraryCompleted.destination,
          processing_status: mockItineraryCompleted.processing_status,
          created_at: mockItineraryCompleted.created_at,
          completed_at: mockItineraryCompleted.completed_at,
          pdf_available: true,
          pdf_filename: mockItineraryCompleted.pdf_filename
        }
      });
    });

    it('should handle itinerary not found', async () => {
      req.params = { id: '999' };
      mockedItineraryService.getItinerary.mockResolvedValue(null);

      await ItineraryController.getItineraryStatus(req as Request, res as Response);
      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(jsonSpy).toHaveBeenCalledWith({
        status: 'error',
        message: 'Itinerary not found',
        data: {}
      });
    });
  });

  describe('downloadItinerary', () => {
    beforeEach(() => {
      req.params = { id: '1' };
      mockedItineraryService.getItinerary.mockResolvedValue(mockItineraryCompleted);
      mockedPDFService.pdfExists.mockResolvedValue(true);
      mockedPDFService.getPDFSize.mockResolvedValue(12345);
    });

    it('should stream PDF file successfully', async () => {
      await ItineraryController.downloadItinerary(req as Request, res as Response);
      expect(mockedPDFService.pdfExists).toHaveBeenCalledWith(mockItineraryCompleted.pdf_path);
      expect(mockedPDFService.getPDFSize).toHaveBeenCalledWith(mockItineraryCompleted.pdf_path);
      expect(setHeaderSpy).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(setHeaderSpy).toHaveBeenCalledWith('Content-Disposition', 
        `attachment; filename="${mockItineraryCompleted.pdf_filename}"`);
      expect(setHeaderSpy).toHaveBeenCalledWith('Content-Length', 12345);
      expect(mockedCreateReadStream).toHaveBeenCalledWith(mockItineraryCompleted.pdf_path);
      expect(pipeSpy).toHaveBeenCalledWith(res);
    });

    it('should handle itinerary not found', async () => {
      mockedItineraryService.getItinerary.mockResolvedValue(null);

      await ItineraryController.downloadItinerary(req as Request, res as Response);
      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(jsonSpy).toHaveBeenCalledWith({
        status: 'error',
        message: 'Itinerary not found',
        data: {}
      });
      expect(pipeSpy).not.toHaveBeenCalled();
    });

    it('should handle incomplete itinerary', async () => {
      const pendingItinerary = { ...mockItineraryCompleted, processing_status: 'processing' as const };
      mockedItineraryService.getItinerary.mockResolvedValue(pendingItinerary);

      await ItineraryController.downloadItinerary(req as Request, res as Response);
      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        status: 'error',
        message: 'Itinerary is not ready for download. Current status: processing',
        data: {
          processing_status: 'processing'
        }
      });
    });

    it('should handle missing PDF path', async () => {
      const noPdfItinerary = { ...mockItineraryCompleted, pdf_path: null as any, pdf_filename: null as any };
      mockedItineraryService.getItinerary.mockResolvedValue(noPdfItinerary);

      await ItineraryController.downloadItinerary(req as Request, res as Response);
      expect(statusSpy).toHaveBeenCalledWith(410);
      expect(jsonSpy).toHaveBeenCalledWith({
        status: 'error',
        message: 'PDF file is not available',
        data: {}
      });
    });

    it('should handle PDF file not found on disk', async () => {
      mockedPDFService.pdfExists.mockResolvedValue(false);

      await ItineraryController.downloadItinerary(req as Request, res as Response);
      expect(statusSpy).toHaveBeenCalledWith(410);
      expect(jsonSpy).toHaveBeenCalledWith({
        status: 'error',
        message: 'PDF file no longer available',
        data: {}
      });
    });

    it('should handle file stream errors', async () => {
      let errorCallback: Function | undefined;
      
      mockReadStream.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'error') {
          errorCallback = callback;
        }
        return mockReadStream;
      });

      await ItineraryController.downloadItinerary(req as Request, res as Response);
      
      if (errorCallback) {
        errorCallback(new Error('File read error'));
      }
      expect(mockedLogger.error).toHaveBeenCalledWith(
        'PDF file stream error',
        expect.objectContaining({
          error: 'File read error',
          itineraryId: mockItineraryCompleted.id
        })
      );
      
      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        status: 'error',
        message: 'Error reading PDF file',
        data: {}
      });
    });
  });

  describe('listItineraries', () => {
    beforeEach(() => {
      req.query = { limit: '10', offset: '0' };
      mockedItineraryService.getRecentItineraries.mockResolvedValue({
        itineraries: mockItinerariesList,
        total: mockItinerariesList.length,
        pagination: {
          total: mockItinerariesList.length,
          limit: 10,
          offset: 0,
          has_more: false
        }
      });
      mockedItineraryService.isPDFAvailable.mockResolvedValue(true);
    });

    it('should list itineraries successfully', async () => {
      await ItineraryController.listItineraries(req as Request, res as Response);
      expect(mockedItineraryService.getRecentItineraries).toHaveBeenCalledWith(10, 0, undefined);
      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        status: 'success',
        message: 'Itineraries retrieved successfully',
        data: {
          itineraries: expect.arrayContaining([
            expect.objectContaining({
              id: mockItinerariesList[0]?.id,
              destination: mockItinerariesList[0]?.destination,
              pdf_available: true
            })
          ]),
          pagination: expect.any(Object)
        }
      });
    });

    it('should filter by status when provided', async () => {
      req.query = { ...req.query, status: 'completed' };

      await ItineraryController.listItineraries(req as Request, res as Response);
      expect(mockedItineraryService.getRecentItineraries).toHaveBeenCalledWith(10, 0, 'completed');
    });
  });

  describe('getStats', () => {
    it('should return itinerary statistics', async () => {
      mockedItineraryService.getStats.mockResolvedValue(mockItineraryStats);

      await ItineraryController.getStats(req as Request, res as Response);
      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        status: 'success',
        message: 'Itinerary statistics retrieved successfully',
        data: expect.objectContaining({
          ...mockItineraryStats,
          avgProcessingTimeFormatted: expect.any(String)
        })
      });
    });

    it('should handle errors during stats retrieval', async () => {
      mockedItineraryService.getStats.mockRejectedValue(new Error('Database error'));

      await ItineraryController.getStats(req as Request, res as Response);
      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        status: 'error',
        message: 'Internal server error',
        data: {}
      });
      expect(mockedLogger.error).toHaveBeenCalled();
    });
  });

  describe('getClientHistory', () => {
    it('should return client itinerary history', async () => {
      req.query = { limit: '5', offset: '0' };
      mockedItineraryService.getClientItineraries.mockResolvedValue(mockItinerariesList);
      mockedItineraryService.isPDFAvailable.mockResolvedValue(true);

      await ItineraryController.getClientHistory(req as Request, res as Response);
      expect(mockedItineraryService.getClientItineraries).toHaveBeenCalledWith('127.0.0.1', 5, 0);
      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        status: 'success',
        message: 'Client itinerary history retrieved successfully',
        data: expect.objectContaining({
          client_ip: '127.0.0.1',
          itineraries: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(Number),
              destination: expect.any(String),
              pdf_available: true
            })
          ])
        })
      });
    });
  });

  describe('processStuckItineraries', () => {
    it('should process stuck itineraries', async () => {
      mockedItineraryService.getPendingItineraries.mockResolvedValue(mockItinerariesList);
      
      jest.spyOn(global, 'setImmediate').mockImplementation((callback) => {
        callback();
        return 1 as any;
      });

      await ItineraryController.processStuckItineraries(req as Request, res as Response);
      expect(mockedItineraryService.getPendingItineraries).toHaveBeenCalledWith(10);
      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        message: expect.stringContaining('Processing'),
        data: {
          processed_ids: expect.arrayContaining([expect.any(Number)]),
          total_processed: mockItinerariesList.length,
          stuck_threshold: '2 minutes',
          method: 'direct-fallback',
          estimated_completion: expect.any(Date)
        }
      }));
      
      expect(mockedItineraryService.processItinerary).toHaveBeenCalledTimes(mockItinerariesList.length);
    });

    it('should handle no stuck itineraries', async () => {
      mockedItineraryService.getPendingItineraries.mockResolvedValue([]);

      await ItineraryController.processStuckItineraries(req as Request, res as Response);
      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        message: 'No stuck itineraries found',
        data: {
          checked: 0,
          processed: 0,
          stuck_threshold: '30 seconds'
        }
      }));
    });
  });

  describe('createItineraryDirect', () => {
    it('should create itinerary with direct processing', async () => {
      req.body = mockItineraryRequestData;
      mockedItineraryService.createItinerary.mockResolvedValue(mockItineraryPending);
      
      jest.spyOn(global, 'setImmediate').mockImplementation((callback) => {
        callback();
        return 1 as any;
      });

      await ItineraryController.createItineraryDirect(req as Request, res as Response);
      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        message: expect.stringContaining('TEST: Itinerary request submitted successfully'),
        data: expect.objectContaining({
          processing_method: 'direct-forced',
          test_mode: true
        })
      }));
      
      expect(mockedItineraryService.processItinerary).toHaveBeenCalledWith(mockItineraryPending.id);
    });
  });
});
