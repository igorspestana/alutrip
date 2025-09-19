// Mocks must be declared before imports
const mockCreatePdfKitDocument = jest.fn();
const mockPrinterConstructor = jest.fn();

jest.mock('pdfmake', () => {
  return {
    __esModule: true,
    default: mockPrinterConstructor
  };
});

const fsPromisesMock = {
  access: jest.fn(),
  mkdir: jest.fn(),
  unlink: jest.fn(),
  stat: jest.fn()
};

const createWriteStreamMock = jest.fn();

jest.mock('fs', () => ({
  __esModule: true,
  default: { promises: fsPromisesMock, constants: { F_OK: 0 }, createWriteStream: createWriteStreamMock },
  promises: fsPromisesMock,
  constants: { F_OK: 0 },
  createWriteStream: createWriteStreamMock
}));

jest.mock('path');

jest.mock('../../src/config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  },
  logRateLimit: jest.fn()
}));

jest.mock('../../src/config/env', () => ({
  config: {
    PDF_STORAGE_PATH: './pdfs',
    PDF_TIMEOUT: 300000,
    LOG_DIR: './logs'
  }
}));

import { PDFService } from '../../src/services/pdf.service';
import { logger } from '../../src/config/logger';
import { config } from '../../src/config/env';
// PdfPrinter import not needed since we mock it
import fs from 'fs';
import path from 'path';
import {
  mockItinerary,
  validPDFPath,
  invalidPDFPath,
  pdfGenerationErrors
} from '../fixtures/pdf.fixtures';

const mockedFs = (fs as any).promises as jest.Mocked<typeof fsPromisesMock>;
const mockedPath = path as jest.Mocked<typeof path>;
const mockedLogger = logger as jest.Mocked<typeof logger>;
const mockConfig = config as jest.Mocked<typeof config>;

// Mock config values (redundant with factory, but explicit in tests)
mockConfig.PDF_STORAGE_PATH = './pdfs';
mockConfig.PDF_TIMEOUT = 300000;

