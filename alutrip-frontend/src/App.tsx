import { useState, useEffect } from 'react'
import { TravelQuestionForm } from './components/forms/TravelQuestionForm'
import { ItineraryForm } from './components/forms/ItineraryForm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from './components/ui/tabs'
import { MessageCircle, MapPin } from 'lucide-react'

function App() {
  const [activeTab, setActiveTab] = useState('responde')

  useEffect(() => {
    const savedTab = localStorage.getItem('alutrip-active-tab')
    if (savedTab && (savedTab === 'responde' || savedTab === 'planeja')) {
      setActiveTab(savedTab)
    }
  }, [])

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    localStorage.setItem('alutrip-active-tab', value)
  }

  return (
    <div className="min-h-screen bg-brand-primary-bg text-brand-normal-text">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <h1 className="font-heading text-4xl md:text-6xl font-bold text-brand-accent-text mb-4">
            AluTrip
          </h1>
          <p className="font-body text-lg md:text-xl text-brand-normal-text max-w-2xl mx-auto">
            Seu assistente de viagem inteligente. Planeje suas viagens sem burocracia, 
            login ou barreiras.
          </p>
        </header>

        <div className="max-w-4xl mx-auto">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="responde" className="flex items-center gap-2 text-sm md:text-base">
                <MessageCircle className="h-4 w-4" />
                <span className="hidden sm:inline">AluTrip</span> Responde
              </TabsTrigger>
              <TabsTrigger value="planeja" className="flex items-center gap-2 text-sm md:text-base">
                <MapPin className="h-4 w-4" />
                <span className="hidden sm:inline">AluTrip</span> Planeja
              </TabsTrigger>
            </TabsList>

            <TabsContent value="responde">
              <Card className="bg-brand-secondary-bg border-brand-input-border">
                <CardHeader>
                  <CardTitle className="text-brand-accent-text flex items-center gap-2">
                    <MessageCircle className="h-5 w-5" />
                    AluTrip Responde
                  </CardTitle>
                  <CardDescription className="text-brand-normal-text">
                    Faça perguntas sobre viagens e receba respostas inteligentes de IA
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <TravelQuestionForm />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="planeja">
              <Card className="bg-brand-secondary-bg border-brand-input-border">
                <CardHeader>
                  <CardTitle className="text-brand-accent-text flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    AluTrip Planeja
                  </CardTitle>
                  <CardDescription className="text-brand-normal-text">
                    Crie roteiros personalizados para suas viagens com base nas suas preferências
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ItineraryForm />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <footer className="text-center mt-16 text-brand-normal-text opacity-75">
          <p className="font-body">
            Open Source Travel Assistant
          </p>
        </footer>
      </div>
    </div>
  )
}

export default App
