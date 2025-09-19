import PdfPrinter from 'pdfmake';
import { TDocumentDefinitions, TFontDictionary } from 'pdfmake/interfaces';
import { promises as fs } from 'fs';
import * as fsSync from 'fs';
import path from 'path';
import { logger } from '../config/logger';
import { config } from '../config/env';
import { Itinerary } from '../types/travel';

/**
 * PDF Service for generating professional travel itineraries
 * Uses PDFMake to create structured PDF documents
 */
export class PDFService {
  private static printer: PdfPrinter | null = null;

  /**
   * Initialize PDFMake printer (singleton pattern)
   */
  private static getPrinter(): PdfPrinter {
    if (!this.printer) {
      logger.info('Initializing PDFMake printer', { context: 'pdf' });
      
      // Define fonts for PDFMake
      const fonts: TFontDictionary = {
        Roboto: {
          normal: 'Helvetica',
          bold: 'Helvetica-Bold',
          italics: 'Helvetica-Oblique',
          bolditalics: 'Helvetica-BoldOblique'
        }
      };

      this.printer = new PdfPrinter(fonts);
    }

    return this.printer;
  }

  /**
   * Generate PDF from itinerary data
   */
  static async generateItineraryPDF(
    itinerary: Itinerary,
    generatedContent: string
  ): Promise<{ filename: string; filepath: string }> {
    const startTime = Date.now();
    
    try {
      logger.info('Starting PDF generation', {
        context: 'pdf',
        itineraryId: itinerary.id,
        destination: itinerary.destination
      });

      // Ensure PDFs directory exists
      await this.ensurePDFDirectory();

      // Generate filename
      const filename = this.generateFilename(itinerary);
      const filepath = path.join(config.PDF_STORAGE_PATH, filename);

      // Create PDF document definition
      const docDefinition = this.createItineraryDocDefinition(itinerary, generatedContent);

      // Generate PDF
      const printer = this.getPrinter();
      const pdfDoc = printer.createPdfKitDocument(docDefinition);

      // Create write stream
      const writeStream = fsSync.createWriteStream(filepath);

      // Pipe PDF to file
      pdfDoc.pipe(writeStream);
      pdfDoc.end();

      // Wait for write to complete
      await new Promise<void>((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });

      const processingTime = Date.now() - startTime;

      logger.info('PDF generation completed', {
        context: 'pdf',
        itineraryId: itinerary.id,
        filename,
        processingTime: `${processingTime}ms`
      });

      return { filename, filepath };

    } catch (error) {
      const processingTime = Date.now() - startTime;

      logger.error('PDF generation failed', {
        context: 'pdf',
        itineraryId: itinerary.id,
        error: (error as Error).message,
        processingTime: `${processingTime}ms`
      });

      throw new Error(`Failed to generate PDF: ${(error as Error).message}`);
    }
  }

