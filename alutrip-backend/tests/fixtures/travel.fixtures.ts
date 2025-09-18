import { TravelQuestion, TravelQuestionRequest, TravelQuestionResponse, AIServiceResponse } from '../../src/types/travel';

// Mock travel questions data
export const mockTravelQuestionRequest: TravelQuestionRequest = {
  question: 'What are the best places to visit in Paris?',
  model: 'groq'
};

export const mockTravelQuestion: TravelQuestion = {
  id: 1,
  session_id: 'session123',
  client_ip: '127.0.0.1',
  question: 'What are the best places to visit in Paris?',
  model_used: 'groq',
  response: 'Paris offers amazing attractions like the Eiffel Tower, Louvre Museum, and Notre-Dame Cathedral...',
  created_at: new Date('2024-01-15T10:00:00.000Z')
};

export const mockTravelQuestionResponse: TravelQuestionResponse = {
  id: 1,
  question: 'What are the best places to visit in Paris?',
  response: 'Paris offers amazing attractions like the Eiffel Tower, Louvre Museum, and Notre-Dame Cathedral...',
  model_used: 'groq',
  created_at: '2024-01-15T10:00:00.000Z'
};

export const mockAIServiceResponse: AIServiceResponse = {
  content: 'Paris offers amazing attractions like the Eiffel Tower, Louvre Museum, and Notre-Dame Cathedral...',
  model_used: 'groq',
  token_usage: {
    prompt_tokens: 50,
    completion_tokens: 200,
    total_tokens: 250
  },
  processing_time_ms: 1500
};

// Mock travel questions list
export const mockTravelQuestionsList: TravelQuestion[] = [
  mockTravelQuestion,
  {
    ...mockTravelQuestion,
    id: 2,
    question: 'What is the best time to visit Tokyo?',
    response: 'Tokyo is beautiful year-round, but spring (March-May) and autumn (September-November) offer the best weather...'
  },
  {
    ...mockTravelQuestion,
    id: 3,
    question: 'What are some budget-friendly destinations in Europe?',
    response: 'Some affordable European destinations include Prague, Budapest, Krakow, and Portugal...'
  }
];

// Mock stats data
export const mockTravelStats = {
  total: 150,
  today: 12,
  byModel: { groq: 85, gemini: 65 },
  avgResponseLength: 342
};

// Mock model health data
export const mockModelHealth = {
  groq: {
    status: 'healthy' as const,
    model: 'llama-3.1-8b-instant',
    available: true
  },
  gemini: {
    status: 'healthy' as const, 
    model: 'gemini-1.5-pro',
    available: true
  },
  overall: 'healthy' as const
};
