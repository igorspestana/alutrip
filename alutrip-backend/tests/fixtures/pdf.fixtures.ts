import { Itinerary } from '../../src/types/travel';

// Mock itinerary data for PDF generation
export const mockItinerary: Itinerary = {
  id: 1,
  session_id: 'session123',
  client_ip: '127.0.0.1',
  destination: 'Paris, France',
  start_date: new Date('2024-03-15'),
  end_date: new Date('2024-03-18'),
  budget: 1500,
  interests: ['culture', 'museums', 'gastronomy'],
  request_data: {
    destination: 'Paris, France',
    start_date: '2024-03-15',
    end_date: '2024-03-18',
    budget: 1500,
    interests: ['culture', 'museums', 'gastronomy']
  },
  generated_content: `# Roteiro Completo: Paris, França

## Introdução ao Destino
Paris, a Cidade Luz, é um dos destinos mais românticos e culturalmente ricos do mundo. Com seus monumentos icônicos, museus de classe mundial e uma gastronomia incomparável, Paris oferece uma experiência única que combina história, arte e sofisticação.

## Informações Práticas
- **Documentação:** Passaporte válido (brasileiros não precisam de visto para estadia até 90 dias)
- **Moeda:** Euro (EUR) - 1 USD ≈ 0.92 EUR (cotação aproximada)
- **Transporte:** Metro eficiente, ônibus, táxis e Uber disponíveis
- **Idioma:** Francês (inglês é falado em áreas turísticas)

## Roteiro Diário Detalhado

### Dia 1 - Marcos Históricos (15/03/2024)
**Manhã (9h-12h):** Torre Eiffel
- Chegada às 9h para evitar multidões
- Subida ao segundo andar (€16.60)
- Tempo necessário: 3 horas
- Como chegar: Metro Linha 6 (Bir-Hakeim)

**Almoço (12h-14h):** Café de la Paix
- Custo: €35-45 por pessoa
- Reservas recomendadas
- Especialidade: Cuisine française tradicional

**Tarde (14h-18h):** Museu do Louvre
- Ingresso: €17 (reserve online)
- Foque nas obras principais: Mona Lisa, Vênus de Milo
- Como chegar: Metro Linha 1 (Palais-Royal)

**Jantar (19h-21h):** Le Comptoir du Relais
- Custo: €60-80 por pessoa
- Bistrô autêntico em Saint-Germain
- Reservas essenciais

**Noite (21h+):** Passeio pelo Sena
- Cruzeiro noturno: €15-25
- Vista dos monumentos iluminados

### Dia 2 - Arte e Cultura (16/03/2024)
**Manhã (9h-12h):** Museu d'Orsay
- Ingresso: €14
- Melhor coleção de arte impressionista
- Tempo necessário: 3 horas

**Almoço (12h-14h):** L'Ami Jean
- Custo: €40-50 por pessoa
- Cuisine basque moderna
- Localização: 7º arrondissement

**Tarde (14h-18h):** Montmartre e Sacré-Cœur
- Entrada gratuita na basílica
- Explore as ruas de artistas
- Funicular: €1.90

**Jantar (19h-21h):** Le Consulat
- Custo: €50-70 por pessoa
- Vista panorâmica de Paris
- Localização: Montmartre

### Dia 3 - Charme Parisiense (17/03/2024)
**Manhã (9h-12h):** Champs-Élysées e Arco do Triunfo
- Subida ao Arco: €13
- Shopping nas lojas famosas
- Café no Ladurée: €15-20

**Almoço (12h-14h):** Breizh Café
- Custo: €25-35 por pessoa
- Crêpes gourmet
- Reservas recomendadas

**Tarde (14h-18h):** Quartier Latin
- Passeio pela Sorbonne
- Panthéon: €11.50
- Livrarias históricas

**Jantar (19h-21h):** Le Procope
- Custo: €55-75 por pessoa
- Restaurante histórico (1686)
- Cuisine française clássica

### Dia 4 - Jardins e Despedida (18/03/2024)
**Manhã (9h-12h):** Jardins de Luxemburgo
- Entrada gratuita
- Palácio de Luxemburgo
- Passeio relaxante

**Almoço (12h-14h):** Polidor
- Custo: €30-40 por pessoa
- Bistrô tradicional desde 1845
- Localização: 6º arrondissement

**Tarde (14h-17h):** Shopping ou museus adicionais
- Galeries Lafayette (compras)
- Ou Musée Rodin (€14)

## Sugestões de Hospedagem

### Luxo (€400-800/noite)
- **Le Meurice:** Hotel palácio no 1º arrondissement
- **Hotel Plaza Athénée:** Elegância na Avenue Montaigne
- **The Ritz Paris:** Lendário hotel na Place Vendôme

### Intermediário (€150-300/noite)
- **Hotel Malte Opera:** Boutique hotel no 2º arrondissement
- **Hotel des Grands Boulevards:** Design moderno no 2º
- **Hotel Particulier Montmartre:** Charme em Montmartre

### Econômico (€50-120/noite)
- **Hotel Jeanne d'Arc:** 3 estrelas no Marais
- **MIJE Hostels:** Albergues históricos
- **Hotel des Arts Montmartre:** Budget em Montmartre

## Orçamento Estimado (Por Pessoa)

### Acomodação (3 noites)
- Luxo: €1,200-2,400
- Intermediário: €450-900
- Econômico: €150-360

### Alimentação (4 dias)
- Café da manhã: €10-15/dia = €40-60
- Almoço: €30-50/dia = €120-200
- Jantar: €50-80/dia = €200-320
- **Total alimentação: €360-580**

### Transporte
- Passe Navigo (4 dias): €30
- Táxis ocasionais: €50-80
- **Total transporte: €80-110**

### Atrações e Atividades
- Museus e monumentos: €80-100
- Cruzeiro no Sena: €20-25
- Atividades extras: €50-75
- **Total atividades: €150-200**

### Compras e Souvenirs
- Budget recomendado: €100-300

### TOTAL GERAL POR PESSOA:
- **Econômico:** €840-1,250
- **Intermediário:** €1,140-1,790
- **Luxo:** €1,970-3,630

## Dicas Extras

### O que levar na mala
- Roupas em camadas (março ainda é fresco)
- Sapatos confortáveis para caminhada
- Carregador portátil
- Adaptador de tomada europeu

### Aplicativos Úteis
- **Citymapper:** Transporte público
- **Google Translate:** Tradução offline
- **TripAdvisor:** Avaliações de restaurantes
- **Musée:** Informações sobre museus

### Frases Básicas em Francês
- Bonjour = Bom dia
- Merci = Obrigado
- S'il vous plaît = Por favor
- Où est... ? = Onde fica...?
- Combien ça coûte ? = Quanto custa?
- Parlez-vous anglais ? = Você fala inglês?

### Souvenirs Típicos
- Macarons do Ladurée
- Perfumes franceses
- Queijos e vinhos (verificar alfândega)
- Arte de rua de Montmartre
- Produtos de farmácia francesa

### Dicas de Segurança
- Cuidado com pickpockets no metro
- Evite vendedores de rua próximos aos monumentos
- Mantenha documentos em local seguro
- Use apenas táxis oficiais ou Uber

---

**Bon Voyage!** Este roteiro foi criado para aproveitar o melhor de Paris em 4 dias, considerando seu orçamento de $1,500 USD. Ajuste as atividades conforme suas preferências e aproveite cada momento na Cidade Luz!`,
  pdf_filename: 'itinerary_paris_france_1_1234567890.pdf',
  pdf_path: '/app/pdfs/itinerary_paris_france_1_1234567890.pdf',
  model_used: 'groq',
  processing_status: 'completed',
  created_at: new Date('2024-01-15T10:00:00.000Z'),
  completed_at: new Date('2024-01-15T10:05:00.000Z')
};

