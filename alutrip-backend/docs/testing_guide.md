# 🧪 AluTrip Backend - Testing Guide

Este guia fornece formas abrangentes de testar todas as implementações da **Phase 1: Foundation** e **Phase 2: Travel Q&A (AluTrip Responde)** do AluTrip Backend.

## 📋 Índice de Testes

- [🚀 Testes de Inicialização](#-testes-de-inicialização)
- [🏥 Testes de Health Check](#-testes-de-health-check)
- [🗄️ Testes de Banco de Dados](#️-testes-de-banco-de-dados)
- [📊 Testes de Redis](#-testes-de-redis)
- [🔒 Testes de Rate Limiting](#-testes-de-rate-limiting)
- [🛡️ Testes de Segurança](#️-testes-de-segurança)
- [📝 Testes de Logging](#-testes-de-logging)
- [🐳 Testes com Docker](#-testes-com-docker)
- [⚙️ Testes de Configuração](#️-testes-de-configuração)
- [🔧 Testes de Build e Deploy](#-testes-de-build-e-deploy)
- [🤖 Testes da Fase 2: Travel Q&A](#-testes-da-fase-2-travel-qa-alutrip-responde)
- [🧪 Testes Automatizados (Futuros)](#-testes-automatizados-futuros)
- [🚀 Script de Teste Automatizado da Fase 2](#-script-de-teste-automatizado-da-fase-2)

---

## 🚀 Testes de Inicialização

### 1. Teste Básico de Startup

```bash
# Sem Docker (apenas validação de código)
cd alutrip-backend
npm install
npm run build
npm start
```

**Resultado Esperado:**
- ✅ Aplicação compila sem erros
- ✅ Servidor inicia e exibe banner do AluTrip
- ❌ Erro de conexão com PostgreSQL/Redis (esperado sem Docker)

### 2. Teste de Development Mode

```bash
# Modo desenvolvimento (com hot reload)
npm run dev
```

**Resultado Esperado:**
- ✅ TypeScript compila em tempo real
- ✅ Restart automático em mudanças de código

---

## 🏥 Testes de Health Check

### 1. Health Check Básico

```bash
# Com servidor rodando
curl -X GET http://localhost:3000/health
```

**Resultado Esperado sem DB/Redis:**
```json
{
  "status": "error",
  "message": "API health check failed",
  "data": {
    "timestamp": "2024-01-15T10:30:00Z",
    "version": "1.0.0",
    "environment": "development",
    "uptime": 3600,
    "database": false,
    "redis": false,
    "services": {
      "groq": false,
      "gemini": false
    }
  }
}
```

### 2. Health Check Detalhado

```bash
curl -X GET http://localhost:3000/health/detailed
```

**Resultado Esperado:**
```json
{
  "status": "error",
  "message": "Some dependencies are unhealthy",
  "data": {
    "timestamp": "2024-01-15T10:30:00Z",
    "version": "1.0.0",
    "environment": "development",
    "uptime": 3600,
    "memory": {
      "rss": 45,
      "heapTotal": 25,
      "heapUsed": 15,
      "external": 2
    },
    "dependencies": {
      "database": {
        "healthy": false,
        "type": "PostgreSQL"
      },
      "redis": {
        "healthy": false,
        "type": "Redis"
      }
    }
  }
}
```

### 3. Probes Kubernetes

```bash
# Readiness probe
curl -X GET http://localhost:3000/health/ready

# Liveness probe
curl -X GET http://localhost:3000/health/live
```

---

## 🗄️ Testes de Banco de Dados

### 1. Teste com Docker

```bash
# Iniciar apenas PostgreSQL
cd docker
docker-compose up -d postgres

# Testar conexão
curl -X GET http://localhost:3000/health
```

**Resultado Esperado:**
- ✅ Database: true
- ❌ Redis: false

### 2. Teste de Migrações

```bash
# Com PostgreSQL rodando
npm run migrate up

# Verificar status
npm run migrate status
```

**Resultado Esperado:**
```
Migration Status:
  001_create_travel_questions.sql: EXECUTED
  002_create_itineraries.sql: EXECUTED
  003_create_rate_limits.sql: EXECUTED
  004_create_conversations.sql: EXECUTED
Total migrations: 4, Executed: 4, Pending: 0
```

### 3. Teste de Modelos

```bash
# Conectar ao PostgreSQL
docker exec -it alutrip-postgres psql -U alutrip_user -d alutrip_backend

# Verificar tabelas criadas
\dt

# Verificar estrutura das tabelas
\d travel_questions
\d itineraries
\d rate_limits
\d conversations
\d messages
```

---

## 📊 Testes de Redis

### 1. Teste de Conexão Redis

```bash
# Iniciar Redis
cd docker
docker-compose up -d redis

# Testar health check
curl -X GET http://localhost:3000/health
```

**Resultado Esperado:**
- ❌ Database: false
- ✅ Redis: true

### 2. Teste de Funcionalidades Redis

```bash
# Conectar ao Redis
docker exec -it alutrip-redis redis-cli

# Testar comandos básicos
ping
info memory
keys *
```

---

## 🔒 Testes de Rate Limiting

### 1. Teste Manual de Rate Limiting

```bash
# Fazer 6 requisições rapidamente para exceder o limite de 5
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/travel/ask \
    -H "Content-Type: application/json" \
    -d '{"question": "What is the best time to visit Japan?", "model": "groq"}' \
    -w "\nStatus: %{http_code}\n"
done
```

**Resultado Esperado:**
- ✅ Primeiras 5 requisições: Status 200
- ❌ 6ª requisição: Status 429 (Rate limit exceeded)

### 2. Teste de Headers de Rate Limit

```bash
# Verificar headers de rate limiting
curl -X POST http://localhost:3000/api/travel/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "What are the must-see attractions in Paris?", "model": "groq"}' \
  -I
```

**Headers Esperados:**
```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 4
X-RateLimit-Reset: 2024-01-16T10:30:00Z
```

### 3. Teste de Rate Limit por IP

```bash
# Simular diferentes IPs (usando X-Forwarded-For)
curl -X POST http://localhost:3000/api/travel/ask \
  -H "Content-Type: application/json" \
  -H "X-Forwarded-For: 192.168.1.100" \
  -d '{"question": "Test question 1", "model": "groq"}'

curl -X POST http://localhost:3000/api/travel/ask \
  -H "Content-Type: application/json" \
  -H "X-Forwarded-For: 192.168.1.101" \
  -d '{"question": "Test question 2", "model": "groq"}'
```

**Resultado Esperado:**
- ✅ Ambos IPs podem fazer 5 requisições cada
- ❌ Rate limiting é independente por IP

---

## 🛡️ Testes de Segurança

### 1. Teste de Headers de Segurança

```bash
# Verificar headers de segurança
curl -I http://localhost:3000/health
```

**Headers Esperados:**
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 0
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

### 2. Teste de CORS

```bash
# Teste de CORS com Origin permitida
curl -X GET http://localhost:3000/health \
  -H "Origin: http://localhost:5173"

# Teste com Origin não permitida
curl -X GET http://localhost:3000/health \
  -H "Origin: http://malicious-site.com"
```

### 3. Teste de Validação de Input

```bash
# Teste com dados inválidos
curl -X POST http://localhost:3000/api/travel/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "", "model": "invalid"}'
```

**Resultado Esperado:**
```json
{
  "status": "error",
  "message": "Invalid request data",
  "data": {
    "type": "VALIDATION_ERROR",
    "errors": [
      {
        "field": "question",
        "message": "String must contain at least 10 character(s)"
      },
      {
        "field": "model",
        "message": "Invalid enum value. Expected 'groq' | 'gemini', received 'invalid'"
      }
    ]
  }
}
```

### 4. Teste de Validação de Modelo

```bash
# Teste com modelo não disponível
curl -X POST http://localhost:3000/api/travel/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "What is the best time to visit Japan?", "model": "groq"}'
```

**Resultado Esperado (se API key não configurada):**
```json
{
  "status": "error",
  "message": "Model 'groq' is not available. Please check API configuration.",
  "data": {
    "type": "AI_SERVICE_ERROR"
  }
}
```

---

## 📝 Testes de Logging

### 1. Verificar Logs Estruturados

```bash
# Verificar arquivos de log
ls -la logs/

# Ver logs de erro
tail -f logs/error.log

# Ver todos os logs
tail -f logs/combined.log

# Ver logs específicos de AI (quando implementado)
tail -f logs/ai-operations.log
```

### 2. Teste de Níveis de Log

```bash
# Alterar nível de log no .env
echo "LOG_LEVEL=debug" >> .env

# Reiniciar e verificar logs mais detalhados
npm start
```

---

## 🐳 Testes com Docker

### 1. Teste Completo com Docker Compose

```bash
# Iniciar todos os serviços
cd docker
docker-compose up -d

# Verificar serviços
docker-compose ps

# Testar health check completo
curl -X GET http://localhost:3000/health
```

**Resultado Esperado:**
```json
{
  "status": "success",
  "message": "API is healthy",
  "data": {
    "database": true,
    "redis": true,
    "services": {
      "groq": false,
      "gemini": false
    }
  }
}
```

### 2. Teste de Desenvolvimento com Docker

```bash
# Usar perfil de desenvolvimento
docker-compose --profile dev up -d alutrip-backend-dev

# Verificar logs
docker-compose logs -f alutrip-backend-dev
```

### 3. Teste de Build de Produção

```bash
# Build da imagem de produção
docker build -t alutrip-backend .

# Executar container
docker run -p 3000:3000 --name alutrip-test alutrip-backend
```

---

## ⚙️ Testes de Configuração

### 1. Teste de Variáveis de Ambiente

```bash
# Teste com configurações inválidas
echo "PORT=invalid" > .env.test
NODE_ENV=test npm start
```

**Resultado Esperado:**
- ❌ Erro de validação Zod
- ❌ Aplicação não inicia

### 2. Teste de Diferentes Ambientes

```bash
# Teste ambiente de produção
NODE_ENV=production npm start

# Teste ambiente de desenvolvimento
NODE_ENV=development npm start
```

### 3. Teste de APIs Keys

```bash
# Com chaves válidas (substitua pelas suas)
export GROQ_API_KEY="sua-chave-groq"
export GEMINI_API_KEY="sua-chave-gemini"
npm start

# Verificar health check
curl http://localhost:3000/health/detailed
```

---

## 🔧 Testes de Build e Deploy

### 1. Teste de Build TypeScript

```bash
# Build limpa
rm -rf dist/
npm run build

# Verificar arquivos gerados
ls -la dist/
```

### 2. Teste de Linting

```bash
# Verificar código
npm run lint

# Corrigir automaticamente
npm run lint:fix

# Formatar código
npm run format
```

### 3. Teste de Dependências

```bash
# Verificar vulnerabilidades
npm audit

# Verificar dependências desatualizadas
npm outdated

# Verificar tipos TypeScript
npx tsc --noEmit
```

---

## 🤖 Testes da Fase 2: Travel Q&A (AluTrip Responde)

### 1. Testes de Endpoints de Travel Q&A

#### 1.1. Submit Travel Question

```bash
# Teste básico com Groq
curl -X POST http://localhost:3000/api/travel/ask \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is the best time to visit Japan for cherry blossoms?",
    "model": "groq"
  }'
```

**Resultado Esperado:**
```json
{
  "status": "success",
  "message": "Travel question answered successfully",
  "data": {
    "id": 1,
    "question": "What is the best time to visit Japan for cherry blossoms?",
    "response": "The best time to visit Japan for cherry blossoms is typically from late March to early May...",
    "model_used": "groq",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

#### 1.2. Teste com Gemini

```bash
# Teste com Gemini
curl -X POST http://localhost:3000/api/travel/ask \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What are the must-see attractions in Paris?",
    "model": "gemini"
  }'
```

#### 1.3. Teste com Session ID

```bash
# Teste com session ID para futuro suporte a chat
curl -X POST http://localhost:3000/api/travel/ask \
  -H "Content-Type: application/json" \
  -H "X-Session-ID: session-123" \
  -d '{
    "question": "What is the best way to get around Tokyo?",
    "model": "groq"
  }'
```

### 2. Testes de Recuperação de Dados

#### 2.1. Get Specific Question

```bash
# Recuperar pergunta específica por ID
curl -X GET http://localhost:3000/api/travel/questions/1
```

**Resultado Esperado:**
```json
{
  "status": "success",
  "message": "Travel question retrieved successfully",
  "data": {
    "id": 1,
    "question": "What is the best time to visit Japan for cherry blossoms?",
    "response": "The best time to visit Japan for cherry blossoms is typically from late March to early May...",
    "model_used": "groq",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

#### 2.2. Get Recent Questions

```bash
# Recuperar perguntas recentes com paginação
curl -X GET "http://localhost:3000/api/travel/questions?limit=5&offset=0"
```

**Resultado Esperado:**
```json
{
  "status": "success",
  "message": "Recent travel questions retrieved successfully",
  "data": {
    "questions": [
      {
        "id": 1,
        "question": "What is the best time to visit Japan for cherry blossoms?",
        "response": "The best time to visit Japan for cherry blossoms is typically from late March to early May...",
        "model_used": "groq",
        "created_at": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "total": 1,
      "limit": 5,
      "offset": 0,
      "hasMore": false
    }
  }
}
```

#### 2.3. Get Client History

```bash
# Recuperar histórico do cliente (baseado no IP)
curl -X GET "http://localhost:3000/api/travel/history?limit=10&offset=0"
```

### 3. Testes de Health Check de AI Models

#### 3.1. Check AI Models Health

```bash
# Verificar saúde dos modelos AI
curl -X GET http://localhost:3000/api/travel/models/health
```

**Resultado Esperado (com APIs configuradas):**
```json
{
  "status": "success",
  "message": "AI models health check completed - healthy",
  "data": {
    "groq": {
      "status": "healthy",
      "model": "llama-3.1-70b-versatile",
      "available": true
    },
    "gemini": {
      "status": "healthy",
      "model": "gemini-1.5-pro",
      "available": true
    },
    "overall": "healthy"
  }
}
```

**Resultado Esperado (sem APIs configuradas):**
```json
{
  "status": "error",
  "message": "AI models health check completed - unhealthy",
  "data": {
    "groq": {
      "status": "unhealthy",
      "error": "API key not configured",
      "model": "llama-3.1-70b-versatile",
      "available": false
    },
    "gemini": {
      "status": "unhealthy",
      "error": "API key not configured",
      "model": "gemini-1.5-pro",
      "available": false
    },
    "overall": "unhealthy"
  }
}
```

### 4. Testes de Estatísticas

#### 4.1. Get Travel Statistics

```bash
# Recuperar estatísticas de perguntas
curl -X GET http://localhost:3000/api/travel/stats
```

**Resultado Esperado:**
```json
{
  "status": "success",
  "message": "Travel questions statistics retrieved successfully",
  "data": {
    "total": 15,
    "today": 3,
    "byModel": {
      "groq": 10,
      "gemini": 5
    },
    "avgResponseLength": 450
  }
}
```

### 5. Testes de Integração com AI

#### 5.1. Teste de Conectividade Groq

```bash
# Teste com API key válida do Groq
export GROQ_API_KEY="sua-chave-groq-aqui"
curl -X POST http://localhost:3000/api/travel/ask \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What are the best budget accommodations in Thailand?",
    "model": "groq"
  }'
```

#### 5.2. Teste de Conectividade Gemini

```bash
# Teste com API key válida do Gemini
export GEMINI_API_KEY="sua-chave-gemini-aqui"
curl -X POST http://localhost:3000/api/travel/ask \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What are the best budget accommodations in Thailand?",
    "model": "gemini"
  }'
```

#### 5.3. Teste de Fallback entre Models

```bash
# Teste quando um modelo não está disponível
# (Configure apenas uma API key e teste com a outra)
curl -X POST http://localhost:3000/api/travel/ask \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is the best time to visit Iceland?",
    "model": "groq"
  }'
```

### 6. Testes de Performance

#### 6.1. Teste de Tempo de Resposta

```bash
# Medir tempo de processamento
time curl -X POST http://localhost:3000/api/travel/ask \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What are the top 10 things to do in New York City?",
    "model": "groq"
  }'
```

**Resultado Esperado:**
- ✅ Tempo de resposta < 10 segundos
- ✅ Header `X-Processing-Time` presente

#### 6.2. Teste de Concorrência

```bash
# Teste com múltiplas requisições simultâneas
for i in {1..3}; do
  curl -X POST http://localhost:3000/api/travel/ask \
    -H "Content-Type: application/json" \
    -d "{\"question\": \"Test question $i\", \"model\": \"groq\"}" &
done
wait
```

### 7. Testes de Error Handling

#### 7.1. Teste de AI Service Error

```bash
# Simular erro de AI service (API key inválida)
curl -X POST http://localhost:3000/api/travel/ask \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is the best time to visit Japan?",
    "model": "groq"
  }'
```

**Resultado Esperado:**
```json
{
  "status": "error",
  "message": "AI service is temporarily unavailable. Please try again later.",
  "data": {
    "type": "AI_SERVICE_ERROR"
  }
}
```

#### 7.2. Teste de Question Not Found

```bash
# Tentar recuperar pergunta inexistente
curl -X GET http://localhost:3000/api/travel/questions/99999
```

**Resultado Esperado:**
```json
{
  "status": "error",
  "message": "Travel question not found",
  "data": {
    "type": "NOT_FOUND_ERROR"
  }
}
```

### 8. Testes de Validação de Schema

#### 8.1. Teste de Question Muito Curta

```bash
curl -X POST http://localhost:3000/api/travel/ask \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Hi",
    "model": "groq"
  }'
```

#### 8.2. Teste de Question Muito Longa

```bash
curl -X POST http://localhost:3000/api/travel/ask \
  -H "Content-Type: application/json" \
  -d "{
    \"question\": \"$(printf 'A' 1001)\",
    \"model\": \"groq\"
  }"
```

#### 8.3. Teste de Parâmetros de Paginação Inválidos

```bash
# Teste com limit inválido
curl -X GET "http://localhost:3000/api/travel/questions?limit=100&offset=0"

# Teste com offset negativo
curl -X GET "http://localhost:3000/api/travel/questions?limit=10&offset=-1"
```

---

## 🧪 Testes Automatizados (Futuros)

### 1. Setup de Testes Unitários

```bash
# Quando implementados na Phase 7
npm test

# Com coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### 2. Exemplo de Teste Unitário

```typescript
// tests/unit/health.controller.test.ts
import { healthController } from '@/controllers/health.controller';

describe('Health Controller', () => {
  it('should return health status', async () => {
    // Implementar quando estiver na Phase 7
  });
});
```

---

## 📊 Checklist de Testes da Phase 1

### ✅ Funcionalidades Básicas
- [x] Servidor inicia sem erros
- [x] TypeScript compila corretamente
- [x] Headers de segurança configurados
- [x] CORS funcionando
- [x] Error handling funcionando

### ✅ Health Checks
- [x] `/health` - Status básico
- [x] `/health/detailed` - Informações detalhadas
- [x] `/health/ready` - Readiness probe
- [x] `/health/live` - Liveness probe

### ✅ Infraestrutura
- [x] PostgreSQL conecta corretamente
- [x] Redis conecta corretamente
- [x] Migrações executam sem erro
- [x] Rate limiting configurado
- [x] Logging estruturado funcionando

### ✅ Docker
- [x] Build de imagem funciona
- [x] Docker Compose inicia todos serviços
- [x] Volumes persistem dados
- [x] Network permite comunicação entre serviços

### ✅ Fase 2: Travel Q&A (AluTrip Responde)
- [x] Endpoints de Travel Q&A funcionais
- [x] Rate limiting em produção (5 requests/24h)
- [x] Integração com Groq (Llama model)
- [x] Integração com Gemini
- [x] Health checks para AI models
- [x] Validação de input com Zod
- [x] Error handling robusto
- [x] Logging estruturado para AI operations
- [x] Paginação em endpoints de listagem
- [x] Estatísticas de uso
- [x] Histórico por IP do cliente

### ⏳ Pendentes (Phase 3+)
- [ ] Endpoints de Itinerary Planning
- [ ] Geração de PDFs
- [ ] Sistema de filas (Bull/BullMQ)
- [ ] Testes automatizados

---

## 🚨 Troubleshooting Comum

### Erro: "Cannot find module '@/...'"
**Solução:** Verificar se `module-alias` está registrado e `_moduleAliases` no package.json

### Erro: "ECONNREFUSED" para PostgreSQL
**Solução:** Iniciar PostgreSQL com Docker: `docker-compose up -d postgres`

### Erro: "Redis connection failed"
**Solução:** Iniciar Redis com Docker: `docker-compose up -d redis`

### Erro de Permissão em Docker
**Solução:** Adicionar usuário ao grupo docker: `sudo usermod -aG docker $USER`

### Erro: "Model 'groq' is not available"
**Solução:** Verificar se `GROQ_API_KEY` está configurada no `.env` com uma chave válida

### Erro: "Model 'gemini' is not available"
**Solução:** Verificar se `GEMINI_API_KEY` está configurada no `.env` com uma chave válida

### Erro: "Rate limit exceeded"
**Solução:** Aguardar 24 horas ou usar um IP diferente para testes

### Erro: "AI service is temporarily unavailable"
**Solução:** Verificar conectividade com internet e validade das API keys

### Erro: "Travel question not found"
**Solução:** Verificar se o ID da pergunta existe no banco de dados

---

## 🎯 Próximos Testes (Phase 3)

Quando a Phase 3 for implementada, adicione:

1. **Testes de Itinerary Planning:**
   - `POST /api/itinerary/create`
   - `GET /api/itinerary/:id/status`
   - Geração de itinerários com AI

2. **Testes de PDF Generation:**
   - Geração de PDFs de itinerários
   - Download de PDFs
   - Templates de layout

3. **Testes de Sistema de Filas:**
   - Processamento assíncrono
   - Status de jobs
   - Retry logic

4. **Testes de Performance:**
   - Processamento de itinerários complexos
   - Geração de PDFs em lote
   - Otimização de memória

---

## 🚀 Script de Teste Automatizado da Fase 2

### Script de Teste Completo

Crie um arquivo `test-phase2.sh` para automatizar os testes da Fase 2:

```bash
#!/bin/bash

# AluTrip Backend - Phase 2 Testing Script
# Testa todos os endpoints de Travel Q&A

BASE_URL="http://localhost:3000"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🧪 AluTrip Backend - Phase 2 Testing${NC}"
echo "=================================="

# Função para testar endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local expected_status=$4
    local description=$5
    
    echo -e "\n${YELLOW}Testing: $description${NC}"
    echo "Endpoint: $method $endpoint"
    
    if [ -n "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X $method \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$BASE_URL$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X $method \
            "$BASE_URL$endpoint")
    fi
    
    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n -1)
    
    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}✅ PASS${NC} - Status: $status_code"
    else
        echo -e "${RED}❌ FAIL${NC} - Expected: $expected_status, Got: $status_code"
        echo "Response: $body"
    fi
}

# 1. Health Check
test_endpoint "GET" "/health" "" "200" "Basic Health Check"

# 2. AI Models Health Check
test_endpoint "GET" "/api/travel/models/health" "" "200" "AI Models Health Check"

# 3. Travel Statistics
test_endpoint "GET" "/api/travel/stats" "" "200" "Travel Statistics"

# 4. Recent Questions
test_endpoint "GET" "/api/travel/questions?limit=5&offset=0" "" "200" "Recent Questions"

# 5. Client History
test_endpoint "GET" "/api/travel/history?limit=5&offset=0" "" "200" "Client History"

# 6. Submit Travel Question (Groq)
test_endpoint "POST" "/api/travel/ask" \
    '{"question": "What is the best time to visit Japan for cherry blossoms?", "model": "groq"}' \
    "200" "Submit Travel Question (Groq)"

# 7. Submit Travel Question (Gemini)
test_endpoint "POST" "/api/travel/ask" \
    '{"question": "What are the must-see attractions in Paris?", "model": "gemini"}' \
    "200" "Submit Travel Question (Gemini)"

# 8. Invalid Question (too short)
test_endpoint "POST" "/api/travel/ask" \
    '{"question": "Hi", "model": "groq"}' \
    "400" "Invalid Question (too short)"

# 9. Invalid Model
test_endpoint "POST" "/api/travel/ask" \
    '{"question": "What is the best time to visit Japan?", "model": "invalid"}' \
    "400" "Invalid Model"

# 10. Get Specific Question (if exists)
test_endpoint "GET" "/api/travel/questions/1" "" "200" "Get Specific Question"

# 11. Question Not Found
test_endpoint "GET" "/api/travel/questions/99999" "" "404" "Question Not Found"

echo -e "\n${YELLOW}🎯 Phase 2 Testing Complete!${NC}"
echo "=================================="
```

### Como Usar o Script

```bash
# Tornar o script executável
chmod +x test-phase2.sh

# Executar todos os testes da Fase 2
./test-phase2.sh

# Ou executar diretamente
bash test-phase2.sh
```

### Script de Teste de Rate Limiting

Crie um arquivo `test-rate-limit.sh` para testar rate limiting:

```bash
#!/bin/bash

# Teste de Rate Limiting para Travel Q&A
BASE_URL="http://localhost:3000"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🔒 Testing Rate Limiting (5 requests per 24h)${NC}"
echo "=============================================="

# Fazer 6 requisições para testar rate limiting
for i in {1..6}; do
    echo -e "\n${YELLOW}Request $i/6${NC}"
    
    response=$(curl -s -w "\n%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -d "{\"question\": \"Test question $i\", \"model\": \"groq\"}" \
        "$BASE_URL/api/travel/ask")
    
    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n -1)
    
    if [ "$status_code" = "200" ]; then
        echo -e "${GREEN}✅ Request $i: SUCCESS (200)${NC}"
    elif [ "$status_code" = "429" ]; then
        echo -e "${RED}🚫 Request $i: RATE LIMITED (429)${NC}"
        echo "Rate limit exceeded as expected!"
        break
    else
        echo -e "${RED}❌ Request $i: UNEXPECTED STATUS ($status_code)${NC}"
        echo "Response: $body"
    fi
    
    # Pequena pausa entre requisições
    sleep 1
done

echo -e "\n${YELLOW}🎯 Rate Limiting Test Complete!${NC}"
```

---

*Este guia será atualizado conforme novas funcionalidades forem implementadas nas próximas fases do projeto.*