describe('PDFService', () => {
  let mockPdfDoc: any;
  let mockWriteStream: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock write stream
    mockWriteStream = {
      on: jest.fn().mockImplementation((event: string, callback: (error?: Error) => void) => {
        if (event === 'finish') {
          setTimeout(callback, 10); // Simulate async completion
        }
        return mockWriteStream;
      })
    };

    // Setup mock PDF document
    mockPdfDoc = {
      pipe: jest.fn().mockReturnValue(mockWriteStream),
      end: jest.fn()
    };

    // Setup mock createPdfKitDocument to return our mock document
    mockCreatePdfKitDocument.mockReturnValue(mockPdfDoc);
    
    // Mock the PdfPrinter constructor to return an object with createPdfKitDocument
    mockPrinterConstructor.mockImplementation(() => ({
      createPdfKitDocument: mockCreatePdfKitDocument
    }));

    // Mock fs.createWriteStream
    createWriteStreamMock.mockReturnValue(mockWriteStream as any);

    // Mock path operations
    mockedPath.join.mockImplementation((...segments: string[]) => segments.join('/'));
    mockedPath.resolve.mockImplementation((...segments: string[]) => '/' + segments.join('/'));
  });

  describe('generateItineraryPDF', () => {
    const generatedContent = mockItinerary.generated_content!;

    it('should generate PDF successfully', async () => {
      mockedFs.access.mockRejectedValue(new Error('not found'));
      mockedFs.mkdir.mockResolvedValue(undefined as any);

      const result = await PDFService.generateItineraryPDF(mockItinerary, generatedContent);

      expect(result).toEqual({
        filename: expect.stringMatching(/^itinerary_paris_france_1_\d+\.pdf$/),
        filepath: expect.stringContaining('./pdfs/itinerary_paris_france_1_')
      });
      expect(mockCreatePdfKitDocument).toHaveBeenCalled();
      expect(mockPdfDoc.pipe).toHaveBeenCalledWith(mockWriteStream);
      expect(mockPdfDoc.end).toHaveBeenCalled();
    });

    it('should handle PDF generation failure', async () => {
      mockedFs.access.mockResolvedValue(undefined as any);
      mockCreatePdfKitDocument.mockImplementation(() => {
        throw new Error(pdfGenerationErrors.contentGenerationError);
      });

      await expect(
        PDFService.generateItineraryPDF(mockItinerary, generatedContent)
      ).rejects.toThrow('Failed to generate PDF: Failed to generate PDF content');
    });

    it('should handle directory creation error', async () => {
      mockedFs.access.mockRejectedValue(new Error('missing'));
      mockedFs.mkdir.mockRejectedValueOnce(new Error('Permission denied'));

      await expect(
        PDFService.generateItineraryPDF(mockItinerary, generatedContent)
      ).rejects.toThrow('Failed to generate PDF: Permission denied');
    });

    it('should generate unique filenames for concurrent requests', async () => {
      mockedFs.access.mockRejectedValue(new Error('not found'));
      mockedFs.mkdir.mockResolvedValue(undefined as any);

      const originalNow = Date.now;
      let ts = 1000000000000;
      (Date as any).now = () => ts++;

      try {
        const [result1, result2] = await Promise.all([
          PDFService.generateItineraryPDF(mockItinerary, generatedContent),
          PDFService.generateItineraryPDF({ ...mockItinerary, id: 2 }, generatedContent)
        ]);

        expect(result1.filename).not.toBe(result2.filename);
        expect(result1.filepath).not.toBe(result2.filepath);
      } finally {
        (Date as any).now = originalNow;
      }
    });

    it('should handle write stream errors', async () => {
      mockedFs.access.mockResolvedValue(undefined as any);
      
      // Create a new mock write stream that emits error
      const errorWriteStream = {
        on: jest.fn().mockImplementation((event: string, callback: (error?: Error) => void) => {
          if (event === 'error') {
            setTimeout(() => callback(new Error('Write failed')), 10);
          }
          return errorWriteStream;
        })
      };
      
      // Mock fs.createWriteStream to return the error stream
      createWriteStreamMock.mockReturnValue(errorWriteStream as any);

      await expect(
        PDFService.generateItineraryPDF(mockItinerary, generatedContent)
      ).rejects.toThrow('Failed to generate PDF: Write failed');
    });
  });

  describe('pdfExists', () => {
    it('should return true for existing PDF files', async () => {
      mockedFs.access.mockResolvedValue(undefined as any);
      const exists = await PDFService.pdfExists(validPDFPath);

      expect(exists).toBe(true);
      expect(mockedFs.access).toHaveBeenCalledWith(validPDFPath);
    });

    it('should return false for non-existent files', async () => {
      mockedFs.access.mockRejectedValue(new Error('File not found'));
      const exists = await PDFService.pdfExists(invalidPDFPath);

      expect(exists).toBe(false);
    });
  });

  describe('deletePDF', () => {
    it('should delete existing PDF file without throwing', async () => {
      mockedFs.unlink.mockResolvedValue(undefined as any);
      await PDFService.deletePDF(validPDFPath);

      expect(mockedLogger.info).toHaveBeenCalledWith('PDF file deleted', { context: 'pdf', filepath: validPDFPath });
      expect(mockedFs.unlink).toHaveBeenCalledWith(validPDFPath);
    });

    it('should swallow deletion errors and warn', async () => {
      mockedFs.unlink.mockRejectedValue(new Error('Permission denied'));
      await PDFService.deletePDF(validPDFPath);

      expect(mockedLogger.warn).toHaveBeenCalledWith(
        'Failed to delete PDF file',
        expect.objectContaining({ filepath: validPDFPath, context: 'pdf', error: 'Permission denied' })
      );
    });
  });

  describe('getPDFSize', () => {
    it('should return file size for existing PDF', async () => {
      const mockStats = { size: 250000 };
      mockedFs.stat.mockResolvedValue(mockStats as never);
      const size = await PDFService.getPDFSize(validPDFPath);

      expect(size).toBe(250000);
      expect(mockedFs.stat).toHaveBeenCalledWith(validPDFPath);
    });

    it('should return 0 for non-existent file', async () => {
      mockedFs.stat.mockRejectedValue(new Error('File not found'));
      const size = await PDFService.getPDFSize(invalidPDFPath);

      expect(size).toBe(0);
    });

    it('should return 0 when fs.stat throws any error', async () => {
      mockedFs.stat.mockRejectedValue(new Error('Permission denied'));
      const size = await PDFService.getPDFSize(validPDFPath);

      expect(size).toBe(0);
    });
  });

  describe('closeBrowser', () => {
    it('should log cleanup message (PDFMake compatibility)', async () => {
      await PDFService.closeBrowser();

      expect(mockedLogger.info).toHaveBeenCalledWith(
        'PDF service cleanup called (PDFMake - no browser to close)',
        { context: 'pdf' }
      );
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when PDF generation works', async () => {
      const result = await PDFService.healthCheck();

      expect(result).toEqual({ status: 'healthy' });
      expect(mockCreatePdfKitDocument).toHaveBeenCalled();
    });

    it('should return unhealthy status when PDF document creation fails', async () => {
      mockCreatePdfKitDocument.mockImplementation(() => {
        throw new Error('PDF creation failed');
      });

      const result = await PDFService.healthCheck();

      expect(result).toEqual({
        status: 'unhealthy',
        error: 'PDF creation failed'
      });
    });

    it('should return unhealthy status when PDF document is null', async () => {
      mockCreatePdfKitDocument.mockReturnValue(null);

      const result = await PDFService.healthCheck();

      expect(result).toEqual({
        status: 'unhealthy',
        error: 'PDF document creation returned null'
      });
    });
  });

  describe('parseItineraryContent', () => {
    it('should parse content into structured sections', async () => {
      const content = `
Dia 1: Paris
Manhã: Visita à Torre Eiffel
- Chegar cedo para evitar multidões
- Comprar ingressos online
Tarde: Museu do Louvre
`;

      mockedFs.access.mockResolvedValue(undefined as any);
      await PDFService.generateItineraryPDF(mockItinerary, content);

      const docDefinition = mockCreatePdfKitDocument.mock.calls[0][0];
      expect(docDefinition.content).toBeDefined();
      expect(Array.isArray(docDefinition.content)).toBe(true);
    });
  });

  describe('document definition structure', () => {
    it('should create proper document definition with all required sections', async () => {
      mockedFs.access.mockResolvedValue(undefined as any);
      await PDFService.generateItineraryPDF(mockItinerary, 'Test content');

      const docDefinition = mockCreatePdfKitDocument.mock.calls[0][0];
      
      expect(docDefinition).toMatchObject({
        styles: expect.objectContaining({
          title: expect.any(Object),
          subtitle: expect.any(Object),
          sectionHeader: expect.any(Object)
        }),
        defaultStyle: expect.objectContaining({
          font: 'Roboto'
        }),
        pageSize: 'A4',
        info: expect.objectContaining({
          title: expect.stringContaining(mockItinerary.destination),
          author: 'AluTrip'
        })
      });
    });

    it('should include budget information when provided', async () => {
      const itineraryWithBudget = { ...mockItinerary, budget: 5000 };
      mockedFs.access.mockResolvedValue(undefined as any);
      
      await PDFService.generateItineraryPDF(itineraryWithBudget, 'Test content');

      expect(mockCreatePdfKitDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.arrayContaining([
            expect.objectContaining({
              stack: expect.arrayContaining([
                expect.objectContaining({
                  text: expect.arrayContaining([
                    expect.objectContaining({
                      text: expect.stringContaining('5,000')
                    })
                  ])
                })
              ])
            })
          ])
        })
      );
    });

    it('should include interests when provided', async () => {
      const itineraryWithInterests = { ...mockItinerary, interests: ['cultura', 'gastronomia'] };
      mockedFs.access.mockResolvedValue(undefined as any);
      
      await PDFService.generateItineraryPDF(itineraryWithInterests, 'Test content');

      expect(mockCreatePdfKitDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.arrayContaining([
            expect.objectContaining({
              stack: expect.arrayContaining([
                expect.objectContaining({
                  text: expect.arrayContaining([
                    expect.objectContaining({
                      text: expect.stringContaining('cultura, gastronomia')
                    })
                  ])
                })
              ])
            })
          ])
        })
      );
    });
  });
});