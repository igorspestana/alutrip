import { ItineraryService } from '../../src/services/itinerary.service';
import { ItinerariesModel } from '../../src/models/itineraries.model';
import { aiService } from '../../src/services/ai.service';
import { pdfService } from '../../src/services/pdf.service';
import { logger } from '../../src/config/logger';
import {
  mockItineraryRequestData,
  mockItineraryPending,
  mockItineraryCompleted,
  mockItinerariesList,
  mockItineraryStats,
  mockAIItineraryResponse,
  mockPDFServiceResponse,
  mockRecentItinerariesResponse,
  testClientIp,
  testSessionId,
  validDateRanges,
  itineraryPromptTestCases,
  itineraryErrorScenarios
} from '../fixtures/itinerary.fixtures';

// Mock dependencies
jest.mock('../../src/models/itineraries.model');
jest.mock('../../src/services/ai.service');
jest.mock('../../src/services/pdf.service');
jest.mock('../../src/config/logger');

const mockedItinerariesModel = ItinerariesModel as jest.Mocked<typeof ItinerariesModel>;
const mockedAIService = aiService as jest.Mocked<typeof aiService>;
const mockedPDFService = pdfService as jest.Mocked<typeof pdfService>;
const mockedLogger = logger as jest.Mocked<typeof logger>;

