import { TravelQuestionsModel } from '../../../src/models/travel-questions.model';
import { query } from '../../../src/config/database';
import { logger } from '../../../src/config/logger';
import {
  mockTravelQuestion,
  mockTravelQuestionsList
} from '../../fixtures/travel.fixtures';

// Mock dependencies
jest.mock('../../../src/config/database');
jest.mock('../../../src/config/logger');

const mockedQuery = query as jest.MockedFunction<typeof query>;
const mockedLogger = logger as jest.Mocked<typeof logger>;

describe('TravelQuestionsModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('create', () => {
    it('should create a new travel question successfully', async () => {

      const clientIp = '127.0.0.1';
      const question = 'What are the best places to visit in Paris?';
      const response = 'Paris has many great attractions including the Eiffel Tower...';
      const modelUsed = 'groq';
      const sessionId = 'test-session';


      mockedQuery.mockResolvedValueOnce({
        rows: [mockTravelQuestion],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: []
      });


      const result = await TravelQuestionsModel.create(
        clientIp,
        question,
        response,
        modelUsed as any,
        sessionId
      );


      expect(result).toEqual(mockTravelQuestion);
      expect(mockedQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO travel_questions'),
        [
          sessionId,
          clientIp,
          question,
          response,
          modelUsed
        ]
      );
      expect(mockedLogger.info).toHaveBeenCalledWith(
        'Travel question created',
        expect.objectContaining({
          id: mockTravelQuestion.id,
          clientIp,
          modelUsed,
          questionLength: question.length,
          responseLength: response.length
        })
      );
    });

    it('should handle database errors during creation', async () => {

      const dbError = new Error('Database connection error');
      mockedQuery.mockRejectedValueOnce(dbError);

      // Act & Assert
      await expect(
        TravelQuestionsModel.create(
          '127.0.0.1',
          'What are the best places to visit in Paris?',
          'Paris has many great attractions...',
          'groq' as any
        )
      ).rejects.toThrow('Database connection error');

      expect(mockedLogger.error).toHaveBeenCalledWith(
        'Failed to create travel question',
        expect.objectContaining({
          error: 'Database connection error',
          modelUsed: 'groq'
        })
      );
    });
  });

  describe('findById', () => {
    it('should find a travel question by ID', async () => {

      const id = 1;
      
      mockedQuery.mockResolvedValueOnce({
        rows: [mockTravelQuestion],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      });


      const result = await TravelQuestionsModel.findById(id);


      expect(result).toEqual(mockTravelQuestion);
      expect(mockedQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM travel_questions'),
        [id]
      );
    });

    it('should return null for non-existent question', async () => {

      mockedQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: []
      });


      const result = await TravelQuestionsModel.findById(999);


      expect(result).toBeNull();
      expect(mockedQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM travel_questions'),
        [999]
      );
    });

    it('should handle database errors during findById', async () => {

      const dbError = new Error('Database connection error');
      mockedQuery.mockRejectedValueOnce(dbError);

      // Act & Assert
      await expect(TravelQuestionsModel.findById(1)).rejects.toThrow('Database connection error');
      expect(mockedLogger.error).toHaveBeenCalledWith(
        'Failed to find travel question by ID',
        expect.objectContaining({
          error: 'Database connection error',
          id: 1
        })
      );
    });
  });

  describe('findRecent', () => {
    it('should find recent travel questions with pagination', async () => {

      const limit = 10;
      const offset = 0;
      
      mockedQuery.mockResolvedValueOnce({
        rows: [{ count: String(mockTravelQuestionsList.length) }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      });
      
      mockedQuery.mockResolvedValueOnce({
        rows: mockTravelQuestionsList,
        rowCount: mockTravelQuestionsList.length,
        command: 'SELECT',
        oid: 0,
        fields: []
      });


      const result = await TravelQuestionsModel.findRecent(limit, offset);


      expect(result).toEqual({
        questions: mockTravelQuestionsList,
        total: mockTravelQuestionsList.length
      });
      expect(mockedQuery).toHaveBeenCalledWith('SELECT COUNT(*) FROM travel_questions');
      expect(mockedQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM travel_questions'),
        [limit, offset]
      );
    });

    it('should use default pagination values', async () => {

      mockedQuery.mockResolvedValueOnce({
        rows: [{ count: '0' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      });
      
      mockedQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: []
      });


      await TravelQuestionsModel.findRecent();


      expect(mockedQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM travel_questions'),
        [10, 0]
      );
    });

    it('should handle database errors during recent query', async () => {

      const dbError = new Error('Database connection error');
      mockedQuery.mockRejectedValueOnce(dbError);

      // Act & Assert
      await expect(TravelQuestionsModel.findRecent()).rejects.toThrow('Database connection error');
      expect(mockedLogger.error).toHaveBeenCalledWith(
        'Failed to find recent travel questions',
        expect.objectContaining({
          error: 'Database connection error'
        })
      );
    });
  });

  describe('findByClientIp', () => {
    it('should find travel questions by client IP', async () => {

      const clientIp = '127.0.0.1';
      const limit = 5;
      const offset = 0;
      
      mockedQuery.mockResolvedValueOnce({
        rows: mockTravelQuestionsList,
        rowCount: mockTravelQuestionsList.length,
        command: 'SELECT',
        oid: 0,
        fields: []
      });


      const result = await TravelQuestionsModel.findByClientIp(clientIp, limit, offset);


      expect(result).toEqual(mockTravelQuestionsList);
      expect(mockedQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE client_ip = $1'),
        [clientIp, limit, offset]
      );
    });

    it('should handle database errors during client IP query', async () => {

      const dbError = new Error('Database connection error');
      mockedQuery.mockRejectedValueOnce(dbError);

      // Act & Assert
      await expect(
        TravelQuestionsModel.findByClientIp('127.0.0.1')
      ).rejects.toThrow('Database connection error');
      
      expect(mockedLogger.error).toHaveBeenCalledWith(
        'Failed to find travel questions by client IP',
        expect.objectContaining({
          error: 'Database connection error',
          clientIp: '127.0.0.1'
        })
      );
    });
  });

  describe('findBySessionId', () => {
    it('should find travel questions by session ID', async () => {

      const sessionId = 'test-session';
      
      mockedQuery.mockResolvedValueOnce({
        rows: mockTravelQuestionsList,
        rowCount: mockTravelQuestionsList.length,
        command: 'SELECT',
        oid: 0,
        fields: []
      });


      const result = await TravelQuestionsModel.findBySessionId(sessionId);


      expect(result).toEqual(mockTravelQuestionsList);
      expect(mockedQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE session_id = $1'),
        [sessionId]
      );
    });

    it('should handle database errors during session ID query', async () => {

      const dbError = new Error('Database connection error');
      mockedQuery.mockRejectedValueOnce(dbError);

      // Act & Assert
      await expect(
        TravelQuestionsModel.findBySessionId('test-session')
      ).rejects.toThrow('Database connection error');
      
      expect(mockedLogger.error).toHaveBeenCalledWith(
        'Failed to find travel questions by session ID',
        expect.objectContaining({
          error: 'Database connection error',
          sessionId: 'test-session'
        })
      );
    });
  });

  describe('getStats', () => {
    it('should return travel question statistics', async () => {

      mockedQuery.mockResolvedValueOnce({
        rows: [{
          total: '100',
          today: '10',
          groq_count: '70',
          gemini_count: '30',
          avg_response_length: '512'
        }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      });


      const result = await TravelQuestionsModel.getStats();


      expect(result).toEqual({
        total: 100,
        today: 10,
        byModel: {
          groq: 70,
          gemini: 30
        },
        avgResponseLength: 512
      });
      expect(mockedQuery).toHaveBeenCalledWith(expect.stringContaining('SELECT'));
    });

    it('should handle null avg_response_length', async () => {

      mockedQuery.mockResolvedValueOnce({
        rows: [{
          total: '0',
          today: '0',
          groq_count: '0',
          gemini_count: '0',
          avg_response_length: null
        }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: []
      });


      const result = await TravelQuestionsModel.getStats();


      expect(result.avgResponseLength).toBe(0);
    });

    it('should handle database errors during stats query', async () => {

      const dbError = new Error('Database connection error');
      mockedQuery.mockRejectedValueOnce(dbError);

      // Act & Assert
      await expect(TravelQuestionsModel.getStats()).rejects.toThrow('Database connection error');
      expect(mockedLogger.error).toHaveBeenCalledWith(
        'Failed to get travel questions stats',
        expect.objectContaining({
          error: 'Database connection error'
        })
      );
    });
  });

  describe('deleteOlderThan', () => {
    it('should delete old travel questions', async () => {

      const days = 30;
      const deletedCount = 15;
      
      mockedQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: deletedCount,
        command: 'DELETE',
        oid: 0,
        fields: []
      });


      const result = await TravelQuestionsModel.deleteOlderThan(days);


      expect(result).toBe(deletedCount);
      expect(mockedQuery).toHaveBeenCalledWith(
        expect.stringContaining(`'${days} days'`)
      );
      expect(mockedLogger.info).toHaveBeenCalledWith(
        'Old travel questions deleted',
        expect.objectContaining({
          deletedCount,
          days
        })
      );
    });

    it('should handle database errors during deletion', async () => {

      const dbError = new Error('Database connection error');
      mockedQuery.mockRejectedValueOnce(dbError);

      // Act & Assert
      await expect(
        TravelQuestionsModel.deleteOlderThan(30)
      ).rejects.toThrow('Database connection error');
      
      expect(mockedLogger.error).toHaveBeenCalledWith(
        'Failed to delete old travel questions',
        expect.objectContaining({
          error: 'Database connection error',
          days: 30
        })
      );
    });
  });
});
