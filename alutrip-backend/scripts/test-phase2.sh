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
