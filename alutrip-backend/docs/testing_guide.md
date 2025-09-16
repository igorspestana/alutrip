# 🧪 AluTrip Backend - Testing Guide

Este guia fornece formas abrangentes de testar todas as implementações da **Phase 1: Foundation** do AluTrip Backend.

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

**Nota:** Para testar rate limiting, você precisará implementar um endpoint temporário ou aguardar a Phase 2.

```bash
# Exemplo de teste quando endpoints estiverem disponíveis:
# Fazer 6 requisições rapidamente para exceder o limite de 5
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/travel/ask \
    -H "Content-Type: application/json" \
    -d '{"question": "Test question", "model": "groq"}' \
    -w "\nStatus: %{http_code}\n"
done
```

### 2. Teste de Status de Rate Limit

```bash
# Quando implementado na Phase 2
curl -X GET http://localhost:3000/api/limits/status
```

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
# Teste com dados inválidos (quando endpoints estiverem disponíveis)
curl -X POST http://localhost:3000/api/travel/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "", "model": "invalid"}'
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

### ⏳ Pendentes (Phase 2+)
- [ ] Endpoints de API funcionais
- [ ] Rate limiting em produção
- [ ] Integração com AI providers
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

---

## 🎯 Próximos Testes (Phase 2)

Quando a Phase 2 for implementada, adicione:

1. **Testes de AI Integration:**
   - Conectividade com Groq API
   - Conectividade com Gemini API
   - Fallback entre providers

2. **Testes de Endpoints:**
   - `POST /api/travel/ask`
   - `GET /api/travel/questions`
   - Rate limiting em ação

3. **Testes de Prompt Engineering:**
   - Qualidade das respostas
   - Consistência de formato
   - Handling de erros de AI

---

*Este guia será atualizado conforme novas funcionalidades forem implementadas nas próximas fases do projeto.*
