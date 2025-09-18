import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Label } from '../ui/label'
import { Alert, AlertDescription } from '../ui/alert'
import { apiClient } from '../../services/api'
import { TravelQuestionFormData, MODEL_OPTIONS } from '../../types/forms'
import { TravelQuestionResponse, RateLimitError } from '../../types/api'
import { Loader2, Send, RotateCcw } from 'lucide-react'

const travelQuestionSchema = z.object({
  question: z.string()
    .min(10, 'A pergunta deve ter pelo menos 10 caracteres')
    .max(1000, 'A pergunta deve ter no máximo 1000 caracteres'),
  model: z.enum(['groq', 'gemini'], {
    required_error: 'Selecione um modelo de IA'
  })
})

export function TravelQuestionForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [response, setResponse] = useState<TravelQuestionResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitError['rateLimitInfo'] | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors }
  } = useForm<TravelQuestionFormData>({
    resolver: zodResolver(travelQuestionSchema)
  })

  const watchedModel = watch('model')

  const onSubmit = async (data: TravelQuestionFormData) => {
    setIsLoading(true)
    setError(null)
    setResponse(null)
    setRateLimitInfo(null)

    try {
      const result = await apiClient.submitTravelQuestion({
        question: data.question,
        model: data.model
      })
      
      setResponse(result)
      reset()
    } catch (err: any) {
      console.error('Error submitting travel question:', err)
      console.log('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      })
      
      if (apiClient.isRateLimitError(err)) {
        setRateLimitInfo(err.rateLimitInfo)
        setError(err.message)
      } else if (err.response?.data?.message) {
        setError(err.response.data.message)
      } else if (err.response?.data?.error) {
        setError(err.response.data.error)
      } else if (err.message) {
        setError(err.message)
      } else {
        setError('Erro ao enviar pergunta. Tente novamente.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const getResetTimeMessage = () => {
    if (!rateLimitInfo) return ''
    
    const resetDate = new Date(rateLimitInfo.resetTime * 1000)
    const now = new Date()
    const diffMs = resetDate.getTime() - now.getTime()
    
    if (diffMs <= 0) {
      return 'Limite será resetado em breve.'
    }
    
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMinutes / 60)
    const remainingMinutes = diffMinutes % 60
    
    if (diffHours > 0) {
      if (remainingMinutes > 0) {
        return `Limite será resetado em ${diffHours}h ${remainingMinutes}min.`
      } else {
        return `Limite será resetado em ${diffHours}h.`
      }
    } else if (diffMinutes > 0) {
      return `Limite será resetado em ${diffMinutes}min.`
    } else {
      return 'Limite será resetado em breve.'
    }
  }

  const handleNewQuestion = () => {
    setResponse(null)
    setError(null)
    setRateLimitInfo(null)
    reset()
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="question" className="text-brand-normal-text">
            Sua pergunta sobre viagem
          </Label>
          <Textarea
            id="question"
            placeholder="Ex: Quais são os melhores destinos para lua de mel no Brasil?"
            className="min-h-[100px]"
            {...register('question')}
          />
          {errors.question && (
            <p className="text-sm text-destructive">{errors.question.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="model" className="text-brand-normal-text">
            Modelo de IA
          </Label>
          <Select 
            value={watchedModel || ''} 
            onValueChange={(value) => setValue('model', value as 'groq' | 'gemini')}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o modelo de IA" />
            </SelectTrigger>
            <SelectContent>
              {MODEL_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.model && (
            <p className="text-sm text-destructive">{errors.model.message}</p>
          )}
        </div>

        <Button 
          type="submit" 
          disabled={isLoading} 
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processando com IA...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Enviar Pergunta
            </>
          )}
        </Button>
      </form>

      {isLoading && (
        <div className="space-y-4 p-4 bg-brand-secondary-bg rounded-lg border border-brand-input-border animate-pulse">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-brand-accent-text" />
            <div>
              <h3 className="font-heading text-lg font-semibold text-brand-accent-text">
                Processando sua pergunta...
              </h3>
              <p className="text-sm text-brand-normal-text opacity-75">
                A IA está analisando sua pergunta e preparando uma resposta personalizada.
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="h-4 bg-brand-primary-bg rounded animate-pulse"></div>
            <div className="h-4 bg-brand-primary-bg rounded w-3/4 animate-pulse"></div>
            <div className="h-4 bg-brand-primary-bg rounded w-1/2 animate-pulse"></div>
          </div>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            {error}
            {rateLimitInfo && (
              <div className="mt-2 text-sm">
                <p>{getResetTimeMessage()}</p>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {response && (
        <div className="space-y-4 p-4 bg-brand-secondary-bg rounded-lg border border-brand-input-border">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-lg font-semibold text-brand-accent-text">
              Resposta
            </h3>
            <span className="text-xs text-brand-normal-text opacity-75">
              Modelo: {response.model_used}
            </span>
          </div>
          
          <div className="text-brand-normal-text whitespace-pre-wrap">
            {response.response}
          </div>
          
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-brand-input-border">
            <div className="text-xs text-brand-normal-text opacity-75">
              {new Date(response.created_at).toLocaleString('pt-BR')}
            </div>
            <Button 
              onClick={handleNewQuestion}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-3 w-3" />
              Nova Pergunta
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
