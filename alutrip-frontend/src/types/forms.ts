export interface TravelQuestionFormData {
  question: string;
  model: 'groq' | 'gemini';
}

export interface ItineraryFormData {
  destination: string;
  startDate: Date;
  endDate: Date;
  budget?: number;
  interests?: string[];
}

export interface FormState {
  isLoading: boolean;
  error?: string;
  success?: boolean;
}

export const INTEREST_OPTIONS = [
  { value: 'culture', label: 'Cultura & Museus' },
  { value: 'food', label: 'Gastronomia' },
  { value: 'nightlife', label: 'Vida Noturna' },
  { value: 'nature', label: 'Natureza & Parques' },
  { value: 'adventure', label: 'Esportes Radicais' },
  { value: 'shopping', label: 'Compras' },
  { value: 'history', label: 'Sítios Históricos' },
  { value: 'art', label: 'Arte & Galerias' },
  { value: 'architecture', label: 'Arquitetura' },
  { value: 'local', label: 'Experiências Locais' }
] as const;

export type InterestOption = typeof INTEREST_OPTIONS[number]['value'];

export const MODEL_OPTIONS = [
  { value: 'groq', label: 'Groq (Fast)' },
  { value: 'gemini', label: 'Gemini (Advanced)' }
] as const;

export type ModelOption = typeof MODEL_OPTIONS[number]['value'];
