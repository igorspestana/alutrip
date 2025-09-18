export interface ApiResponse<T> {
  status: string;
  data?: T;
  error?: string;
  message?: string;
}

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

export interface ItineraryRequest {
  destination: string;
  start_date: string;
  end_date: string;
  budget?: number;
  interests?: string[];
}

export interface Itinerary {
  id: string;
  destination: string;
  start_date: string;
  end_date: string;
  budget?: number;
  interests?: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  pdf_url?: string;
  error_message?: string;
}

export interface ItineraryStatusResponse {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  error_message?: string;
  pdf_url?: string;
}

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

export interface HealthCheckResponse {
  status: 'ok' | 'error';
  timestamp: string;
  version?: string;
}