// Mock PDF generation result
export const mockPDFInfo = {
  filename: 'itinerary_paris_france_1_1234567890.pdf',
  filepath: '/app/pdfs/itinerary_paris_france_1_1234567890.pdf',
  size: 250000 // bytes
};

// Mock Puppeteer page object
export const mockPuppeteerPage = {
  setContent: jest.fn(),
  pdf: jest.fn(),
  close: jest.fn(),
  setViewport: jest.fn(),
  evaluateHandle: jest.fn(),
  evaluate: jest.fn()
};

// Mock Puppeteer browser object
export const mockPuppeteerBrowser = {
  newPage: jest.fn(),
  close: jest.fn(),
  pages: jest.fn()
};

// Mock PDF buffer
export const mockPDFBuffer = Buffer.from('PDF content here');

// PDF generation options
export const mockPDFOptions = {
  format: 'A4',
  printBackground: true,
  margin: {
    top: '20mm',
    right: '20mm',
    bottom: '20mm',
    left: '20mm'
  },
  displayHeaderFooter: true,
  headerTemplate: '<div></div>',
  footerTemplate: `<div style="font-size: 10px; margin: 0 auto;">
    <span class="pageNumber"></span> / <span class="totalPages"></span>
  </div>`
};

// HTML template for testing
export const mockHTMLTemplate = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Roteiro de Viagem - {{destination}}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .title { color: #2c3e50; font-size: 28px; margin-bottom: 10px; }
        .content { max-width: 800px; margin: 0 auto; }
        h1 { color: #34495e; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
        h2 { color: #2980b9; margin-top: 25px; }
        .day-section { margin: 20px 0; padding: 15px; background-color: #ecf0f1; border-radius: 5px; }
        .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #7f8c8d; }
    </style>
</head>
<body>
    <div class="header">
        <h1 class="title">🌍 Roteiro de Viagem</h1>
        <p><strong>Destino:</strong> {{destination}}</p>
        <p><strong>Período:</strong> {{startDate}} até {{endDate}}</p>
        <p><strong>Gerado em:</strong> {{generatedAt}}</p>
    </div>
    
    <div class="content">
        {{content}}
    </div>
    
    <div class="footer">
        <p>Gerado por AluTrip - Seu assistente de viagem</p>
        <p>www.alutrip.com</p>
    </div>
</body>
</html>`;

// File system mock responses
export const mockFileExists = true;
export const mockFileStats = {
  isFile: () => true,
  size: 250000,
  birthtime: new Date('2024-01-15T10:05:00.000Z'),
  mtime: new Date('2024-01-15T10:05:00.000Z')
};

// PDF validation mock data
export const validPDFPath = '/app/pdfs/itinerary_paris_france_1_1234567890.pdf';
export const invalidPDFPath = '/app/pdfs/nonexistent.pdf';
export const invalidPDFExtension = '/app/pdfs/document.txt';

// Error messages
export const pdfGenerationErrors = {
  puppeteerLaunchError: 'Failed to launch browser',
  contentGenerationError: 'Failed to generate PDF content',
  fileSystemError: 'Failed to write PDF file',
  invalidPath: 'Invalid PDF path provided'
};
