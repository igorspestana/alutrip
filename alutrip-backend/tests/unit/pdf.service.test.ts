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
    mockedPath.join.mockImplementation((...segments: any[]) => segments.join('/'));
    mockedPath.resolve.mockImplementation((...segments: any[]) => '/' + segments.join('/'));
  });

  describe('generateItineraryPDF', () => {
    const generatedContent = mockItinerary.generated_content;

    it('should generate PDF successfully', async () => {
      // Arrange
      mockedFs.access.mockRejectedValue(new Error('not found'));
      mockedFs.mkdir.mockResolvedValue(undefined as any);
      mockPage.pdf.mockResolvedValue(mockPDFBuffer);

      // Act
      const result = await PDFService.generateItineraryPDF(mockItinerary, generatedContent);

      // Assert
      expect(result).toEqual({
        filename: expect.stringMatching(/^itinerary_paris_france_1_\d+\.pdf$/),
        filepath: expect.stringContaining('./pdfs/itinerary_paris_france_1_')
      });
      expect(mockPage.setContent).toHaveBeenCalled();
      expect(mockPage.pdf).toHaveBeenCalled();
      expect(mockPage.close).toHaveBeenCalled();
    });

    it('should handle browser launch failure', async () => {
      // Arrange
      (PDFService as any).getBrowser.mockRejectedValueOnce(new Error(pdfGenerationErrors.puppeteerLaunchError));

      // Act & Assert
      await expect(
        PDFService.generateItineraryPDF(mockItinerary, generatedContent)
      ).rejects.toThrow('Failed to generate PDF: Failed to launch browser');
    });

    it('should handle PDF generation failure', async () => {
      // Arrange
      mockedFs.access.mockResolvedValue(undefined as any);
      mockPage.pdf.mockRejectedValue(new Error(pdfGenerationErrors.contentGenerationError));

      // Act & Assert
      await expect(
        PDFService.generateItineraryPDF(mockItinerary, generatedContent)
      ).rejects.toThrow('Failed to generate PDF: Failed to generate PDF content');
      expect(mockPage.close).toHaveBeenCalled();
    });

    it('should handle directory creation error', async () => {
      // Arrange
      mockedFs.access.mockRejectedValue(new Error('missing'));
      mockedFs.mkdir.mockRejectedValueOnce(new Error('Permission denied'));

      // Act & Assert
      await expect(
        PDFService.generateItineraryPDF(mockItinerary, generatedContent)
      ).rejects.toThrow('Failed to generate PDF: Permission denied');
    });

    it('should generate unique filenames for concurrent requests', async () => {
      // Arrange
      mockedFs.access.mockRejectedValue(new Error('not found'));
      mockedFs.mkdir.mockResolvedValue(undefined as any);
      mockPage.pdf.mockResolvedValue(mockPDFBuffer);

      const originalNow = Date.now;
      let ts = 1000000000000;
      (Date as any).now = () => ts++;

      try {
        // Act
        const [result1, result2] = await Promise.all([
          PDFService.generateItineraryPDF(mockItinerary, generatedContent),
          PDFService.generateItineraryPDF({ ...mockItinerary, id: 2 }, generatedContent)
        ]);

        // Assert
        expect(result1.filename).not.toBe(result2.filename);
        expect(result1.filepath).not.toBe(result2.filepath);
      } finally {
        (Date as any).now = originalNow;
      }
    });
  });

  describe('pdfExists', () => {
    it('should return true for existing PDF files', async () => {
      // Arrange
      mockedFs.access.mockResolvedValue(undefined as any);

      // Act
      const exists = await PDFService.pdfExists(validPDFPath);

      // Assert
      expect(exists).toBe(true);
      expect(mockedFs.access).toHaveBeenCalledWith(validPDFPath);
    });

    it('should return false for non-existent files', async () => {
      // Arrange
      mockedFs.access.mockRejectedValue(new Error('File not found'));

      // Act
      const exists = await PDFService.pdfExists(invalidPDFPath);

      // Assert
      expect(exists).toBe(false);
    });
  });

  describe('deletePDF', () => {
    it('should delete existing PDF file without throwing', async () => {
      // Arrange
      mockedFs.unlink.mockResolvedValue(undefined as any);

      // Act
      await PDFService.deletePDF(validPDFPath);

      // Assert
      expect(mockedLogger.info).toHaveBeenCalledWith('PDF file deleted', { context: 'pdf', filepath: validPDFPath });
      expect(mockedFs.unlink).toHaveBeenCalledWith(validPDFPath);
    });

    it('should swallow deletion errors and warn', async () => {
      // Arrange
      mockedFs.unlink.mockRejectedValue(new Error('Permission denied'));

      // Act
      await PDFService.deletePDF(validPDFPath);

      // Assert
      expect(mockedLogger.warn).toHaveBeenCalledWith(
        'Failed to delete PDF file',
        expect.objectContaining({ filepath: validPDFPath, context: 'pdf', error: 'Permission denied' })
      );
    });
  });

  describe('HTML template generation basics', () => {
    it('should generate proper HTML content', async () => {
      // Arrange
      mockedFs.access.mockRejectedValue(new Error('not found'));
      mockedFs.mkdir.mockResolvedValue(undefined as any);
      mockPage.pdf.mockResolvedValue(mockPDFBuffer);

      // Act
      await PDFService.generateItineraryPDF(mockItinerary, mockItinerary.generated_content);

      // Assert
      const setContentCall = mockPage.setContent.mock.calls[0][0];
      expect(setContentCall).toContain('<!DOCTYPE html>');
      expect(setContentCall).toContain(mockItinerary.destination);
      expect(setContentCall).toContain('15/03/2024');
      expect(setContentCall).toContain('18/03/2024');
    });
  });
});
