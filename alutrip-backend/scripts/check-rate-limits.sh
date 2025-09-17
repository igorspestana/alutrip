#!/bin/bash

# AluTrip - Rate Limit Status Checker
# Script para verificar o estado atual dos rate limits
# Uso: ./scripts/check-rate-limits.sh

echo "📊 ALUTRIP - STATUS DOS RATE LIMITS"
echo "=================================="
echo ""

# Check if Redis container is running
if ! docker exec alutrip-redis redis-cli ping >/dev/null 2>&1; then
    echo "❌ Container Redis 'alutrip-redis' não está rodando"
    echo "💡 Execute: docker-compose up -d redis"
    exit 1
fi

echo "🔍 Verificando status dos rate limits..."
echo ""

# Get all rate limit keys
TRAVEL_KEYS=$(docker exec alutrip-redis redis-cli keys "rate_limit:travel_questions*")
ITINERARY_KEYS=$(docker exec alutrip-redis redis-cli keys "rate_limit:itineraries*")

TRAVEL_COUNT=$(echo "$TRAVEL_KEYS" | grep -v "^$" | wc -l)
ITINERARY_COUNT=$(echo "$ITINERARY_KEYS" | grep -v "^$" | wc -l)
TOTAL_COUNT=$((TRAVEL_COUNT + ITINERARY_COUNT))

# Display summary
echo "📈 RESUMO GERAL:"
echo "   Total de rate limits ativos: $TOTAL_COUNT"
echo "   🧳 Travel Q&A: $TRAVEL_COUNT"
echo "   📋 Itinerários: $ITINERARY_COUNT"
echo ""

if [ "$TOTAL_COUNT" -eq 0 ]; then
    echo "✅ SISTEMA LIVRE!"
    echo "🚀 Você pode fazer quantos requests quiser:"
    echo "   • Travel Q&A: SEM LIMITE"
    echo "   • Itinerários: SEM LIMITE"
    echo ""
    echo "💡 Para manter sempre livre, use: ./scripts/clear-rate-limits.sh"
    exit 0
fi

# Show detailed information for each rate limit
echo "📋 DETALHES DOS RATE LIMITS:"
echo ""

# Travel Q&A rate limits
if [ "$TRAVEL_COUNT" -gt 0 ]; then
    echo "🧳 TRAVEL Q&A:"
    echo "$TRAVEL_KEYS" | while read -r key; do
        if [ ! -z "$key" ]; then
            VALUE=$(docker exec alutrip-redis redis-cli get "$key" 2>/dev/null)
            TTL=$(docker exec alutrip-redis redis-cli ttl "$key" 2>/dev/null)
            
            echo "   📍 Chave: $key"
            echo "   🔢 Valor: $VALUE"
            
            if [ "$TTL" -eq -1 ]; then
                echo "   ⏰ TTL: Sem expiração"
            elif [ "$TTL" -eq -2 ]; then
                echo "   ⏰ TTL: Chave não existe"
            else
                HOURS=$((TTL / 3600))
                MINUTES=$(((TTL % 3600) / 60))
                SECONDS=$((TTL % 60))
                echo "   ⏰ TTL: ${HOURS}h ${MINUTES}m ${SECONDS}s"
            fi
            echo ""
        fi
    done
fi

# Itinerary rate limits
if [ "$ITINERARY_COUNT" -gt 0 ]; then
    echo "📋 ITINERÁRIOS:"
    echo "$ITINERARY_KEYS" | while read -r key; do
        if [ ! -z "$key" ]; then
            VALUE=$(docker exec alutrip-redis redis-cli get "$key" 2>/dev/null)
            TTL=$(docker exec alutrip-redis redis-cli ttl "$key" 2>/dev/null)
            
            echo "   📍 Chave: $key"
            echo "   🔢 Valor: $VALUE"
            
            if [ "$TTL" -eq -1 ]; then
                echo "   ⏰ TTL: Sem expiração"
            elif [ "$TTL" -eq -2 ]; then
                echo "   ⏰ TTL: Chave não existe"
            else
                HOURS=$((TTL / 3600))
                MINUTES=$(((TTL % 3600) / 60))
                SECONDS=$((TTL % 60))
                echo "   ⏰ TTL: ${HOURS}h ${MINUTES}m ${SECONDS}s"
            fi
            echo ""
        fi
    done
fi

# Show impact
echo "⚠️  IMPACTO NO SISTEMA:"
if [ "$TRAVEL_COUNT" -gt 0 ]; then
    echo "   🧳 Travel Q&A: LIMITADO (5 requests/24h)"
fi
if [ "$ITINERARY_COUNT" -gt 0 ]; then
    echo "   📋 Itinerários: LIMITADO (5 requests/24h)"
fi

echo ""
echo "🔧 AÇÕES DISPONÍVEIS:"
echo "   • Limpar rate limits: ./scripts/clear-rate-limits.sh"
echo "   • Verificar novamente: ./scripts/check-rate-limits.sh"
echo "   • Ver todas as chaves: docker exec alutrip-redis redis-cli keys 'rate_limit:*'"
echo ""

# Show current time for reference
echo "🕐 Verificação realizada em: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""