  /**
   * Create PDFMake document definition for itinerary
   */
  private static createItineraryDocDefinition(
    itinerary: Itinerary,
    generatedContent: string
  ): TDocumentDefinitions {
    // Calculate trip duration
    const startDate = new Date(itinerary.start_date);
    const endDate = new Date(itinerary.end_date);
    const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    // Format dates
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    // Parse content into structured sections
    const parsedContent = this.parseItineraryContent(generatedContent);

    // Build trip info section
    const tripInfoColumns = [
      {
        width: '50%',
        stack: [
          { text: 'Destino:', style: 'infoLabel' },
          { text: itinerary.destination, style: 'infoValue', margin: [0, 0, 0, 10] },
          { text: 'Início:', style: 'infoLabel' },
          { text: formatDate(startDate), style: 'infoValue', margin: [0, 0, 0, 10] }
        ]
      },
      {
        width: '50%',
        stack: [
          { text: 'Duração:', style: 'infoLabel' },
          { text: `${duration} dia${duration > 1 ? 's' : ''}`, style: 'infoValue', margin: [0, 0, 0, 10] },
          { text: 'Termino:', style: 'infoLabel' },
          { text: formatDate(endDate), style: 'infoValue', margin: [0, 0, 0, 10] }
        ]
      }
    ];

    // Build content array
    const contentArray: any[] = [
      // Header
      {
        stack: [
          {
            text: 'Roteiro de Viagem',
            style: 'title',
            alignment: 'center',
            margin: [0, 10, 0, 10]
          },
          {
            text: itinerary.destination,
            style: 'subtitle',
            alignment: 'center',
            margin: [0, 0, 0, 10]
          }
        ],
        fillColor: '#667eea',
        margin: [0, 0, 0, 20]
      },

      // Trip Information
      {
        stack: [
          {
            text: 'Informacoes da Viagem',
            style: 'sectionHeader',
            margin: [0, 10, 0, 15]
          },
          {
            columns: tripInfoColumns
          }
        ],
        fillColor: '#f8f9fa',
        margin: [0, 0, 0, 20]
      },

      // Main Content
      {
        text: 'Seu Roteiro Personalizado',
        style: 'sectionHeader',
        margin: [0, 0, 0, 15]
      },
      
      // Parsed content sections
      ...parsedContent
    ];

    // Add budget info if available
    if (itinerary.budget && contentArray[1] && contentArray[1].stack) {
      contentArray[1].stack.push({
        text: [
          { text: 'Orçamento: ', style: 'infoLabel' },
          { text: itinerary.budget.toLocaleString(), style: 'infoValue' }
        ],
        margin: [0, 10, 0, 0]
      });
    }

    // Add interests if available
    if (itinerary.interests && itinerary.interests.length > 0 && contentArray[1] && contentArray[1].stack) {
      contentArray[1].stack.push({
        text: [
          { text: 'Interesses: ', style: 'infoLabel' },
          { text: itinerary.interests.join(', '), style: 'infoValue' }
        ],
        margin: [0, 10, 0, 0]
      });
    }

    // Add footer
    contentArray.push({
      text: [
        { text: 'AluTrip\n', style: 'footerTitle' },
        { text: 'Seu assistente de viagem inteligente\n', style: 'footer' },
        { 
          text: `Gerado em ${new Date().toLocaleDateString('pt-BR')} as ${new Date().toLocaleTimeString('pt-BR')}`, 
          style: 'footer' 
        }
      ],
      alignment: 'center',
      margin: [0, 30, 0, 0]
    });

    return {
      content: contentArray,
      styles: {
        title: {
          fontSize: 24,
          bold: true,
          color: '#021017'
        },
        subtitle: {
          fontSize: 16,
          color: '#021017',
          italics: true
        },
        sectionHeader: {
          fontSize: 16,
          bold: true,
          color: '#021017',
          margin: [0, 20, 0, 10]
        },
        dayHeader: {
          fontSize: 14,
          bold: true,
          color: '#021017',
          margin: [0, 15, 0, 8]
        },
        timeHeader: {
          fontSize: 12,
          bold: true,
          color: '#333',
          margin: [0, 10, 0, 5]
        },
        contentText: {
          fontSize: 11,
          lineHeight: 1.4,
          margin: [0, 0, 0, 8]
        },
        infoLabel: {
          fontSize: 10,
          bold: true,
          color: '#333'
        },
        infoValue: {
          fontSize: 10,
          color: '#333'
        },
        footerTitle: {
          fontSize: 12,
          bold: true,
          color: '#021017'
        },
        footer: {
          fontSize: 9,
          color: '#333'
        }
      },
      defaultStyle: {
        font: 'Roboto',
        fontSize: 10
      },
      pageSize: 'A4',
      pageMargins: [40, 60, 40, 60],
      info: {
        title: `Roteiro de Viagem - ${itinerary.destination}`,
        author: 'AluTrip',
        subject: 'Travel Itinerary',
        creator: 'AluTrip Travel Assistant'
      }
    };
  }

