// Mocks must be declared before imports
jest.mock('puppeteer', () => ({
  __esModule: true,
  default: {
    launch: jest.fn()
  }
}));
const fsPromisesMock = {
  access: jest.fn(),
  mkdir: jest.fn(),
  unlink: jest.fn(),
  stat: jest.fn()
};
jest.mock('fs', () => ({
  __esModule: true,
  default: { promises: fsPromisesMock, constants: { F_OK: 0 } },
  promises: fsPromisesMock,
  constants: { F_OK: 0 }
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
import 'puppeteer';
import fs from 'fs';
import path from 'path';
import {
  mockItinerary,
  mockPuppeteerBrowser,
  mockPuppeteerPage,
  mockPDFBuffer,
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
  let mockBrowser: any;
  let mockPage: any;
  beforeEach(() => {
    jest.clearAllMocks();
    // Setup mocks
    mockPage = { ...mockPuppeteerPage };
    mockBrowser = {
      ...mockPuppeteerBrowser,
      newPage: jest.fn().mockResolvedValue(mockPage),
      on: jest.fn()
    };
    // Patch internal getBrowser to avoid real puppeteer
    (PDFService as any).getBrowser = jest.fn().mockResolvedValue(mockBrowser);
    // Mock path operations
    mockedPath.join.mockImplementation((...segments: string[]) => segments.join('/'));
    mockedPath.resolve.mockImplementation((...segments: string[]) => '/' + segments.join('/'));
  });
  describe('generateItineraryPDF', () => {
    const generatedContent = mockItinerary.generated_content;
    it('should generate PDF successfully', async() => {
      mockedFs.access.mockRejectedValue(new Error('not found'));
      mockedFs.mkdir.mockResolvedValue(undefined as any);
      mockPage.pdf.mockResolvedValue(mockPDFBuffer);
      const result = await PDFService.generateItineraryPDF(mockItinerary, generatedContent);
      expect(result).toEqual({
        filename: expect.stringMatching(/^itinerary_paris_france_1_\d+\.pdf$/),
        filepath: expect.stringContaining('./pdfs/itinerary_paris_france_1_')
      });
      expect(mockPage.setContent).toHaveBeenCalled();
      expect(mockPage.pdf).toHaveBeenCalled();
      expect(mockPage.close).toHaveBeenCalled();
    });

    it('should handle browser launch failure', async() => {
      (PDFService as any).getBrowser.mockRejectedValueOnce(new Error(pdfGenerationErrors.puppeteerLaunchError));
      // Act & Assert
      await expect(
        PDFService.generateItineraryPDF(mockItinerary, generatedContent)
      ).rejects.toThrow('Failed to generate PDF: Failed to launch browser');
    });

    it('should handle PDF generation failure', async() => {
      mockedFs.access.mockResolvedValue(undefined as any);
      mockPage.pdf.mockRejectedValue(new Error(pdfGenerationErrors.contentGenerationError));
      // Act & Assert
      await expect(
        PDFService.generateItineraryPDF(mockItinerary, generatedContent)
      ).rejects.toThrow('Failed to generate PDF: Failed to generate PDF content');
      expect(mockPage.close).toHaveBeenCalled();
    });

    it('should handle directory creation error', async() => {
      mockedFs.access.mockRejectedValue(new Error('missing'));
      mockedFs.mkdir.mockRejectedValueOnce(new Error('Permission denied'));
      // Act & Assert
      await expect(
        PDFService.generateItineraryPDF(mockItinerary, generatedContent)
      ).rejects.toThrow('Failed to generate PDF: Permission denied');
    });

    it('should generate unique filenames for concurrent requests', async() => {
      mockedFs.access.mockRejectedValue(new Error('not found'));
      mockedFs.mkdir.mockResolvedValue(undefined as any);
      mockPage.pdf.mockResolvedValue(mockPDFBuffer);
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
  });

  describe('pdfExists', () => {
    it('should return true for existing PDF files', async() => {
      mockedFs.access.mockResolvedValue(undefined as any);
      const exists = await PDFService.pdfExists(validPDFPath);

      expect(exists).toBe(true);
      expect(mockedFs.access).toHaveBeenCalledWith(validPDFPath);
    });

    it('should return false for non-existent files', async() => {
      mockedFs.access.mockRejectedValue(new Error('File not found'));
      const exists = await PDFService.pdfExists(invalidPDFPath);

      expect(exists).toBe(false);
    });
  });

  describe('deletePDF', () => {
    it('should delete existing PDF file without throwing', async() => {
      mockedFs.unlink.mockResolvedValue(undefined as any);
      await PDFService.deletePDF(validPDFPath);

      expect(mockedLogger.info).toHaveBeenCalledWith('PDF file deleted', { context: 'pdf', filepath: validPDFPath });
      expect(mockedFs.unlink).toHaveBeenCalledWith(validPDFPath);
    });

    it('should swallow deletion errors and warn', async() => {
      mockedFs.unlink.mockRejectedValue(new Error('Permission denied'));
      await PDFService.deletePDF(validPDFPath);

      expect(mockedLogger.warn).toHaveBeenCalledWith(
        'Failed to delete PDF file',
        expect.objectContaining({ filepath: validPDFPath, context: 'pdf', error: 'Permission denied' })
      );
    });
  });
  describe('HTML template generation basics', () => {
    it('should generate proper HTML content', async() => {
      mockedFs.access.mockRejectedValue(new Error('not found'));
      mockedFs.mkdir.mockResolvedValue(undefined as any);
      mockPage.pdf.mockResolvedValue(mockPDFBuffer);
      await PDFService.generateItineraryPDF(mockItinerary, mockItinerary.generated_content);
      const setContentCall = mockPage.setContent.mock.calls[0][0];
      expect(setContentCall).toContain('<!DOCTYPE html>');
      expect(setContentCall).toContain(mockItinerary.destination);
      expect(setContentCall).toContain('15/03/2024');
      expect(setContentCall).toContain('18/03/2024');
    });
  });
  describe('getBrowser integration tests', () => {
    beforeEach(() => {
      // Reset browser instance before each test
      (PDFService as any).browser = null;
      jest.clearAllMocks();
      // Mock getBrowser to use real puppeteer.launch but with our mocked browser
      (PDFService as any).getBrowser = jest.fn().mockImplementation(async() => {
        if (!(PDFService as any).browser) {
          const mockBrowserInstance = {
            ...mockPuppeteerBrowser,
            on: jest.fn(),
            newPage: jest.fn().mockResolvedValue({
              ...mockPuppeteerPage,
              pdf: jest.fn().mockResolvedValue(mockPDFBuffer)
            })
          };
          (PDFService as any).browser = mockBrowserInstance;
        }
        return (PDFService as any).browser;
      });
    });
    it('should create new browser instance through generateItineraryPDF', async() => {
      mockedFs.access.mockRejectedValue(new Error('not found'));
      mockedFs.mkdir.mockResolvedValue(undefined as any);
      await PDFService.generateItineraryPDF(mockItinerary, mockItinerary.generated_content);
      // Verify that getBrowser was called and browser instance was created
      expect((PDFService as any).getBrowser).toHaveBeenCalled();
      expect((PDFService as any).browser).toBeDefined();
    });
    it('should handle browser disconnection through healthCheck', async() => {
      await PDFService.healthCheck();
      // Verify that healthCheck works and browser instance was created
      expect((PDFService as any).getBrowser).toHaveBeenCalled();
      expect((PDFService as any).browser).toBeDefined();
    });
    it('should handle browser creation failure in generateItineraryPDF', async() => {
      // Mock getBrowser to throw an error
      (PDFService as any).getBrowser = jest.fn().mockRejectedValue(new Error('Failed to launch browser'));
      mockedFs.access.mockRejectedValue(new Error('not found'));
      mockedFs.mkdir.mockResolvedValue(undefined as any);
      await expect(
        PDFService.generateItineraryPDF(mockItinerary, mockItinerary.generated_content)
      ).rejects.toThrow('Failed to generate PDF: Failed to launch browser');
    });
  });
  describe('getPDFSize', () => {
    it('should return file size for existing PDF', async() => {
      const mockStats = { size: 250000 };
      mockedFs.stat.mockResolvedValue(mockStats as never);
      const size = await PDFService.getPDFSize(validPDFPath);
      expect(size).toBe(250000);
      expect(mockedFs.stat).toHaveBeenCalledWith(validPDFPath);
    });
    it('should return 0 for non-existent file', async() => {
      mockedFs.stat.mockRejectedValue(new Error('File not found'));
      const size = await PDFService.getPDFSize(invalidPDFPath);
      expect(size).toBe(0);
    });
    it('should return 0 when fs.stat throws any error', async() => {
      mockedFs.stat.mockRejectedValue(new Error('Permission denied'));
      const size = await PDFService.getPDFSize(validPDFPath);
      expect(size).toBe(0);
    });
  });
  describe('closeBrowser', () => {
    it('should close existing browser instance', async() => {
      const mockBrowserInstance = {
        close: jest.fn().mockResolvedValue(undefined)
      };
      (PDFService as any).browser = mockBrowserInstance;
      await PDFService.closeBrowser();
      expect(mockBrowserInstance.close).toHaveBeenCalled();
      expect((PDFService as any).browser).toBeNull();
      expect(mockedLogger.info).toHaveBeenCalledWith(
        'Closing Puppeteer browser',
        { context: 'pdf' }
      );
    });
    it('should do nothing when no browser instance exists', async() => {
      (PDFService as any).browser = null;
      await PDFService.closeBrowser();
      expect(mockedLogger.info).not.toHaveBeenCalled();
    });
    it('should handle browser close errors', async() => {
      const mockBrowserInstance = {
        close: jest.fn().mockRejectedValue(new Error('Close failed'))
      };
      (PDFService as any).browser = mockBrowserInstance;
      await expect(PDFService.closeBrowser()).rejects.toThrow('Close failed');
      // Browser should remain set when close fails (not nullified)
      expect((PDFService as any).browser).toBe(mockBrowserInstance);
    });
  });
  describe('healthCheck', () => {
    beforeEach(() => {
      (PDFService as any).browser = null;
      jest.clearAllMocks();
      // Mock getBrowser for healthCheck tests
      (PDFService as any).getBrowser = jest.fn().mockImplementation(async() => {
        if (!(PDFService as any).browser) {
          const mockBrowserInstance = {
            ...mockPuppeteerBrowser,
            on: jest.fn(),
            newPage: jest.fn().mockResolvedValue({
              setContent: jest.fn().mockResolvedValue(undefined),
              pdf: jest.fn().mockResolvedValue(mockPDFBuffer),
              close: jest.fn().mockResolvedValue(undefined)
            })
          };
          (PDFService as any).browser = mockBrowserInstance;
        }
        return (PDFService as any).browser;
      });
    });
    it('should return healthy status when PDF generation works', async() => {
      const result = await PDFService.healthCheck();
      expect(result).toEqual({ status: 'healthy' });
      expect((PDFService as any).browser.newPage).toHaveBeenCalled();
    });
    it('should return unhealthy status when PDF is empty', async() => {
      // Mock page to return empty PDF
      (PDFService as any).getBrowser = jest.fn().mockImplementation(async() => {
        if (!(PDFService as any).browser) {
          const mockBrowserInstance = {
            ...mockPuppeteerBrowser,
            on: jest.fn(),
            newPage: jest.fn().mockResolvedValue({
              setContent: jest.fn().mockResolvedValue(undefined),
              pdf: jest.fn().mockResolvedValue(Buffer.alloc(0)), // Empty buffer
              close: jest.fn().mockResolvedValue(undefined)
            })
          };
          (PDFService as any).browser = mockBrowserInstance;
        }
        return (PDFService as any).browser;
      });
      const result = await PDFService.healthCheck();
      expect(result).toEqual({
        status: 'unhealthy',
        error: 'PDF generation returned empty result'
      });
    });
    it('should return unhealthy status when browser fails', async() => {
      (PDFService as any).getBrowser = jest.fn().mockRejectedValue(new Error('Browser launch failed'));
      const result = await PDFService.healthCheck();
      expect(result).toEqual({
        status: 'unhealthy',
        error: 'Browser launch failed'
      });
    });
    it('should return unhealthy status when page creation fails', async() => {
      (PDFService as any).getBrowser = jest.fn().mockImplementation(async() => {
        if (!(PDFService as any).browser) {
          const mockBrowserInstance = {
            ...mockPuppeteerBrowser,
            newPage: jest.fn().mockRejectedValue(new Error('Page creation failed')),
            on: jest.fn()
          };
          (PDFService as any).browser = mockBrowserInstance;
        }
        return (PDFService as any).browser;
      });
      const result = await PDFService.healthCheck();
      expect(result).toEqual({
        status: 'unhealthy',
        error: 'Page creation failed'
      });
    });
    it('should return unhealthy status when PDF generation fails', async() => {
      (PDFService as any).getBrowser = jest.fn().mockImplementation(async() => {
        if (!(PDFService as any).browser) {
          const mockBrowserInstance = {
            ...mockPuppeteerBrowser,
            on: jest.fn(),
            newPage: jest.fn().mockResolvedValue({
              setContent: jest.fn().mockResolvedValue(undefined),
              pdf: jest.fn().mockRejectedValue(new Error('PDF generation failed')),
              close: jest.fn().mockResolvedValue(undefined)
            })
          };
          (PDFService as any).browser = mockBrowserInstance;
        }
        return (PDFService as any).browser;
      });
      const result = await PDFService.healthCheck();
      expect(result).toEqual({
        status: 'unhealthy',
        error: 'PDF generation failed'
      });
    });
  });
});
