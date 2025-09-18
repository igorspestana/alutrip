import { ItinerariesModel } from '../../../src/models/itineraries.model';
import { query } from '../../../src/config/database';
import { logger } from '../../../src/config/logger';
import {
  mockItineraryPending,
  mockItineraryCompleted,
  mockItinerariesList,
  mockItineraryRequestData
} from '../../fixtures/itinerary.fixtures';

// Mock dependencies
jest.mock('../../../src/config/database');
jest.mock('../../../src/config/logger');

const mockedQuery = query as jest.MockedFunction<typeof query>;
const mockedLogger = logger as jest.Mocked<typeof logger>;

describe('ItinerariesModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    jest.spyOn(Date, 'now').mockImplementation(() => 
      new Date('2024-01-15T10:00:00.000Z').getTime()
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('create', () => {
    it('should create a new itinerary successfully', async () => {

      const clientIp = '127.0.0.1';
      const destination = 'Paris, France';
      const startDate = new Date('2024-03-15');
      const endDate = new Date('2024-03-18');
      const sessionId = 'test-session';
      const budget = 1500;
      const interests = ['museums', 'food'];


      mockedQuery.mockResolvedValueOnce({
        rows: [mockItineraryPending],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: []
      });


      const result = await ItinerariesModel.create(
        clientIp,
        destination,
        startDate,
        endDate,
        mockItineraryRequestData,
        sessionId,
        budget,
        interests
      );


      expect(result).toEqual(mockItineraryPending);
      expect(mockedQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO itineraries'),
        [
          sessionId,
          clientIp,
          destination,
          startDate,
          endDate,
          budget,
          interests,
          expect.any(String), // JSON stringified request data
          '',
          'groq',
          'pending'
        ]
      );
      expect(mockedLogger.info).toHaveBeenCalledWith(
        'Itinerary request created',
        expect.objectContaining({
          id: mockItineraryPending.id,
          clientIp,
          destination
        })
      );
    });

    it('should handle database errors during creation', async () => {

      const dbError = new Error('Database connection error');
      mockedQuery.mockRejectedValueOnce(dbError);

      // Act & Assert
      await expect(
        ItinerariesModel.create(
          '127.0.0.1',
          'Paris',
          new Date(),
          new Date(),
          mockItineraryRequestData
        )
      ).rejects.toThrow('Database connection error');

      expect(mockedLogger.error).toHaveBeenCalledWith(
        'Failed to create itinerary request',
        expect.objectContaining({
          error: 'Database connection error',
          destination: 'Paris'
        })
      );
    });

    it('should use default values when optional parameters are not provided', async () => {

      mockedQuery.mockResolvedValueOnce({
        rows: [mockItineraryPending],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: []
      });


      await ItinerariesModel.create(
        '127.0.0.1',
        'Paris',
        new Date(),
        new Date(),
        mockItineraryRequestData
      );


      expect(mockedQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO itineraries'),
        expect.arrayContaining([
          undefined, // sessionId
          '127.0.0.1',
          'Paris',
          expect.any(Date),
          expect.any(Date),
          undefined, // budget
          [], // default empty interests array
          expect.any(String),
          '',
          'groq',
          'pending'
        ])
      );
    });
  });

  describe('findById', () => {
    it('should find an itinerary by ID', async () => {

      const id = 1;
      
      mockedQuery.mockResolvedValueOnce({
        rows: [{ ...mockItineraryCompleted, request_data: JSON.stringify(mockItineraryRequestData) }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      });


      const result = await ItinerariesModel.findById(id);


      expect(result).toEqual(expect.objectContaining({
        id: mockItineraryCompleted.id,
        destination: mockItineraryCompleted.destination
      }));
      expect(mockedQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM itineraries'),
        [id]
      );
      expect(result?.request_data).toEqual(mockItineraryRequestData);
    });

    it('should return null for non-existent itinerary', async () => {

      mockedQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: []
      });


      const result = await ItinerariesModel.findById(999);


      expect(result).toBeNull();
      expect(mockedQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM itineraries'),
        [999]
      );
    });

    it('should handle database errors during findById', async () => {

      const dbError = new Error('Database connection error');
      mockedQuery.mockRejectedValueOnce(dbError);

      // Act & Assert
      await expect(ItinerariesModel.findById(1)).rejects.toThrow('Database connection error');
      expect(mockedLogger.error).toHaveBeenCalledWith(
        'Failed to find itinerary by ID',
        expect.objectContaining({
          error: 'Database connection error',
          id: 1
        })
      );
    });
  });

  describe('updateStatus', () => {
    it('should update itinerary status successfully', async () => {

      const id = 1;
      const status = 'completed';
      const completedAt = new Date();
      
      mockedQuery.mockResolvedValueOnce({
        rows: [{ ...mockItineraryCompleted, request_data: JSON.stringify(mockItineraryRequestData) }],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: []
      });


      const result = await ItinerariesModel.updateStatus(id, status as any, completedAt);


      expect(result).toEqual(expect.objectContaining({
        id: mockItineraryCompleted.id,
        destination: mockItineraryCompleted.destination
      }));
      expect(mockedQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE itineraries'),
        [status, completedAt, id]
      );
      expect(mockedLogger.info).toHaveBeenCalledWith(
        'Itinerary status updated',
        expect.objectContaining({
          id,
          status,
          completedAt
        })
      );
    });

    it('should handle database errors during status update', async () => {

      const dbError = new Error('Database connection error');
      mockedQuery.mockRejectedValueOnce(dbError);

      // Act & Assert
      await expect(
        ItinerariesModel.updateStatus(1, 'completed')
      ).rejects.toThrow('Database connection error');
      
      expect(mockedLogger.error).toHaveBeenCalledWith(
        'Failed to update itinerary status',
        expect.objectContaining({
          error: 'Database connection error',
          id: 1,
          status: 'completed'
        })
      );
    });
  });

  describe('updateContent', () => {
    it('should update itinerary content and PDF info successfully', async () => {

      const id = 1;
      const generatedContent = 'This is the generated itinerary content';
      const modelUsed = 'groq';
      const pdfFilename = 'itinerary_paris_1.pdf';
      const pdfPath = '/path/to/pdf/itinerary_paris_1.pdf';
      
      mockedQuery.mockResolvedValueOnce({
        rows: [{ ...mockItineraryCompleted, request_data: JSON.stringify(mockItineraryRequestData) }],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: []
      });


      const result = await ItinerariesModel.updateContent(
        id,
        generatedContent,
        modelUsed as any,
        pdfFilename,
        pdfPath
      );


      expect(result).toEqual(expect.objectContaining({
        id: mockItineraryCompleted.id,
        destination: mockItineraryCompleted.destination
      }));
      expect(mockedQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE itineraries'),
        [generatedContent, modelUsed, pdfFilename, pdfPath, id]
      );
      expect(mockedLogger.info).toHaveBeenCalledWith(
        'Itinerary content updated',
        expect.objectContaining({
          id,
          modelUsed,
          contentLength: generatedContent.length,
          pdfFilename
        })
      );
    });

    it('should handle database errors during content update', async () => {

      const dbError = new Error('Database connection error');
      mockedQuery.mockRejectedValueOnce(dbError);

      // Act & Assert
      await expect(
        ItinerariesModel.updateContent(1, 'content', 'groq')
      ).rejects.toThrow('Database connection error');
      
      expect(mockedLogger.error).toHaveBeenCalledWith(
        'Failed to update itinerary content',
        expect.objectContaining({
          error: 'Database connection error',
          id: 1,
          modelUsed: 'groq'
        })
      );
    });
  });

  describe('findRecent', () => {
    it('should find recent itineraries with pagination', async () => {

      const limit = 10;
      const offset = 0;
      
      mockedQuery.mockResolvedValueOnce({
        rows: [{ count: String(mockItinerariesList.length) }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      });
      
      mockedQuery.mockResolvedValueOnce({
        rows: mockItinerariesList,
        rowCount: mockItinerariesList.length,
        command: 'SELECT',
        oid: 0,
        fields: []
      });


      const result = await ItinerariesModel.findRecent(limit, offset);


      expect(result).toEqual({
        itineraries: mockItinerariesList,
        total: mockItinerariesList.length
      });
      expect(mockedQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT COUNT(*)'),
        []
      );
      expect(mockedQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM itineraries'),
        [limit, offset]
      );
    });

    it('should filter by status when provided', async () => {

      const status = 'completed';
      
      mockedQuery.mockResolvedValueOnce({
        rows: [{ count: '2' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      });
      
      mockedQuery.mockResolvedValueOnce({
        rows: mockItinerariesList.filter(i => i.processing_status === 'completed'),
        rowCount: 2,
        command: 'SELECT',
        oid: 0,
        fields: []
      });


      await ItinerariesModel.findRecent(10, 0, status as any);


      expect(mockedQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE processing_status = $1'),
        [status]
      );
      expect(mockedQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE processing_status = $1'),
        [status, 10, 0]
      );
    });

    it('should handle database errors during recent query', async () => {

      const dbError = new Error('Database connection error');
      mockedQuery.mockRejectedValueOnce(dbError);

      // Act & Assert
      await expect(ItinerariesModel.findRecent()).rejects.toThrow('Database connection error');
      expect(mockedLogger.error).toHaveBeenCalledWith(
        'Failed to find recent itineraries',
        expect.objectContaining({
          error: 'Database connection error'
        })
      );
    });
  });
});
