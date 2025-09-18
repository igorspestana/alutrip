import axios, { AxiosInstance, AxiosResponse } from 'axios';
import {
  ApiResponse,
  TravelQuestionRequest,
  TravelQuestionResponse,
  TravelQuestion,
  ItineraryRequest,
  Itinerary,
  ItineraryStatusResponse,
  HealthCheckResponse,
  RateLimitError,
  RateLimitInfo
} from '../types/api';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use(
      (config) => {
        console.log(`Making ${config.method?.toUpperCase()} request to ${config.url}`);
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      (error) => {
        if (error.response?.status === 429) {
          // Rate limit error - handle both header-based and body-based responses
          const responseData = error.response.data;
          
          let rateLimitInfo: RateLimitInfo;
          
          if (responseData?.data?.resetTime && responseData?.data?.timestamp) {
            // New backend response format
            const resetTimeMs = new Date(responseData.data.resetTime).getTime();
            const remaining = Math.max(0, responseData.data.limit - 1);
            
            rateLimitInfo = {
              remaining: remaining,
              resetTime: Math.floor(resetTimeMs / 1000),
              limit: responseData.data.limit,
            };
          } else {
            // Fallback to header-based format
            rateLimitInfo = {
              remaining: parseInt(error.response.headers['x-ratelimit-remaining'] || '0'),
              resetTime: parseInt(error.response.headers['x-ratelimit-reset'] || '0'),
              limit: parseInt(error.response.headers['x-ratelimit-limit'] || '5'),
            };
          }
          
          const rateLimitError: RateLimitError = {
            error: 'Rate limit exceeded',
            message: 'Você excedeu o limite de requisições. Tente novamente mais tarde.',
            rateLimitInfo: rateLimitInfo,
          };
          return Promise.reject(rateLimitError);
        }
        return Promise.reject(error);
      }
    );
  }

  async healthCheck(): Promise<HealthCheckResponse> {
    const response = await this.client.get<HealthCheckResponse>('/health');
    return response.data;
  }

  async submitTravelQuestion(data: TravelQuestionRequest): Promise<TravelQuestionResponse> {
    const response = await this.client.post<ApiResponse<TravelQuestionResponse>>(
      '/api/travel/ask',
      data
    );
    
    if (response.data.status !== 'success' || !response.data.data) {
      throw new Error(response.data.error || 'Failed to submit travel question');
    }
    
    return response.data.data;
  }

  async getTravelQuestion(id: string): Promise<TravelQuestion> {
    const response = await this.client.get<ApiResponse<TravelQuestion>>(
      `/api/travel/questions/${id}`
    );
    
    if (response.data.status !== 'success' || !response.data.data) {
      throw new Error(response.data.error || 'Failed to get travel question');
    }
    
    return response.data.data;
  }

  async createItinerary(data: ItineraryRequest): Promise<Itinerary> {
    const response = await this.client.post<ApiResponse<Itinerary>>(
      '/api/itinerary/create',
      data
    );
    
    if (response.data.status !== 'success' || !response.data.data) {
      throw new Error(response.data.error || 'Failed to create itinerary');
    }
    
    return response.data.data;
  }

  async getItineraryStatus(id: string): Promise<ItineraryStatusResponse> {
    const response = await this.client.get<ApiResponse<ItineraryStatusResponse>>(
      `/api/itinerary/${id}/status`
    );
    
    if (response.data.status !== 'success' || !response.data.data) {
      throw new Error(response.data.error || 'Failed to get itinerary status');
    }
    
    return response.data.data;
  }

  async downloadItinerary(id: string): Promise<Blob> {
    const response = await this.client.get(`/api/itinerary/${id}/download`, {
      responseType: 'blob',
    });
    
    return response.data;
  }

  isRateLimitError(error: any): error is RateLimitError {
    return error && typeof error === 'object' && 'rateLimitInfo' in error;
  }
}

export const apiClient = new ApiClient();
export default apiClient;