describe('ItineraryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock current time for consistent testing
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2024-01-15T10:00:00.000Z').getTime());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createItinerary', () => {
    it('should create itinerary successfully', async () => {
      // Arrange
      mockedItinerariesModel.create.mockResolvedValue(mockItineraryPending);

      // Act
      const result = await ItineraryService.createItinerary(
        testClientIp,
        mockItineraryRequestData,
        testSessionId
      );

      // Assert
      expect(result).toEqual(mockItineraryPending);
      expect(mockedItinerariesModel.create).toHaveBeenCalledWith(
        testClientIp,
        mockItineraryRequestData.destination,
        new Date(mockItineraryRequestData.start_date),
        new Date(mockItineraryRequestData.end_date),
        mockItineraryRequestData,
        testSessionId,
        mockItineraryRequestData.budget,
        mockItineraryRequestData.interests
      );

      expect(mockedLogger.info).toHaveBeenCalledWith(
        'Creating itinerary request',
        expect.objectContaining({
          clientIp: testClientIp,
          destination: mockItineraryRequestData.destination
        })
      );

      expect(mockedLogger.info).toHaveBeenCalledWith(
        'Itinerary request created successfully',
        expect.objectContaining({
          itineraryId: mockItineraryPending.id,
          destination: mockItineraryRequestData.destination
        })
      );
    });

    it('should handle database errors during creation', async () => {
      // Arrange
      mockedItinerariesModel.create.mockRejectedValue(itineraryErrorScenarios.databaseError);

      // Act & Assert
      await expect(
        ItineraryService.createItinerary(testClientIp, mockItineraryRequestData)
      ).rejects.toThrow('Database connection lost');

      expect(mockedLogger.error).toHaveBeenCalledWith(
        'Failed to create itinerary request',
        expect.objectContaining({
          error: 'Database connection lost',
          clientIp: testClientIp,
          destination: mockItineraryRequestData.destination
        })
      );
    });

    it('should handle invalid date parsing', async () => {
      // Arrange
      const invalidRequestData = {
        ...mockItineraryRequestData,
        start_date: 'invalid-date'
      };

      // Act & Assert
      await expect(
        ItineraryService.createItinerary(testClientIp, invalidRequestData)
      ).rejects.toThrow();
    });
  });

  describe('processItinerary', () => {
    it('should process itinerary successfully', async () => {
      // Arrange
      mockedItinerariesModel.findById.mockResolvedValue(mockItineraryPending);
      mockedItinerariesModel.updateStatus.mockResolvedValue(undefined as any);
      mockedItinerariesModel.updateContent.mockResolvedValue(undefined as any);
      mockedAIService.processItineraryRequest.mockResolvedValue(mockAIItineraryResponse);
      mockedPDFService.generateItineraryPDF.mockResolvedValue(mockPDFServiceResponse);

      // Act
      await ItineraryService.processItinerary(mockItineraryPending.id);

      // Assert
      expect(mockedItinerariesModel.findById).toHaveBeenCalledWith(mockItineraryPending.id);
      expect(mockedItinerariesModel.updateStatus).toHaveBeenCalledWith(
        mockItineraryPending.id,
        'processing'
      );
      expect(mockedAIService.processItineraryRequest).toHaveBeenCalledWith(
        expect.stringContaining(mockItineraryPending.destination),
        'groq'
      );
      expect(mockedPDFService.generateItineraryPDF).toHaveBeenCalledWith(
        mockItineraryPending,
        mockAIItineraryResponse.content
      );
      expect(mockedItinerariesModel.updateContent).toHaveBeenCalledWith(
        mockItineraryPending.id,
        mockAIItineraryResponse.content,
        'groq',
        mockPDFServiceResponse.filename,
        mockPDFServiceResponse.filepath
      );
      expect(mockedItinerariesModel.updateStatus).toHaveBeenCalledWith(
        mockItineraryPending.id,
        'completed',
        expect.any(Date)
      );

      expect(mockedLogger.info).toHaveBeenCalledWith(
        'Itinerary processing completed successfully',
        expect.objectContaining({
          context: 'itinerary',
          itineraryId: mockItineraryPending.id,
          contentLength: mockAIItineraryResponse.content.length,
          pdfFilename: mockPDFServiceResponse.filename
        })
      );
    });

    it('should handle itinerary not found', async () => {
      // Arrange
      mockedItinerariesModel.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        ItineraryService.processItinerary(999)
      ).rejects.toThrow('Itinerary not found');
    });

    it('should handle AI service errors', async () => {
      // Arrange
      mockedItinerariesModel.findById.mockResolvedValue(mockItineraryPending);
      mockedItinerariesModel.updateStatus.mockResolvedValue(undefined as any);
      mockedAIService.processItineraryRequest.mockRejectedValue(itineraryErrorScenarios.aiServiceError);

      // Act & Assert
      await expect(
        ItineraryService.processItinerary(mockItineraryPending.id)
      ).rejects.toThrow('AI service failed');

      expect(mockedItinerariesModel.updateStatus).toHaveBeenLastCalledWith(
        mockItineraryPending.id,
        'failed'
      );

      expect(mockedLogger.error).toHaveBeenCalledWith(
        'Itinerary processing failed',
        expect.objectContaining({
          context: 'itinerary',
          itineraryId: mockItineraryPending.id,
          error: 'AI service failed'
        })
      );
    });

    it('should handle PDF generation errors', async () => {
      // Arrange
      mockedItinerariesModel.findById.mockResolvedValue(mockItineraryPending);
      mockedItinerariesModel.updateStatus.mockResolvedValue(undefined as any);
      mockedAIService.processItineraryRequest.mockResolvedValue(mockAIItineraryResponse);
      mockedPDFService.generateItineraryPDF.mockRejectedValue(itineraryErrorScenarios.pdfServiceError);

      // Act & Assert
      await expect(
        ItineraryService.processItinerary(mockItineraryPending.id)
      ).rejects.toThrow('PDF generation failed');

      expect(mockedItinerariesModel.updateStatus).toHaveBeenLastCalledWith(
        mockItineraryPending.id,
        'failed'
      );
    });

    it('should measure processing time correctly', async () => {
      // Arrange
      const startTime = Date.now();
      const endTime = startTime + 5000; // 5 seconds later
      
      jest.spyOn(Date, 'now')
        .mockReturnValueOnce(startTime)
        .mockReturnValueOnce(endTime);

      mockedItinerariesModel.findById.mockResolvedValue(mockItineraryPending);
      mockedItinerariesModel.updateStatus.mockResolvedValue(undefined as any);
      mockedItinerariesModel.updateContent.mockResolvedValue(undefined as any);
      mockedAIService.processItineraryRequest.mockResolvedValue(mockAIItineraryResponse);
      mockedPDFService.generateItineraryPDF.mockResolvedValue(mockPDFServiceResponse);

      // Act
      await ItineraryService.processItinerary(mockItineraryPending.id);

      // Assert
      expect(mockedLogger.info).toHaveBeenCalledWith(
        'Itinerary processing completed successfully',
        expect.objectContaining({
          processingTime: '5000ms'
        })
      );
    });
  });

  describe('getItinerary', () => {
    it('should return existing itinerary', async () => {
      // Arrange
      mockedItinerariesModel.findById.mockResolvedValue(mockItineraryCompleted);

      // Act
      const result = await ItineraryService.getItinerary(mockItineraryCompleted.id);

      // Assert
      expect(result).toEqual(mockItineraryCompleted);
      expect(mockedItinerariesModel.findById).toHaveBeenCalledWith(mockItineraryCompleted.id);
    });

    it('should return null for non-existent itinerary', async () => {
      // Arrange
      mockedItinerariesModel.findById.mockResolvedValue(null);

      // Act
      const result = await ItineraryService.getItinerary(999);

      // Assert
      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      // Arrange
      mockedItinerariesModel.findById.mockRejectedValue(itineraryErrorScenarios.databaseError);

      // Act & Assert
      await expect(
        ItineraryService.getItinerary(1)
      ).rejects.toThrow('Database connection lost');

      expect(mockedLogger.error).toHaveBeenCalledWith(
        'Failed to get itinerary',
        expect.objectContaining({
          error: 'Database connection lost',
          id: 1
        })
      );
    });
  });

  describe('getRecentItineraries', () => {
    it('should return recent itineraries with pagination', async () => {
      // Arrange
      mockedItinerariesModel.findRecent.mockResolvedValue(mockRecentItinerariesResponse);

      // Act
      const result = await ItineraryService.getRecentItineraries(10, 0);

      // Assert
      expect(result).toEqual({
        itineraries: mockRecentItinerariesResponse.itineraries,
        total: mockRecentItinerariesResponse.total,
        pagination: {
          total: mockRecentItinerariesResponse.total,
          limit: 10,
          offset: 0,
          has_more: false
        }
      });
      expect(mockedItinerariesModel.findRecent).toHaveBeenCalledWith(10, 0, undefined);
    });

    it('should use default pagination values', async () => {
      // Arrange
      mockedItinerariesModel.findRecent.mockResolvedValue(mockRecentItinerariesResponse);

      // Act
      await ItineraryService.getRecentItineraries();

      // Assert
      expect(mockedItinerariesModel.findRecent).toHaveBeenCalledWith(10, 0, undefined);
    });

    it('should filter by status', async () => {
      // Arrange
      mockedItinerariesModel.findRecent.mockResolvedValue(mockRecentItinerariesResponse);

      // Act
      await ItineraryService.getRecentItineraries(5, 0, 'completed');

      // Assert
      expect(mockedItinerariesModel.findRecent).toHaveBeenCalledWith(5, 0, 'completed');
    });

    it('should calculate has_more correctly', async () => {
      // Arrange
      const largeResponse = { itineraries: mockItinerariesList, total: 50 };
      mockedItinerariesModel.findRecent.mockResolvedValue(largeResponse);

      // Act
      const result = await ItineraryService.getRecentItineraries(10, 0);

      // Assert
      expect(result.pagination.has_more).toBe(true);
    });
  });

  describe('getClientItineraries', () => {
    it('should return itineraries for specific client', async () => {
      // Arrange
      mockedItinerariesModel.findByClientIp.mockResolvedValue([mockItineraryCompleted]);

      // Act
      const result = await ItineraryService.getClientItineraries(testClientIp, 5, 0);

      // Assert
      expect(result).toEqual([mockItineraryCompleted]);
      expect(mockedItinerariesModel.findByClientIp).toHaveBeenCalledWith(testClientIp, 5, 0);
    });
  });

  describe('getPendingItineraries', () => {
    it('should return pending itineraries', async () => {
      // Arrange
      mockedItinerariesModel.findPending.mockResolvedValue([mockItineraryPending]);

      // Act
      const result = await ItineraryService.getPendingItineraries(10);

      // Assert
      expect(result).toEqual([mockItineraryPending]);
      expect(mockedItinerariesModel.findPending).toHaveBeenCalledWith(10);
    });
  });

  describe('getStats', () => {
    it('should return itinerary statistics', async () => {
      // Arrange
      mockedItinerariesModel.getStats.mockResolvedValue(mockItineraryStats);

      // Act
      const result = await ItineraryService.getStats();

      // Assert
      expect(result).toEqual(mockItineraryStats);
      expect(mockedItinerariesModel.getStats).toHaveBeenCalled();
    });
  });

  describe('isPDFAvailable', () => {
    it('should return true for available PDF', async () => {
      // Arrange
      mockedPDFService.pdfExists.mockResolvedValue(true);

      // Act
      const result = await ItineraryService.isPDFAvailable(mockItineraryCompleted);

      // Assert
      expect(result).toBe(true);
      expect(mockedPDFService.pdfExists).toHaveBeenCalledWith(mockItineraryCompleted.pdf_path);
    });

    it('should return false for missing PDF info', async () => {
      // Act
      const result = await ItineraryService.isPDFAvailable(mockItineraryPending);

      // Assert
      expect(result).toBe(false);
      expect(mockedPDFService.pdfExists).not.toHaveBeenCalled();
    });

    it('should return false for non-existent PDF file', async () => {
      // Arrange
      mockedPDFService.pdfExists.mockResolvedValue(false);

      // Act
      const result = await ItineraryService.isPDFAvailable(mockItineraryCompleted);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getEstimatedCompletionTime', () => {
    const mockNow = new Date('2024-01-15T10:00:00.000Z');
    const originalNow = Date.now;

    beforeAll(() => {
      (Date as any).now = () => mockNow.getTime();
    });

    afterAll(() => {
      (Date as any).now = originalNow;
    });

    it('should return estimated completion time', () => {
      // Act
      const result = ItineraryService.getEstimatedCompletionTime();

      // Assert
      expect(result instanceof Date).toBe(true);
      const expectedTime = new Date(new Date().getTime() + (4 * 60 * 1000));
      expect(Math.abs(result.getTime() - expectedTime.getTime())).toBeLessThan(60000);
    });
  });

  describe('validateItineraryDates', () => {
    const originalNow = Date.now;

    beforeAll(() => {
      const mockToday = new Date('2024-11-15T00:00:00.000Z');
      (Date as any).now = () => mockToday.getTime();
    });

    afterAll(() => {
      (Date as any).now = originalNow;
    });

    it('should validate correct date ranges', () => {
      validDateRanges.forEach(({ start_date, end_date, description }) => {
        expect(() => {
          ItineraryService.validateItineraryDates(start_date, end_date);
        }).not.toThrow(`Failed for: ${description}`);
      });
    });

    it('should reject invalid date ranges', () => {
      // Past dates
      expect(() => {
        ItineraryService.validateItineraryDates('2090-01-01', '2089-12-31');
      }).toThrow('End date must be after start date');

      // End before start (both in future)
      expect(() => {
        ItineraryService.validateItineraryDates('2099-12-05', '2099-12-04');
      }).toThrow('End date must be after start date');

      // Trip too long (8 days, both in future)
      expect(() => {
        ItineraryService.validateItineraryDates('2099-12-01', '2099-12-09');
      }).toThrow('Trip duration cannot exceed 7 days');

      // Same start and end (in future)
      expect(() => {
        ItineraryService.validateItineraryDates('2099-12-01', '2099-12-01');
      }).toThrow('End date must be after start date');
    });
  });

  describe('cleanupOldPDFs', () => {
    it('should cleanup old PDFs successfully', async () => {
      // Arrange
      const deletedCount = 15;
      mockedItinerariesModel.deleteOlderThan.mockResolvedValue(deletedCount);

      // Act
      const result = await ItineraryService.cleanupOldPDFs(30);

      // Assert
      expect(result).toBe(deletedCount);
      expect(mockedItinerariesModel.deleteOlderThan).toHaveBeenCalledWith(30);
      expect(mockedLogger.info).toHaveBeenCalledWith('PDF cleanup completed', { deletedCount });
    });

    it('should handle cleanup errors', async () => {
      // Arrange
      const cleanupError = new Error('Cleanup failed');
      mockedItinerariesModel.deleteOlderThan.mockRejectedValue(cleanupError);

      // Act & Assert
      await expect(
        ItineraryService.cleanupOldPDFs(30)
      ).rejects.toThrow('Cleanup failed');

      expect(mockedLogger.error).toHaveBeenCalledWith(
        'Failed to cleanup old PDFs',
        expect.objectContaining({
          error: 'Cleanup failed',
          days: 30
        })
      );
    });
  });

  describe('Itinerary prompt generation', () => {
    itineraryPromptTestCases.forEach(({ name, itinerary, shouldContain, shouldNotContain }) => {
      it(`should generate correct prompt for ${name}`, async () => {
        // Arrange
        mockedItinerariesModel.findById.mockResolvedValue(itinerary as any);
        mockedItinerariesModel.updateStatus.mockResolvedValue(undefined as any);
        mockedItinerariesModel.updateContent.mockResolvedValue(undefined as any);
        mockedAIService.processItineraryRequest.mockResolvedValue(mockAIItineraryResponse);
        mockedPDFService.generateItineraryPDF.mockResolvedValue(mockPDFServiceResponse);

        // Act
        await ItineraryService.processItinerary(itinerary.id);

        // Assert
        const aiServiceCall = mockedAIService.processItineraryRequest.mock.calls[0];
        const generatedPrompt = aiServiceCall?.[0];

        if (shouldContain) {
          shouldContain.forEach(text => {
            if (text === '1 dia') {
              expect(generatedPrompt).toMatch(/\b(0|1) dia\b/);
            } else {
              expect(generatedPrompt).toContain(text);
            }
          });
        }

        if (shouldNotContain) {
          shouldNotContain.forEach(text => {
            expect(generatedPrompt).not.toContain(text);
          });
        }
      });
    });
  });

  describe('Error handling and cleanup', () => {
    it('should handle database errors gracefully', async () => {
      // Arrange
      mockedItinerariesModel.findRecent.mockRejectedValue(itineraryErrorScenarios.databaseError);

      // Act & Assert
      await expect(
        ItineraryService.getRecentItineraries()
      ).rejects.toThrow('Database connection lost');

      expect(mockedLogger.error).toHaveBeenCalledWith(
        'Failed to get recent itineraries',
        expect.objectContaining({
          error: 'Database connection lost'
        })
      );
    });

    it('should ensure proper cleanup on processing failure', async () => {
      // Arrange
      mockedItinerariesModel.findById.mockResolvedValue(mockItineraryPending);
      mockedItinerariesModel.updateStatus.mockResolvedValue(undefined as any);
      mockedAIService.processItineraryRequest.mockRejectedValue(new Error('Processing failed'));

      // Act & Assert
      await expect(
        ItineraryService.processItinerary(mockItineraryPending.id)
      ).rejects.toThrow('Processing failed');

      // Verify status was updated to failed
      expect(mockedItinerariesModel.updateStatus).toHaveBeenCalledWith(
        mockItineraryPending.id,
        'failed'
      );
    });
  });
});
