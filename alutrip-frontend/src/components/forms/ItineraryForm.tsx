import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { differenceInDays } from 'date-fns'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Checkbox } from '../ui/checkbox'
import { DatePicker } from '../ui/date-picker'
import { Alert, AlertDescription } from '../ui/alert'
import { apiClient } from '../../services/api'
import { ItineraryFormData, INTEREST_OPTIONS } from '../../types/forms'
import { Itinerary, RateLimitError } from '../../types/api'
import { Loader2, MapPin, Calendar, DollarSign, Heart, Download } from 'lucide-react'

const itinerarySchema = z.object({
  destination: z.string()
    .min(2, 'Destino deve ter pelo menos 2 caracteres')
    .max(100, 'Destino deve ter no máximo 100 caracteres'),
  startDate: z.date({
    required_error: 'Data de início é obrigatória'
  }),
  endDate: z.date({
    required_error: 'Data de fim é obrigatória'
  }),
  budget: z.number()
    .min(100, 'Orçamento mínimo é $100')
    .max(50000, 'Orçamento máximo é $50,000')
    .optional()
    .or(z.nan().transform(() => undefined)),
  interests: z.array(z.string()).max(10, 'Máximo de 10 interesses').optional()
}).refine((data) => {
  if (data.startDate && data.endDate) {
    const diffDays = differenceInDays(data.endDate, data.startDate)
    return diffDays >= 0 && diffDays <= 7
  }
  return true
}, {
  message: 'A viagem deve ter entre 1 e 7 dias',
  path: ['endDate']
})

