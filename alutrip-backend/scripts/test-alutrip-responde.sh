#!/bin/bash

# Test script for AluTrip Responde feature
# Tests guardrails implementation to ensure non-travel questions are properly filtered
# and travel questions are processed correctly

echo "🧪 Running AluTrip Responde Tests: Guardrails Validation"
echo "=============================================="
echo ""

# Base URL for the API
BASE_URL="http://localhost:3000"

# Test cases for non-travel questions
declare -a NON_TRAVEL_QUESTIONS=(
    "Como programar em JavaScript?"
    "Qual é a melhor estratégia de investimento?"
    "Você pode me ajudar com meu dever de matemática?"
    "Como está o clima hoje?"
    "Como conserto meu computador?"
)

# Test cases for travel questions (should pass through)
declare -a TRAVEL_QUESTIONS=(
    "Qual é a melhor época para visitar o Japão?"
    "Você pode recomendar bons restaurantes em Paris?"
    "Quais são as principais atrações para ver em Roma?"
    "Quanto devo reservar de orçamento para uma viagem à Tailândia?"
    "Qual é a melhor forma de se locomover em Nova York?"
)

echo "🔍 Testing Non-Travel Questions (should be filtered):"
echo "----------------------------------------------------"
echo ""

for question in "${NON_TRAVEL_QUESTIONS[@]}"; do
    echo "❓ Question: $question"
    
    response=$(curl -s -X POST "$BASE_URL/api/travel/ask" \
        -H "Content-Type: application/json" \
        -d "{\"question\": \"$question\", \"model\": \"groq\"}" \
        -w "\nHTTP_CODE:%{http_code}")
    
    http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)
    response_body=$(echo "$response" | sed '/HTTP_CODE:/d')
    
    if [ "$http_code" = "200" ]; then
        # Check if response contains the guardrail message
        if echo "$response_body" | grep -q "Essa pergunta que você fez foge um pouquinho do tema de viagens"; then
            echo "✅ PASS: Guardrail activated correctly"
        else
            echo "❌ FAIL: Guardrail not activated - AI responded to non-travel question"
            echo "Response: $response_body"
        fi
    else
        echo "❌ FAIL: HTTP $http_code - $response_body"
    fi
    
    echo ""
    sleep 1
done

echo "🌍 Testing Travel Questions (should pass through):"
echo "------------------------------------------------"
echo ""

for question in "${TRAVEL_QUESTIONS[@]}"; do
    echo "❓ Question: $question"
    
    response=$(curl -s -X POST "$BASE_URL/api/travel/ask" \
        -H "Content-Type: application/json" \
        -d "{\"question\": \"$question\", \"model\": \"groq\"}" \
        -w "\nHTTP_CODE:%{http_code}")
    
    http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)
    response_body=$(echo "$response" | sed '/HTTP_CODE:/d')
    
    if [ "$http_code" = "200" ]; then
        # Check if response does NOT contain the guardrail message
        if echo "$response_body" | grep -q "Essa pergunta que você fez foge um pouquinho do tema de viagens"; then
            echo "❌ FAIL: Guardrail incorrectly activated for travel question"
        else
            echo "✅ PASS: Travel question processed correctly"
        fi
    else
        echo "❌ FAIL: HTTP $http_code - $response_body"
    fi
    
    echo ""
    sleep 1
done

echo "🏁 AluTrip Responde test completed!"
echo "===================================="
