#!/bin/bash

# AluTrip - Rate Limit Cleaner
# Script para limpar rate limits e permitir testes ilimitados
# Uso: ./scripts/clear-rate-limits.sh

echo "🗑️  ALUTRIP - LIMPEZA DE RATE LIMITS"
echo "===================================="
echo ""

# Check if Redis container is running
if ! docker exec alutrip-redis redis-cli ping >/dev/null 2>&1; then
    echo "❌ Container Redis 'alutrip-redis' não está rodando"
    echo "💡 Execute: docker-compose up -d redis"
    exit 1
fi

echo "🔍 Verificando rate limits atuais..."

# Count current rate limit keys
TRAVEL_KEYS=$(docker exec alutrip-redis redis-cli keys "rate_limit:travel_questions*" | wc -l)
ITINERARY_KEYS=$(docker exec alutrip-redis redis-cli keys "rate_limit:itineraries*" | wc -l)
TOTAL_KEYS=$((TRAVEL_KEYS + ITINERARY_KEYS))

echo "📊 Rate limits encontrados: $TOTAL_KEYS"
echo "   🧳 Travel Q&A: $TRAVEL_KEYS"
echo "   📋 Itinerários: $ITINERARY_KEYS"
echo ""

if [ "$TOTAL_KEYS" -eq 0 ]; then
    echo "✅ Sistema já está livre para testes!"
    echo "🚀 Você pode criar quantos itinerários quiser!"
    exit 0
fi

echo "🗑️  Removendo rate limits..."

# Force delete all rate limit keys (método mais confiável)
DELETED_COUNT=0

# Delete specific known keys first
docker exec alutrip-redis redis-cli del rate_limit:travel_questions:::1 >/dev/null 2>&1 && DELETED_COUNT=$((DELETED_COUNT + 1))
docker exec alutrip-redis redis-cli del rate_limit:itineraries:::1 >/dev/null 2>&1 && DELETED_COUNT=$((DELETED_COUNT + 1))

# Delete any remaining rate limit keys
for key in $(docker exec alutrip-redis redis-cli keys "rate_limit:*"); do
    if [ ! -z "$key" ]; then
        docker exec alutrip-redis redis-cli del "$key" >/dev/null 2>&1 && DELETED_COUNT=$((DELETED_COUNT + 1))
    fi
done

echo "✅ $DELETED_COUNT rate limit(s) removido(s)!"

# Final verification
REMAINING=$(docker exec alutrip-redis redis-cli keys "rate_limit:*" | wc -l)

echo ""
echo "📊 Verificação final:"
echo "   Rate limits restantes: $REMAINING"

if [ "$REMAINING" -eq 0 ]; then
    echo ""
    echo "🎉 SUCESSO COMPLETO!"
    echo "🚀 Sistema liberado para testes ilimitados!"
    echo ""
    echo "💡 Agora você pode:"
    echo "   • Criar quantos itinerários quiser"
    echo "   • Fazer perguntas de viagem sem limite"
    echo "   • Testar todas as funcionalidades"
else
    echo ""
    echo "⚠️  Ainda há $REMAINING rate limit(s) restante(s)"
    echo "💡 Tente executar o script novamente"
fi

echo ""
echo "🔧 COMANDOS ÚTEIS:"
echo "   • Limpar rate limits: ./scripts/clear-rate-limits.sh"
echo "   • Ver rate limits: docker exec alutrip-redis redis-cli keys 'rate_limit:*'"
echo "   • Status do Redis: docker exec alutrip-redis redis-cli ping"
echo ""