export function ItineraryForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [itinerary, setItinerary] = useState<Itinerary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitError['rateLimitInfo'] | null>(null)
  const [processingStatus, setProcessingStatus] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors }
  } = useForm<ItineraryFormData>({
    resolver: zodResolver(itinerarySchema),
    defaultValues: {
      interests: []
    }
  })

  const watchedInterests = watch('interests') || []

  useEffect(() => {
    if (!rateLimitInfo) return

    const interval = setInterval(() => {
      const now = new Date()
      setCurrentTime(now)
      
      const resetDate = new Date(rateLimitInfo.resetTime * 1000)
      if (now.getTime() >= resetDate.getTime()) {
        setRateLimitInfo(null)
        setError(null)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [rateLimitInfo])

  const onSubmit = async (data: ItineraryFormData) => {
    setIsLoading(true)
    setError(null)
    setItinerary(null)
    setRateLimitInfo(null)
    setProcessingStatus('Enviando solicitação...')

    try {
      const itineraryData: any = {
        destination: data.destination,
        start_date: data.startDate.toISOString().split('T')[0],
        end_date: data.endDate.toISOString().split('T')[0],
        interests: data.interests
      }
      
      if (data.budget && !isNaN(data.budget)) {
        itineraryData.budget = data.budget
      }
      
      const result = await apiClient.createItinerary(itineraryData)
      
      setItinerary(result)
      setProcessingStatus('Roteiro criado com sucesso!')
      
      if (result.status === 'pending' || result.status === 'processing') {
        pollItineraryStatus(result.id)
      }
      
      reset()
    } catch (err: any) {
      console.error('Error creating itinerary:', err)
      
      if (apiClient.isRateLimitError(err)) {
        setRateLimitInfo(err.rateLimitInfo)
        setError(err.message)
      } else if (err.response?.data?.error) {
        setError(err.response.data.error)
      } else {
        setError('Erro ao criar roteiro. Tente novamente.')
      }
      
      setProcessingStatus(null)
    } finally {
      setIsLoading(false)
    }
  }

  const pollItineraryStatus = async (id: string) => {
    const maxAttempts = 30
    let attempts = 0

    const poll = async () => {
      try {
        attempts++
        setProcessingStatus(`Gerando seu roteiro... (${attempts}/${maxAttempts})`)
        
        const status = await apiClient.getItineraryStatus(id)
        
        if (status.status === 'completed') {
          setItinerary(prev => prev ? { ...prev, status: 'completed', pdf_url: status.pdf_url } : null)
          setProcessingStatus('Roteiro concluído! Clique para baixar o PDF.')
          return
        } else if (status.status === 'failed') {
          setError(status.error_message || 'Falha na geração do roteiro')
          setProcessingStatus(null)
          return
        }
        
        if (attempts < maxAttempts) {
          setTimeout(poll, 10000)
        } else {
          setError('Timeout na geração do roteiro. Tente novamente.')
          setProcessingStatus(null)
        }
      } catch (err) {
        console.error('Error polling status:', err)
        setError('Erro ao verificar status do roteiro')
        setProcessingStatus(null)
      }
    }

    poll()
  }

  const handleDownload = async () => {
    if (!itinerary?.id) return

    try {
      const blob = await apiClient.downloadItinerary(itinerary.id)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `roteiro-${itinerary.destination}-${itinerary.id}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error downloading itinerary:', err)
      setError('Erro ao baixar o roteiro')
    }
  }

  const handleInterestChange = (interest: string, checked: boolean) => {
    const currentInterests = watchedInterests
    if (checked) {
      return [...currentInterests, interest]
    } else {
      return currentInterests.filter(i => i !== interest)
    }
  }

  const getResetTimeMessage = () => {
    if (!rateLimitInfo) return ''
    
    const resetDate = new Date(rateLimitInfo.resetTime * 1000)
    const diffMs = resetDate.getTime() - currentTime.getTime()
    
    console.log('getResetTimeMessage debug:', {
      resetTime: rateLimitInfo.resetTime,
      resetDate: resetDate.toISOString(),
      currentTime: currentTime.toISOString(),
      diffMs: diffMs,
      diffSeconds: Math.floor(diffMs / 1000)
    });
    
    if (diffMs <= 0) {
      return 'Limite pode ser usado novamente.'
    }
    
    const totalSeconds = Math.floor(diffMs / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    
    if (hours > 0) {
      if (minutes > 0) {
        return `Limite será resetado em ${hours}h ${minutes}min.`
      } else {
        return `Limite será resetado em ${hours}h.`
      }
    } else if (minutes > 0) {
      return `Limite será resetado em ${minutes}min ${seconds}s.`
    } else if (seconds > 0) {
      return `Limite será resetado em ${seconds}s.`
    } else {
      return 'Limite pode ser usado novamente.'
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="destination" className="text-brand-normal-text flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Destino
            </Label>
            <Input
              id="destination"
              placeholder="Ex: Rio de Janeiro, RJ"
              {...register('destination')}
            />
            {errors.destination && (
              <p className="text-sm text-destructive">{errors.destination.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="budget" className="text-brand-normal-text flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Orçamento (USD) - Opcional
            </Label>
            <Input
              id="budget"
              type="number"
              min="100"
              max="50000"
              placeholder="1000"
              {...register('budget', { valueAsNumber: true })}
            />
            {errors.budget && (
              <p className="text-sm text-destructive">{errors.budget.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-brand-normal-text flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Data de Início
            </Label>
            <Controller
              name="startDate"
              control={control}
              render={({ field }) => (
                <DatePicker
                  date={field.value}
                  onDateChange={field.onChange}
                  placeholder="DD/MM/AAAA"
                />
              )}
            />
            {errors.startDate && (
              <p className="text-sm text-destructive">{errors.startDate.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-brand-normal-text flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Data de Fim
            </Label>
            <Controller
              name="endDate"
              control={control}
              render={({ field }) => (
                <DatePicker
                  date={field.value}
                  onDateChange={field.onChange}
                  placeholder="DD/MM/AAAA"
                />
              )}
            />
            {errors.endDate && (
              <p className="text-sm text-destructive">{errors.endDate.message}</p>
            )}
          </div>
        </div>


        <div className="space-y-2">
          <Label className="text-brand-normal-text flex items-center gap-2">
            <Heart className="h-4 w-4" />
            Interesses (máximo 10)
          </Label>
          <div className="grid grid-cols-2 gap-2">
            {INTEREST_OPTIONS.map((interest) => (
              <div key={interest.value} className="flex items-center space-x-2">
                <Controller
                  name="interests"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      id={interest.value}
                      checked={field.value?.includes(interest.value) || false}
                      onCheckedChange={(checked) => {
                        const newInterests = handleInterestChange(interest.value, checked as boolean)
                        field.onChange(newInterests)
                      }}
                    />
                  )}
                />
                <Label 
                  htmlFor={interest.value}
                  className="text-sm text-brand-normal-text cursor-pointer"
                >
                  {interest.label}
                </Label>
              </div>
            ))}
          </div>
          {errors.interests && (
            <p className="text-sm text-destructive">{errors.interests.message}</p>
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
              Criando Roteiro...
            </>
          ) : (
            <>
              <MapPin className="mr-2 h-4 w-4" />
              Criar Roteiro
            </>
          )}
        </Button>
      </form>

      {processingStatus && (
        <Alert>
          <AlertDescription>
            {processingStatus}
          </AlertDescription>
        </Alert>
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

      {itinerary && (
        <div className="space-y-4 p-4 bg-brand-secondary-bg rounded-lg border border-brand-input-border">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-lg font-semibold text-brand-accent-text">
              Roteiro: {itinerary.destination}
            </h3>
          </div>
          
          <div className="text-sm text-brand-normal-text space-y-1">
            <p>Período: {new Date(itinerary.start_date).toLocaleDateString('pt-BR')} - {new Date(itinerary.end_date).toLocaleDateString('pt-BR')}</p>
            {itinerary.budget && <p>Orçamento: ${itinerary.budget}</p>}
            {itinerary.interests && itinerary.interests.length > 0 && (
              <p>Interesses: {itinerary.interests.join(', ')}</p>
            )}
          </div>

          {itinerary.status === 'completed' && itinerary.pdf_url && (
            <Button onClick={handleDownload} className="w-full mt-4">
              <Download className="mr-2 h-4 w-4" />
              Baixar Roteiro PDF
            </Button>
          )}
          
          <div className="text-xs text-brand-normal-text opacity-75">
            {new Date(itinerary.created_at).toLocaleString('pt-BR')}
          </div>
        </div>
      )}
    </div>
  )
}