  /**
   * Parse itinerary content into structured sections
   */
  private static parseItineraryContent(content: string): any[] {
    const sections: any[] = [];
    const lines = content.split('\n').filter(line => line.trim());

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (!trimmedLine) {
        continue;
      }

      // Day headers (Dia 1, Day 1, etc.)
      if (/^(Dia|Day)\s+\d+/i.test(trimmedLine)) {
        sections.push({
          text: trimmedLine,
          style: 'dayHeader'
        });
      } else if (/^(Manhã|Tarde|Noite|Evening|Morning|Afternoon|Night)/i.test(trimmedLine)) {
        // Time headers (Manhã, Tarde, Noite, Morning, Afternoon, etc.)
        sections.push({
          text: trimmedLine,
          style: 'timeHeader'
        });
      } else if (/^\d+\.|\*\*.*\*\*/.test(trimmedLine)) {
        // Main headers (numbered sections, **bold text**)
        const cleanText = trimmedLine.replace(/\*\*/g, '');
        sections.push({
          text: cleanText,
          style: 'sectionHeader'
        });
      } else if (/^[-•*]\s/.test(trimmedLine)) {
        // Bullet points
        const bulletText = trimmedLine.replace(/^[-•*]\s/, '');
        sections.push({
          text: `• ${bulletText}`,
          style: 'contentText',
          margin: [15, 0, 0, 5]
        });
      } else {
        // Regular content
        sections.push({
          text: trimmedLine,
          style: 'contentText'
        });
      }
    }

    return sections;
  }

  /**
   * Generate unique filename for PDF
   */
  private static generateFilename(itinerary: Itinerary): string {
    const destination = itinerary.destination
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
    
    const timestamp = Date.now();
    return `itinerary_${destination}_${itinerary.id}_${timestamp}.pdf`;
  }

  /**
   * Ensure PDF storage directory exists
   */
  private static async ensurePDFDirectory(): Promise<void> {
    try {
      await fs.access(config.PDF_STORAGE_PATH);
    } catch {
      logger.info('Creating PDF storage directory', {
        context: 'pdf',
        path: config.PDF_STORAGE_PATH
      });
      await fs.mkdir(config.PDF_STORAGE_PATH, { recursive: true });
    }
  }

  /**
   * Check if PDF file exists
   */
  static async pdfExists(filepath: string): Promise<boolean> {
    try {
      await fs.access(filepath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Delete PDF file
   */
  static async deletePDF(filepath: string): Promise<void> {
    try {
      await fs.unlink(filepath);
      logger.info('PDF file deleted', { context: 'pdf', filepath });
    } catch (error) {
      logger.warn('Failed to delete PDF file', {
        context: 'pdf',
        filepath,
        error: (error as Error).message
      });
    }
  }

  /**
   * Get PDF file size
   */
  static async getPDFSize(filepath: string): Promise<number> {
    try {
      const stats = await fs.stat(filepath);
      return stats.size;
    } catch {
      return 0;
    }
  }

  /**
   * Close browser instance (cleanup) - kept for compatibility
   */
  static async closeBrowser(): Promise<void> {
    // No browser to close with PDFMake, but keep method for compatibility
    logger.info('PDF service cleanup called (PDFMake - no browser to close)', { context: 'pdf' });
  }

  /**
   * Health check for PDF service
   */
  static async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; error?: string }> {
    try {
      // Test PDF generation with simple content
      const testItinerary: Itinerary = {
        id: 0,
        destination: 'Health Check Test',
        start_date: new Date(),
        end_date: new Date(),
        processing_status: 'completed',
        created_at: new Date(),
        client_ip: 'test',
        request_data: {
          destination: 'Health Check Test',
          start_date: new Date().toISOString(),
          end_date: new Date().toISOString()
        },
        generated_content: 'Test content',
        model_used: 'groq'
      };

      const testContent = 'Health check test content for PDF generation.';
      
      // Create a temporary test document definition
      const docDefinition = this.createItineraryDocDefinition(testItinerary, testContent);
      
      // Try to create PDF document (without writing to file)
      const printer = this.getPrinter();
      const pdfDoc = printer.createPdfKitDocument(docDefinition);
      
      // Test that we can create the document
      if (pdfDoc) {
        pdfDoc.end(); // Close the document
        return { status: 'healthy' };
      } else {
        return { status: 'unhealthy', error: 'PDF document creation returned null' };
      }
    } catch (error) {
      return { status: 'unhealthy', error: (error as Error).message };
    }
  }
}

export const pdfService = PDFService;