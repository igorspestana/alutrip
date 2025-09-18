// API Response types (real API structure)
export interface ApiResponse<T> {
  status: string;
  data?: T;
  error?: string;
  message?: string;
}

// Travel Q&A types
export interface TravelQuestion {
  id: string;
  question: string;
  model: 'groq' | 'gemini';
  answer?: string;
  createdAt: string;
  status: 'pending' | 'completed' | 'failed';
}

export interface TravelQuestionRequest {
  question: string;
  model: 'groq' | 'gemini';
}

export interface TravelQuestionResponse {
  id: number;
  question: string;
  response: string;
  model_used: 'groq' | 'gemini';
  created_at: string;
}

// Itinerary types
export interface ItineraryRequest {
  destination: string;
  startDate: string;
  endDate: string;
  budget?: number;
  interests?: string[];
}

export interface Itinerary {
  id: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget?: number;
  interests?: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  pdfUrl?: string;
  errorMessage?: string;
}

export interface ItineraryStatusResponse {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  errorMessage?: string;
  pdfUrl?: string;
}

// Rate limiting types
export interface RateLimitInfo {
  remaining: number;
  resetTime: number;
  limit: number;
}

export interface RateLimitData {
  type: string;
  requestId: string;
  timestamp: string;
  feature: string;
  limit: number;
  resetTime: string;
}

export interface RateLimitError {
  error: string;
  message: string;
  rateLimitInfo: RateLimitInfo;
}

// Health check types
export interface HealthCheckResponse {
  status: 'ok' | 'error';
  timestamp: string;
  version?: string;
}
