import { Itinerary, ItineraryRequestData, ProcessingStatus, AIModel } from '../../src/types/travel';

// Mock itinerary request data
export const mockItineraryRequestData: ItineraryRequestData = {
  destination: 'Paris, France',
  start_date: '2025-12-15',
  end_date: '2025-12-18',
  budget: 1500,
  interests: ['culture', 'museums', 'gastronomy']
};

// Mock itinerary with pending status
export const mockItineraryPending: Itinerary = {
  id: 1,
  session_id: 'session123',
  client_ip: '127.0.0.1',
  destination: 'Paris, France',
  start_date: new Date('2025-12-15'),
  end_date: new Date('2025-12-18'),
  budget: 1500,
  interests: ['culture', 'museums', 'gastronomy'],
  request_data: mockItineraryRequestData,
  generated_content: '',
  model_used: 'groq',
  processing_status: 'pending',
  created_at: new Date('2025-09-18T10:00:00.000Z')
};

// Mock itinerary with processing status
export const mockItineraryProcessing: Itinerary = {
  ...mockItineraryPending,
  processing_status: 'processing'
};

// Mock completed itinerary
export const mockItineraryCompleted: Itinerary = {
  ...mockItineraryPending,
  id: 2,
  generated_content: `# Roteiro Completo: Paris, França

## Introdução ao Destino
Paris, a Cidade Luz, é um dos destinos mais românticos e culturalmente ricos do mundo...

## Informações Práticas
- Documentação: Passaporte válido
- Moeda: Euro (EUR)
- Transporte: Metro, ônibus, táxi

## Roteiro Diário

### Dia 1 - Centro Histórico
**Manhã (9h-12h):** Torre Eiffel
**Almoço (12h-14h):** Café de la Paix (€25-35)
**Tarde (14h-18h):** Museu do Louvre
**Jantar (19h-21h):** Le Grand Véfour (€80-120)`,
  pdf_filename: 'itinerary_paris_france_2_1234567890.pdf',
  pdf_path: '/app/pdfs/itinerary_paris_france_2_1234567890.pdf',
  model_used: 'groq',
  processing_status: 'completed',
  completed_at: new Date('2025-09-18T10:05:00.000Z')
};

// Mock failed itinerary
export const mockItineraryFailed: Itinerary = {
  ...mockItineraryPending,
  id: 3,
  processing_status: 'failed'
};

// List of mock itineraries
export const mockItinerariesList: Itinerary[] = [
  mockItineraryCompleted,
  mockItineraryProcessing,
  mockItineraryPending,
  mockItineraryFailed
];

// Mock itinerary statistics
export const mockItineraryStats = {
  total: 100,
  today: 8,
  byStatus: {
    pending: 15,
    processing: 5,
    completed: 75,
    failed: 5
  } as Record<ProcessingStatus, number>,
  byModel: {
    groq: 80,
    gemini: 20
  },
  avgProcessingTime: 4.2 // minutes
};

// Mock AI service response for itinerary
export const mockAIItineraryResponse = {
  content: mockItineraryCompleted.generated_content,
  model_used: 'groq' as AIModel,
  token_usage: {
    prompt_tokens: 150,
    completion_tokens: 2000,
    total_tokens: 2150
  },
  processing_time_ms: 8500
};

// Mock PDF service response
export const mockPDFServiceResponse = {
  filename: 'itinerary_paris_france_2_1234567890.pdf',
  filepath: '/app/pdfs/itinerary_paris_france_2_1234567890.pdf',
  size: 350000
};

// Mock recent itineraries response
export const mockRecentItinerariesResponse = {
  itineraries: [mockItineraryCompleted, mockItineraryProcessing],
  total: 2
};

// Mock client IP
export const testClientIp = '192.168.1.100';
export const testSessionId = 'session-test-123';

// Date validation test cases
export const validDateRanges = [
  {
    start_date: '2024-12-01',
    end_date: '2024-12-03',
    description: 'Valid 2-day trip'
  },
  {
    start_date: '2024-12-15',
    end_date: '2024-12-22',
    description: 'Valid 7-day trip (max allowed)'
  }
];

export const invalidDateRanges = [
  {
    start_date: '2024-01-01',
    end_date: '2024-01-03',
    description: 'Past dates',
    expectedError: 'Start date cannot be in the past'
  },
  {
    start_date: '2024-12-05',
    end_date: '2024-12-04',
    description: 'End date before start date',
    expectedError: 'End date must be after start date'
  },
  {
    start_date: '2024-12-01',
    end_date: '2024-12-09',
    description: 'Trip too long (8 days)',
    expectedError: 'Trip duration cannot exceed 7 days'
  },
  {
    start_date: '2024-12-01',
    end_date: '2024-12-01',
    description: 'Same start and end date',
    expectedError: 'End date must be after start date'
  }
];

// Mock itinerary prompt building test cases
export const itineraryPromptTestCases = [
  {
    name: 'Basic itinerary with budget',
    itinerary: {
      ...mockItineraryPending,
      budget: 2000
    } as Itinerary,
    shouldContain: [
      'Paris, France',
      '$2,000 USD',
      'Interesses específicos',
      '3 dia'
    ]
  },
  {
    name: 'Itinerary without budget',
    itinerary: {
      ...mockItineraryPending,
      budget: 0
    } as Itinerary,
    shouldNotContain: ['Orçamento:', '$']
  },
  {
    name: 'Itinerary without interests',
    itinerary: {
      ...mockItineraryPending,
      interests: []
    } as Itinerary,
    shouldNotContain: ['Interesses específicos:']
  },
  {
    name: 'Single day trip',
    itinerary: {
      ...mockItineraryPending,
      start_date: new Date('2025-12-15'),
      end_date: new Date('2025-12-16') // Next day for 1 day duration
    } as Itinerary,
    shouldContain: ['1 dia'] // Should show singular form
  }
];

// Error scenarios for testing
export const itineraryErrorScenarios = {
  aiServiceError: new Error('AI service failed'),
  pdfServiceError: new Error('PDF generation failed'),
  databaseError: new Error('Database connection lost'),
  validationError: new Error('Invalid input data')
};

// Mock database responses
export const mockDatabaseResponses = {
  createSuccess: mockItineraryPending,
  findByIdSuccess: mockItineraryCompleted,
  findByIdNotFound: null,
  updateStatusSuccess: true,
  updateContentSuccess: true,
  findRecentSuccess: mockRecentItinerariesResponse,
  findByClientIpSuccess: [mockItineraryCompleted],
  findPendingSuccess: [mockItineraryPending, mockItineraryProcessing],
  getStatsSuccess: mockItineraryStats,
  deleteOlderThanSuccess: 25
};

// Processing time test scenarios
export const processingTimeScenarios = {
  fast: {
    aiResponseTime: 2000,
    pdfGenerationTime: 3000,
    totalExpected: 5000
  },
  slow: {
    aiResponseTime: 8000,
    pdfGenerationTime: 12000,
    totalExpected: 20000
  },
  timeout: {
    aiResponseTime: 30000,
    pdfGenerationTime: 25000,
    totalExpected: 55000
  }
};
