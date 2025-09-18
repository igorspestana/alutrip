import { AIServiceResponse } from '../../src/types/travel';

// Mock Groq API responses
export const mockGroqChatCompletion = {
  choices: [
    {
      message: {
        content: 'Paris offers amazing attractions like the Eiffel Tower, Louvre Museum, and Notre-Dame Cathedral. The city is best visited in spring or fall when the weather is mild and perfect for walking.'
      }
    }
  ],
  usage: {
    prompt_tokens: 45,
    completion_tokens: 180,
    total_tokens: 225
  }
};

export const mockGroqItineraryChatCompletion = {
  choices: [
    {
      message: {
        content: `# Roteiro Detalhado: Paris, França
        
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
**Jantar (19h-21h):** Le Grand Véfour (€80-120)

### Sugestões de Hospedagem
- Hotel de Luxo: Le Meurice (€800-1200/noite)
- Hotel Intermediário: Hotel Malte Opera (€150-250/noite)
- Budget: MIJE Hostel (€35-50/noite)

## Orçamento Estimado
- Hospedagem: €100-800/dia
- Alimentação: €50-150/dia
- Transporte: €15/dia
- Atrações: €30-50/dia`
      }
    }
  ],
  usage: {
    prompt_tokens: 120,
    completion_tokens: 800,
    total_tokens: 920
  }
};

// Mock Gemini API responses
export const mockGeminiResponse = {
  response: {
    text: () => 'Paris is a magnificent city with world-class museums, stunning architecture, and incredible cuisine. Key attractions include the Eiffel Tower, Louvre, and charming neighborhoods like Montmartre.'
  }
};

export const mockGeminiItineraryResponse = {
  response: {
    text: () => `# Roteiro Completo: Paris

## Visão Geral
Paris oferece uma experiência única que combina história, arte e gastronomia excepcional...

## Dia 1 - Clássicos Parisienses
- 9h: Torre Eiffel
- 12h: Almoço no Bistrot Paul Bert
- 14h: Passeio pelo Sena
- 19h: Jantar em Saint-Germain

## Orçamento
- Total estimado: €200-400/dia por pessoa`
  }
};

// Mock AI Service responses
export const mockAIServiceResponseGroq: AIServiceResponse = {
  content: 'Paris offers amazing attractions like the Eiffel Tower, Louvre Museum, and Notre-Dame Cathedral. The city is best visited in spring or fall when the weather is mild and perfect for walking.',
  model_used: 'groq',
  token_usage: {
    prompt_tokens: 45,
    completion_tokens: 180,
    total_tokens: 225
  },
  processing_time_ms: 1250
};

export const mockAIServiceResponseGemini: AIServiceResponse = {
  content: 'Paris is a magnificent city with world-class museums, stunning architecture, and incredible cuisine. Key attractions include the Eiffel Tower, Louvre, and charming neighborhoods like Montmartre.',
  model_used: 'gemini',
  token_usage: {
    prompt_tokens: 0,
    completion_tokens: 0,
    total_tokens: 0
  },
  processing_time_ms: 1800
};

// Non-travel question responses
export const mockNonTravelDeclineResponse: AIServiceResponse = {
  content: 'Olá! Eu sou o AluTrip, seu assistente de viagem! Eu estou aqui para ajudar você com tudo que envolve destinos, hospedagens, passeios, restaurantes e dicas de viagem. Essa pergunta que você fez foge um pouquinho do tema de viagens, mas se quiser, pode me mandar uma dúvida sobre sua próxima aventura que vou adorar ajudar!',
  model_used: 'groq',
  token_usage: {
    prompt_tokens: 0,
    completion_tokens: 0,
    total_tokens: 0
  },
  processing_time_ms: 50
};

// Test questions
export const travelQuestions: string[] = [
  'Where should I go in Paris?',
  'Best hotels in Tokyo',
  'What to pack for a trip to Iceland?',
  'Restaurant recommendations in Rome',
  'How much does a trip to Thailand cost?'
];

export const nonTravelQuestions: string[] = [
  'How to code in JavaScript?',
  'What is machine learning?',
  'How to lose weight?',
  'What is the capital of Mars?',
  'How to fix my computer?'
];

// Health check mock responses
export const mockHealthCheckSuccess = {
  groq: { status: 'healthy' as const },
  gemini: { status: 'healthy' as const }
};

export const mockHealthCheckPartial = {
  groq: { status: 'healthy' as const },
  gemini: { status: 'unhealthy' as const, error: 'API key invalid' }
};

export const mockHealthCheckFailure = {
  groq: { status: 'unhealthy' as const, error: 'Connection timeout' },
  gemini: { status: 'unhealthy' as const, error: 'Service unavailable' }
};

// Model info mock responses
export const mockModelInfoAvailable = {
  groq: { model: 'llama-3.1-8b-instant', available: true },
  gemini: { model: 'gemini-1.5-pro', available: true }
};

export const mockModelInfoPartial = {
  groq: { model: 'llama-3.1-8b-instant', available: false },
  gemini: { model: 'gemini-1.5-pro', available: true }
};

export const mockModelInfoUnavailable = {
  groq: { model: 'llama-3.1-8b-instant', available: false },
  gemini: { model: 'gemini-1.5-pro', available: false }
};