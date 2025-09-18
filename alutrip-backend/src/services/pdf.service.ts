import puppeteer, { Browser, PDFOptions } from 'puppeteer';
import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '../config/logger';
import { config } from '../config/env';
import { Itinerary } from '../types/travel';

/**
 * PDF Service for generating professional travel itineraries
 * Uses Puppeteer to convert HTML templates to PDF documents
 */
export class PDFService {
  private static browser: Browser | null = null;

  /**
   * Initialize browser instance (singleton pattern)
   */
  private static async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      logger.info('Initializing Puppeteer browser', { context: 'pdf' });
      
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ],
        timeout: 60000
      });

      // Handle browser disconnections
      this.browser.on('disconnected', () => {
        logger.warn('Puppeteer browser disconnected', { context: 'pdf' });
        this.browser = null;
      });
    }

    return this.browser;
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

      // Create HTML content
      const htmlContent = await this.createItineraryHTML(itinerary, generatedContent);

      // Generate PDF
      const browser = await this.getBrowser();
      const page = await browser.newPage();
      
      try {
        // Set page content
        await page.setContent(htmlContent, { 
          waitUntil: 'networkidle0',
          timeout: 30000
        });

        // Configure PDF options
        const pdfOptions: PDFOptions = {
          path: filepath,
          format: 'A4',
          printBackground: true,
          margin: {
            top: '20px',
            right: '20px',
            bottom: '20px',
            left: '20px'
          },
          timeout: config.PDF_TIMEOUT,
          preferCSSPageSize: true
        };

        // Generate PDF
        await page.pdf(pdfOptions);

        const processingTime = Date.now() - startTime;

        logger.info('PDF generation completed', {
          context: 'pdf',
          itineraryId: itinerary.id,
          filename,
          processingTime: `${processingTime}ms`
        });

        return { filename, filepath };

      } finally {
        await page.close();
      }

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
   * Create HTML content for itinerary PDF
   */
  private static async createItineraryHTML(
    itinerary: Itinerary,
    generatedContent: string
  ): Promise<string> {
    

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

    // Format content with proper line breaks and structure
    const formattedContent = this.formatItineraryContent(generatedContent);

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Roteiro de Viagem - ${itinerary.destination}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #fff;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 20px;
            text-align: center;
            margin-bottom: 30px;
        }
        
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
            font-weight: 300;
        }
        
        .header p {
            font-size: 1.2em;
            opacity: 0.9;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 0 20px;
        }
        
        .trip-info {
            background: #f8f9fa;
            padding: 25px;
            border-radius: 10px;
            margin-bottom: 30px;
            border-left: 5px solid #667eea;
        }
        
        .trip-info h2 {
            color: #667eea;
            margin-bottom: 15px;
            font-size: 1.5em;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 15px;
        }
        
        .info-item {
            display: flex;
            align-items: center;
        }
        
        .info-label {
            font-weight: bold;
            margin-right: 10px;
            min-width: 80px;
        }
        
        .info-value {
            color: #555;
        }
        
        .interests {
            margin-top: 15px;
        }
        
        .interests-list {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 5px;
        }
        
        .interest-tag {
            background: #667eea;
            color: white;
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 0.9em;
        }
        
        .content {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-bottom: 30px;
        }
        
        .content h2 {
            color: #667eea;
            border-bottom: 2px solid #667eea;
            padding-bottom: 10px;
            margin-bottom: 25px;
            font-size: 1.8em;
        }
        
        .itinerary-text {
            font-size: 1.1em;
            line-height: 1.8;
        }
        
        .itinerary-text h3 {
            color: #764ba2;
            margin: 25px 0 15px 0;
            font-size: 1.3em;
        }
        
        .itinerary-text h4 {
            color: #555;
            margin: 20px 0 10px 0;
            font-size: 1.1em;
        }
        
        .itinerary-text p {
            margin-bottom: 15px;
        }
        
        .itinerary-text ul, .itinerary-text ol {
            margin: 15px 0 15px 20px;
        }
        
        .itinerary-text li {
            margin-bottom: 8px;
        }
        
        .footer {
            text-align: center;
            padding: 30px 20px;
            color: #777;
            border-top: 1px solid #eee;
            margin-top: 40px;
        }
        
        .footer p {
            margin-bottom: 5px;
        }
        
        .alutrip-logo {
            font-weight: bold;
            color: #667eea;
            font-size: 1.2em;
        }
        
        @media print {
            .header {
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
            }
            
            .trip-info {
                page-break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🧳 Roteiro de Viagem</h1>
        <p>${itinerary.destination}</p>
    </div>
    
    <div class="container">
        <div class="trip-info">
            <h2>📋 Informações da Viagem</h2>
            <div class="info-grid">
                <div class="info-item">
                    <span class="info-label">📍 Destino:</span>
                    <span class="info-value">${itinerary.destination}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">⏰ Duração:</span>
                    <span class="info-value">${duration} dia${duration > 1 ? 's' : ''}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">📅 Início:</span>
                    <span class="info-value">${formatDate(startDate)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">📅 Término:</span>
                    <span class="info-value">${formatDate(endDate)}</span>
                </div>
                ${itinerary.budget ? `
                <div class="info-item">
                    <span class="info-label">💰 Orçamento:</span>
                    <span class="info-value">$${itinerary.budget.toLocaleString()}</span>
                </div>
                ` : ''}
                
            </div>
            
            ${itinerary.interests && itinerary.interests.length > 0 ? `
            <div class="interests">
                <span class="info-label">🎯 Interesses:</span>
                <div class="interests-list">
                    ${itinerary.interests.map(interest => `<span class="interest-tag">${interest}</span>`).join('')}
                </div>
            </div>
            ` : ''}
            
            
        </div>
        
        <div class="content">
            <h2>🗺️ Seu Roteiro Personalizado</h2>
            <div class="itinerary-text">
                ${formattedContent}
            </div>
        </div>
    </div>
    
    <div class="footer">
        <p class="alutrip-logo">🚀 AluTrip</p>
        <p>Seu assistente de viagem inteligente</p>
        <p>Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
    </div>
</body>
</html>
    `;
  }

  /**
   * Format itinerary content for better HTML display
   */
  private static formatItineraryContent(content: string): string {
    // Replace line breaks with HTML
    let formatted = content
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');

    // Add paragraph tags
    formatted = `<p>${formatted}</p>`;

    // Format headers (Day 1, Day 2, etc.)
    formatted = formatted.replace(/(<p>|<br>)(Day \d+|Dia \d+)([^<]*?)/gi, '<h3>$2$3</h3>');
    
    // Format subheaders (Morning, Afternoon, Evening, etc.)
    formatted = formatted.replace(/(<p>|<br>)(Morning|Afternoon|Evening|Night|Manhã|Tarde|Noite)([^<]*?)/gi, '<h4>$2$3</h4>');

    // Convert bullet points to proper lists
    formatted = formatted.replace(/(<p>|<br>)[-•*]\s*([^<]*?)(<br>|<\/p>)/gi, '<li>$2</li>');
    
    // Wrap consecutive list items in ul tags
    formatted = formatted.replace(/(<li>.*?<\/li>)(\s*)(?!<li>)/gs, '<ul>$1</ul>$2');
    formatted = formatted.replace(/<\/ul>(\s*)<ul>/g, '$1');

    // Clean up empty paragraphs
    formatted = formatted.replace(/<p><\/p>/g, '');
    formatted = formatted.replace(/<p>\s*<\/p>/g, '');

    return formatted;
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
   * Close browser instance (cleanup)
   */
  static async closeBrowser(): Promise<void> {
    if (this.browser) {
      logger.info('Closing Puppeteer browser', { context: 'pdf' });
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Health check for PDF service
   */
  static async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; error?: string }> {
    try {
      // Test browser initialization
      const browser = await this.getBrowser();
      const page = await browser.newPage();
      
      // Simple HTML to PDF test
      await page.setContent('<html><body><h1>Health Check</h1></body></html>');
      const pdf = await page.pdf({ format: 'A4' });
      await page.close();

      if (pdf && pdf.length > 0) {
        return { status: 'healthy' };
      } else {
        return { status: 'unhealthy', error: 'PDF generation returned empty result' };
      }
    } catch (error) {
      return { status: 'unhealthy', error: (error as Error).message };
    }
  }
}

export const pdfService = PDFService;

