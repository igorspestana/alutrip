// AI Models
export type AIModel = 'groq' | 'gemini';

// Travel question types
export interface TravelQuestion {
  id: number;
  session_id?: string;
  client_ip: string;
  question: string;
  model_used: AIModel;
  response: string;
  created_at: Date;
}

export interface TravelQuestionRequest {
  question: string;
  model: AIModel;
}

export interface TravelQuestionResponse {
  id: number;
  question: string;
  response: string;
  model_used: AIModel;
  created_at: string;
}

// Itinerary types
export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Itinerary {
  id: number;
  session_id?: string;
  client_ip: string;
  destination: string;
  start_date: Date;
  end_date: Date;
  budget?: number;
  interests?: string[];
  request_data: ItineraryRequestData;
  generated_content: string;
  pdf_filename?: string;
  pdf_path?: string;
  model_used: AIModel;
  processing_status: ProcessingStatus;
  created_at: Date;
  completed_at?: Date;
}

export interface ItineraryRequestData {
  destination: string;
  start_date: string;
  end_date: string;
  budget?: number;
  interests?: string[];
}

export interface ItineraryRequest extends ItineraryRequestData {}

export interface ItineraryResponse {
  id: number;
  destination: string;
  start_date: string;
  end_date: string;
  processing_status: ProcessingStatus;
  created_at: string;
  estimated_completion?: string;
}

export interface ItineraryStatus {
  id: number;
  destination: string;
  processing_status: ProcessingStatus;
  created_at: string;
  completed_at?: string;
  pdf_available: boolean;
  pdf_filename?: string;
}

// Rate limiting types
export interface RateLimit {
  id: number;
  client_ip: string;
  feature: RateLimitFeature;
  request_count: number;
  window_start: Date;
  last_request: Date;
}

export type RateLimitFeature = 'travel_questions' | 'itineraries';

export interface RateLimitInfo {
  used: number;
  limit: number;
  remaining: number;
  reset_time: string;
}

export interface RateLimitStatus {
  ip: string;
  limits: {
    travel_questions: RateLimitInfo;
    itineraries: RateLimitInfo;
  };
}

// Conversation types (for future chat support)
export interface Conversation {
  id: number;
  session_id: string;
  initial_question_id: number;
  title?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Message {
  id: number;
  conversation_id: number;
  message_type: 'question' | 'response';
  content: string;
  model_used?: AIModel;
  created_at: Date;
}

// AI Service types
export interface AIServiceResponse {
  content: string;
  model_used: AIModel;
  token_usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  processing_time_ms: number;
}

export interface AIServiceError extends Error {
  provider: AIModel;
  code?: string;
  status?: number;
}

// PDF Generation types
export interface PDFGenerationOptions {
  template?: string;
  format?: 'A4' | 'Letter';
  orientation?: 'portrait' | 'landscape';
  margins?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

export interface PDFGenerationResult {
  filename: string;
  filepath: string;
  size: number;
  pages: number;
  generation_time_ms: number;
}

