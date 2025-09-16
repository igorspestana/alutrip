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
