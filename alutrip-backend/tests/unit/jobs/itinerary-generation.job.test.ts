import { Job } from 'bullmq';
import { processItineraryJob, setupJobHandlers, ItineraryJobData } from '../../../src/jobs/itinerary-generation.job';
import { itineraryService } from '../../../src/services/itinerary.service';
import { logger } from '../../../src/config/logger';

// Mock dependencies
jest.mock('../../../src/services/itinerary.service');
jest.mock('../../../src/config/logger');

const mockedItineraryService = itineraryService as jest.Mocked<typeof itineraryService>;
const mockedLogger = logger as jest.Mocked<typeof logger>;

describe('Itinerary Generation Job', () => {
  let mockJob: Partial<Job>;
  const mockItineraryId = 123;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock Job object
    mockJob = {
      id: 'test-job-id',
      name: 'itinerary_processing',
      data: { itineraryId: mockItineraryId },
      attemptsMade: 1,
      opts: { attempts: 3 },
      updateProgress: jest.fn().mockResolvedValue(undefined)
    };

    // Set up itineraryService mock
    mockedItineraryService.processItinerary.mockResolvedValue();

    jest.spyOn(Date, 'now')
      .mockImplementationOnce(() => 1000)
      .mockImplementationOnce(() => 5000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('processItineraryJob', () => {
    it('should process itinerary successfully', async () => {

      await processItineraryJob(mockJob as Job);


      expect(mockedLogger.info).toHaveBeenCalledWith(
        'Starting BullMQ itinerary generation job',
        expect.objectContaining({
          context: 'job',
          jobId: mockJob.id,
          itineraryId: mockItineraryId
        })
      );


      expect(mockJob.updateProgress).toHaveBeenCalledWith(10);
      expect(mockJob.updateProgress).toHaveBeenCalledWith(100);
      

      expect(mockedItineraryService.processItinerary).toHaveBeenCalledWith(mockItineraryId);
      

      expect(mockedLogger.info).toHaveBeenCalledWith(
        'BullMQ itinerary generation job completed successfully',
        expect.objectContaining({
          processingTime: '4000ms'
        })
      );
    });

    it('should handle errors during processing', async () => {

      const mockError = new Error('Processing failed');
      mockedItineraryService.processItinerary.mockRejectedValue(mockError);

      // Act & Assert
      await expect(processItineraryJob(mockJob as Job)).rejects.toThrow('Processing failed');

      // Assert error logging
      expect(mockedLogger.error).toHaveBeenCalledWith(
        'BullMQ itinerary generation job failed',
        expect.objectContaining({
          error: 'Processing failed',
          itineraryId: mockItineraryId,
          processingTime: '4000ms'
        })
      );
      

      expect(mockJob.updateProgress).toHaveBeenCalledTimes(1);
      expect(mockJob.updateProgress).toHaveBeenCalledWith(10);
      expect(mockJob.updateProgress).not.toHaveBeenCalledWith(100);
    });

    it('should log detailed job information', async () => {

      await processItineraryJob(mockJob as Job);


      expect(mockedLogger.info).toHaveBeenCalledWith(
        'Starting BullMQ itinerary generation job',
        expect.objectContaining({
          context: 'job',
          jobId: 'test-job-id',
          itineraryId: mockItineraryId
        })
      );
    });

    it('should rethrow error after logging', async () => {

      const mockError = new Error('Critical failure');
      mockedItineraryService.processItinerary.mockRejectedValue(mockError);

      // Act & Assert
      await expect(processItineraryJob(mockJob as Job)).rejects.toThrow('Critical failure');
    });

    it('should log progress percentage updates', async () => {

      await processItineraryJob(mockJob as Job);


      expect(mockedLogger.info).toHaveBeenCalledWith(
        'BullMQ job progress updated to 10%',
        expect.objectContaining({
          context: 'job',
          jobId: mockJob.id,
          itineraryId: mockItineraryId
        })
      );
      
      expect(mockedLogger.info).toHaveBeenCalledWith(
        'BullMQ job progress updated to 100%',
        expect.objectContaining({
          context: 'job',
          jobId: mockJob.id,
          itineraryId: mockItineraryId
        })
      );
    });

    it('should handle job data with missing itineraryId', async () => {

      mockJob.data = {} as ItineraryJobData; // Missing itineraryId


      await processItineraryJob(mockJob as Job<ItineraryJobData>);

      // Assert - should pass undefined to service (which may handle it gracefully)
      expect(mockedItineraryService.processItinerary).toHaveBeenCalledWith(undefined);
    });

    it('should handle invalid itineraryId type', async () => {

      mockJob.data = { itineraryId: 'invalid' as any };


      await processItineraryJob(mockJob as Job<ItineraryJobData>);

      // Assert - should still process with string value
      expect(mockedItineraryService.processItinerary).toHaveBeenCalledWith('invalid');
    });

    it('should handle updateProgress failures gracefully', async () => {

      const updateProgressError = new Error('Progress update failed');
      mockJob.updateProgress = jest.fn().mockRejectedValue(updateProgressError);

      // Act & Assert - should throw progress error before service call
      await expect(processItineraryJob(mockJob as Job<ItineraryJobData>)).rejects.toThrow('Progress update failed');
      

      expect(mockedItineraryService.processItinerary).not.toHaveBeenCalled();
    });

    it('should log job details correctly with different job properties', async () => {

      mockJob.name = 'custom-itinerary-job';
      mockJob.attemptsMade = 2;
      mockJob.opts = { attempts: 5, delay: 1000 };


      await processItineraryJob(mockJob as Job<ItineraryJobData>);


      expect(mockedLogger.info).toHaveBeenCalledWith(
        'Starting BullMQ itinerary generation job',
        expect.objectContaining({
          jobName: 'custom-itinerary-job',
          jobAttempts: 2,
          jobOpts: { attempts: 5, delay: 1000 }
        })
      );
    });

    it('should handle undefined job id', async () => {

      (mockJob as any).id = undefined;


      await processItineraryJob(mockJob as Job<ItineraryJobData>);


      expect(mockedLogger.info).toHaveBeenCalledWith(
        'Starting BullMQ itinerary generation job',
        expect.objectContaining({
          jobId: undefined
        })
      );
    });

    it('should log intermediate processing steps', async () => {

      await processItineraryJob(mockJob as Job<ItineraryJobData>);

      // Assert - check all log calls
      expect(mockedLogger.info).toHaveBeenCalledWith(
        'Starting itinerary service processing',
        expect.objectContaining({
          context: 'job',
          jobId: mockJob.id,
          itineraryId: mockItineraryId
        })
      );

      expect(mockedLogger.info).toHaveBeenCalledWith(
        'Itinerary service processing completed',
        expect.objectContaining({
          context: 'job',
          jobId: mockJob.id,
          itineraryId: mockItineraryId
        })
      );
    });

    it('should measure processing time accurately', async () => {
      // Arrange - Reset and mock specific timing for this test
      jest.restoreAllMocks();
      jest.clearAllMocks();
      mockedItineraryService.processItinerary.mockResolvedValue();
      mockJob.updateProgress = jest.fn().mockResolvedValue(undefined);
      
      jest.spyOn(Date, 'now')
        .mockReturnValueOnce(1000)  // Start time
        .mockReturnValueOnce(7500); // End time (6.5 seconds later)


      await processItineraryJob(mockJob as Job<ItineraryJobData>);


      expect(mockedLogger.info).toHaveBeenCalledWith(
        'BullMQ itinerary generation job completed successfully',
        expect.objectContaining({
          processingTime: '6500ms'
        })
      );
    });

    it('should handle service processing that returns undefined', async () => {

      mockedItineraryService.processItinerary.mockResolvedValue(undefined);


      await processItineraryJob(mockJob as Job<ItineraryJobData>);

      // Assert - should complete successfully
      expect(mockedLogger.info).toHaveBeenCalledWith(
        'BullMQ itinerary generation job completed successfully',
        expect.any(Object)
      );
    });

    it('should handle very large itinerary IDs', async () => {

      const largeId = Number.MAX_SAFE_INTEGER;
      mockJob.data = { itineraryId: largeId };


      await processItineraryJob(mockJob as Job<ItineraryJobData>);


      expect(mockedItineraryService.processItinerary).toHaveBeenCalledWith(largeId);
    });

    it('should preserve error details when rethrowing', async () => {

      const complexError = new Error('Complex processing failure');
      complexError.name = 'ProcessingError';
      (complexError as any).code = 'PROC_FAIL';
      mockedItineraryService.processItinerary.mockRejectedValue(complexError);

      // Act & Assert
      await expect(processItineraryJob(mockJob as Job<ItineraryJobData>)).rejects.toMatchObject({
        message: 'Complex processing failure',
        name: 'ProcessingError',
        code: 'PROC_FAIL'
      });
    });

    it('should handle zero or negative processing times', async () => {
      // Arrange - Reset and mock same timestamp for this test
      jest.restoreAllMocks();
      jest.clearAllMocks();
      mockedItineraryService.processItinerary.mockResolvedValue();
      mockJob.updateProgress = jest.fn().mockResolvedValue(undefined);
      
      jest.spyOn(Date, 'now').mockReturnValue(1000);


      await processItineraryJob(mockJob as Job<ItineraryJobData>);


      expect(mockedLogger.info).toHaveBeenCalledWith(
        'BullMQ itinerary generation job completed successfully',
        expect.objectContaining({
          processingTime: '0ms'
        })
      );
    });

    it('should handle errors during progress update but fail early', async () => {
      // Arrange - Fail the first progress update
      mockJob.updateProgress = jest.fn()
        .mockRejectedValueOnce(new Error('First progress update failed'))
        .mockResolvedValue(undefined);

      // Act & Assert
      await expect(processItineraryJob(mockJob as Job<ItineraryJobData>)).rejects.toThrow('First progress update failed');
      

      expect(mockJob.updateProgress).toHaveBeenCalledWith(10);
      expect(mockedItineraryService.processItinerary).not.toHaveBeenCalled();
    });

    it('should handle service errors that include stack traces', async () => {

      const errorWithStack = new Error('Service failure with stack');
      errorWithStack.stack = 'Error: Service failure with stack\n    at test.js:1:1';
      mockedItineraryService.processItinerary.mockRejectedValue(errorWithStack);

      // Act & Assert
      await expect(processItineraryJob(mockJob as Job<ItineraryJobData>)).rejects.toThrow('Service failure with stack');

      // Assert - should log the error message, not the stack
      expect(mockedLogger.error).toHaveBeenCalledWith(
        'BullMQ itinerary generation job failed',
        expect.objectContaining({
          error: 'Service failure with stack'
        })
      );
    });

    it('should handle concurrent job processing with same ID', async () => {
      // Arrange - simulate concurrent processing
      const concurrentJob = { ...mockJob, id: 'concurrent-job' };
      
      // Act - process both jobs
      const promise1 = processItineraryJob(mockJob as Job<ItineraryJobData>);
      const promise2 = processItineraryJob(concurrentJob as Job<ItineraryJobData>);
      
      await Promise.all([promise1, promise2]);

      // Assert - both should complete
      expect(mockedItineraryService.processItinerary).toHaveBeenCalledTimes(2);
      expect(mockedLogger.info).toHaveBeenCalledWith(
        'BullMQ itinerary generation job completed successfully',
        expect.objectContaining({ jobId: mockJob.id })
      );
      expect(mockedLogger.info).toHaveBeenCalledWith(
        'BullMQ itinerary generation job completed successfully',
        expect.objectContaining({ jobId: 'concurrent-job' })
      );
    });

    it('should handle job data with extra properties', async () => {

      const jobDataWithExtras = { 
        itineraryId: 789, 
        extraProp: 'should be ignored',
        timestamp: Date.now()
      } as ItineraryJobData & { extraProp: string; timestamp: number };
      
      mockJob.data = jobDataWithExtras;


      await processItineraryJob(mockJob as Job<ItineraryJobData>);


      expect(mockedItineraryService.processItinerary).toHaveBeenCalledWith(789);
    });
  });

  describe('setupJobHandlers', () => {
    it('should log handler configuration', () => {

      setupJobHandlers();


      expect(mockedLogger.info).toHaveBeenCalledWith(
        'Itinerary job handlers configured',
        { context: 'job' }
      );
    });

    it('should be callable multiple times without issues', () => {

      setupJobHandlers();
      setupJobHandlers();
      setupJobHandlers();


      expect(mockedLogger.info).toHaveBeenCalledTimes(3);
    });
  });

  describe('ItineraryJobData interface compliance', () => {
    it('should handle valid job data structure', async () => {

      const validJobData: ItineraryJobData = { itineraryId: 456 };
      mockJob.data = validJobData;


      await processItineraryJob(mockJob as Job<ItineraryJobData>);


      expect(mockedItineraryService.processItinerary).toHaveBeenCalledWith(456);
    });
  });
});