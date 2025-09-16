import { z } from 'zod';

// Travel question validation schema
export const travelQuestionSchema = z.object({
  question: z
    .string()
    .min(10, 'Question must be at least 10 characters')
    .max(1000, 'Question must be less than 1000 characters')
    .regex(
      /^[a-zA-Z0-9\s\?\!\.\,\-\'\"À-ÿ\u00f1\u00d1\(\)]+$/,
      'Question contains invalid characters'
    ),
  model: z
    .enum(['groq', 'gemini'], {
      errorMap: () => ({ message: "Model must be either 'groq' or 'gemini'" })
    })
});

// Itinerary request validation schema
export const itineraryRequestSchema = z.object({
  destination: z
    .string()
    .min(2, 'Destination must be at least 2 characters')
    .max(255, 'Destination must be less than 255 characters')
    .regex(
      /^[a-zA-Z0-9\s\-\,\'À-ÿ\u00f1\u00d1\(\)]+$/,
      'Destination contains invalid characters'
    ),
  start_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Use YYYY-MM-DD')
    .refine((date: string) => {
      const startDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return startDate >= today;
    }, 'Start date must be today or in the future'),
  end_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Use YYYY-MM-DD'),
  budget: z
    .number()
    .min(100, 'Budget must be at least $100')
    .max(50000, 'Budget must be less than $50,000')
    .optional(),
  interests: z
    .array(
      z.string()
        .min(1, 'Interest cannot be empty')
        .max(50, 'Interest must be less than 50 characters')
        .regex(
          /^[a-zA-Z0-9\s\-\_]+$/,
          'Interest contains invalid characters'
        )
    )
    .max(10, 'Maximum 10 interests allowed')
    .optional(),
  travel_style: z
    .enum(['budget', 'mid-range', 'luxury'], {
      errorMap: () => ({ message: "Travel style must be 'budget', 'mid-range', or 'luxury'" })
    })
    .optional(),
  accommodation_type: z
    .enum(['hotel', 'hostel', 'airbnb', 'any'], {
      errorMap: () => ({ message: "Accommodation type must be 'hotel', 'hostel', 'airbnb', or 'any'" })
    })
    .optional(),
  group_size: z
    .number()
    .int('Group size must be a whole number')
    .min(1, 'Group size must be at least 1')
    .max(20, 'Group size must be less than 20')
    .optional(),
  special_requirements: z
    .string()
    .max(500, 'Special requirements must be less than 500 characters')
    .regex(
      /^[a-zA-Z0-9\s\?\!\.\,\-\'\"À-ÿ\u00f1\u00d1\(\)\n\r]+$/,
      'Special requirements contain invalid characters'
    )
    .optional()
}).refine((data: { start_date: string; end_date: string }) => {
  const startDate = new Date(data.start_date);
  const endDate = new Date(data.end_date);
  return endDate > startDate;
}, {
  message: 'End date must be after start date',
  path: ['end_date']
}).refine((data: { start_date: string; end_date: string }) => {
  const startDate = new Date(data.start_date);
  const endDate = new Date(data.end_date);
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= 14;
}, {
  message: 'Trip duration cannot exceed 14 days',
  path: ['end_date']
});

// Query parameter schemas
export const paginationSchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((val: string | undefined) => val ? parseInt(val, 10) : 10)
    .refine((val: number) => val >= 1 && val <= 50, 'Limit must be between 1 and 50'),
  offset: z
    .string()
    .optional()
    .transform((val: string | undefined) => val ? parseInt(val, 10) : 0)
    .refine((val: number) => val >= 0, 'Offset must be non-negative')
});

export const statusFilterSchema = z.object({
  status: z
    .enum(['pending', 'processing', 'completed', 'failed'])
    .optional()
});

// ID parameter schema
export const idParamSchema = z.object({
  id: z
    .string()
    .transform((val: string) => parseInt(val, 10))
    .refine((val: number) => !isNaN(val) && val > 0, 'ID must be a positive number')
});

// Chat message schema (for future use)
export const chatMessageSchema = z.object({
  message: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(1000, 'Message must be less than 1000 characters')
    .regex(
      /^[a-zA-Z0-9\s\?\!\.\,\-\'\"À-ÿ\u00f1\u00d1\(\)\n\r]+$/,
      'Message contains invalid characters'
    )
});

// Type exports for use in controllers
export type TravelQuestionInput = z.infer<typeof travelQuestionSchema>;
export type ItineraryRequestInput = z.infer<typeof itineraryRequestSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type StatusFilterInput = z.infer<typeof statusFilterSchema>;
export type IdParamInput = z.infer<typeof idParamSchema>;
export type ChatMessageInput = z.infer<typeof chatMessageSchema>;

