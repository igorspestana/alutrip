// Travel Q&A Form types
export interface TravelQuestionFormData {
  question: string;
  model: 'groq' | 'gemini';
}

// Itinerary Form types
export interface ItineraryFormData {
  destination: string;
  startDate: Date;
  endDate: Date;
  budget?: number;
  interests?: string[];
}

// Common form types
export interface FormState {
  isLoading: boolean;
  error?: string;
  success?: boolean;
}

// Interest options for itinerary form
export const INTEREST_OPTIONS = [
  'Cultura & Museus',
  'Gastronomia',
  'Vida Noturna',
  'Natureza & Parques',
  'Esportes Radicais',
  'Compras',
  'Sítios Históricos',
  'Arte & Galerias',
  'Arquitetura',
  'Experiências Locais'
] as const;

export type InterestOption = typeof INTEREST_OPTIONS[number];

// Model options for travel Q&A
export const MODEL_OPTIONS = [
  { value: 'groq', label: 'Groq (Fast)' },
  { value: 'gemini', label: 'Gemini (Advanced)' }
] as const;

export type ModelOption = typeof MODEL_OPTIONS[number]['value'];
