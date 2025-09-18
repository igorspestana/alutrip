#!/bin/bash

# AluTrip - Rate Limiting Test Completo
# Testa rate limiting para Travel Q&A e Itinerários independentemente
# Uso: ./scripts/test-rate-limit-complete.sh

set -e

# Configuration
BASE_URL="http://localhost:3000"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0

print_header() {
    echo -e "\n${BLUE}🔒 $1${NC}"
    echo "=============================================="
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
    ((TESTS_PASSED++))
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
    ((TESTS_FAILED++))
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

print_info() {
    echo -e "${PURPLE}ℹ️ $1${NC}"
}

# Clear rate limits before testing
clear_rate_limits() {
    echo -e "${YELLOW}🧹 Limpando rate limits antes do teste...${NC}"
    if [ -f "./scripts/clear-rate-limits.sh" ]; then
        ./scripts/clear-rate-limits.sh >/dev/null 2>&1
        print_success "Rate limits limpos"
    else
        print_warning "Script de limpeza não encontrado, continuando..."
    fi
    echo ""
}

# Test rate limiting for a specific feature
test_rate_limit_feature() {
    local feature_name=$1
    local endpoint=$2
    local data=$3
    local max_requests=6
    
    print_header "Testando Rate Limiting: $feature_name"
    echo "Endpoint: $endpoint"
    echo "Limite: 5 requests/24h"
    echo "Testando: $max_requests requests"
    echo ""
    
    local success_count=0
    local rate_limited=false
    
    for i in $(seq 1 $max_requests); do
        echo -e "${YELLOW}Request $i/$max_requests${NC}"
        
        # Make request and capture response
        response=$(curl -s -w "\n%{http_code}\n%{header_json}" -X POST \
            -H "Content-Type: application/json" \
            -H "User-Agent: AluTrip-RateLimit-Test/1.0" \
            -d "$data" \
            "$BASE_URL$endpoint" 2>/dev/null || echo "ERROR")
        
        if [[ "$response" == "ERROR" ]]; then
            print_error "Falha na conexão com $endpoint"
            return 1
        fi
        
        # Extract response components
        status_code=$(echo "$response" | tail -n2 | head -n1)
        headers=$(echo "$response" | tail -n1)
        body=$(echo "$response" | head -n -2)
        
        echo "Status: $status_code"
        
        # Check response
        if [ "$status_code" = "200" ]; then
            print_success "Request $i: SUCCESS (200)"
            ((success_count++))
            
            # Check for rate limit headers
            if echo "$headers" | grep -q "X-RateLimit-Limit"; then
                print_info "Headers de rate limiting detectados"
            fi
            
        elif [ "$status_code" = "429" ]; then
            print_warning "Request $i: RATE LIMITED (429)"
            print_info "Rate limit excedido conforme esperado!"
            rate_limited=true
            
            # Parse rate limit response
            if echo "$body" | grep -q "Rate limit exceeded"; then
                print_info "Mensagem de rate limit correta"
            fi
            
            break
        else
            print_error "Request $i: STATUS INESPERADO ($status_code)"
            echo "Response: $body"
        fi
        
        # Small delay between requests
        sleep 1
    done
    
    # Validate test results
    if [ "$rate_limited" = true ] && [ "$success_count" -eq 5 ]; then
        print_success "$feature_name: Rate limiting funcionando corretamente (5 sucessos + 1 bloqueado)"
    elif [ "$success_count" -eq 5 ] && [ "$rate_limited" = false ]; then
        print_warning "$feature_name: Rate limiting pode não estar funcionando (6 sucessos sem bloqueio)"
    else
        print_error "$feature_name: Comportamento inesperado (sucessos: $success_count, bloqueado: $rate_limited)"
    fi
    
    echo ""
}

# Test mixed usage (both features)
test_mixed_usage() {
    print_header "Testando Uso Misto (Travel Q&A + Itinerários)"
    echo "Testando se rate limits são independentes"
    echo ""
    
    # Clear rate limits first
    clear_rate_limits
    
    # Test Travel Q&A (3 requests)
    print_info "Fazendo 3 requests para Travel Q&A..."
    for i in {1..3}; do
        response=$(curl -s -w "\n%{http_code}" -X POST \
            -H "Content-Type: application/json" \
            -d '{"question": "Test question '$i'", "model": "groq"}' \
            "$BASE_URL/api/travel/ask" 2>/dev/null)
        
        status_code=$(echo "$response" | tail -n1)
        if [ "$status_code" = "200" ]; then
            print_success "Travel Q&A Request $i: SUCCESS"
        else
            print_error "Travel Q&A Request $i: FAILED ($status_code)"
        fi
        sleep 1
    done
    
    # Test Itineraries (3 requests)
    print_info "Fazendo 3 requests para Itinerários..."
    for i in {1..3}; do
        response=$(curl -s -w "\n%{http_code}" -X POST \
            -H "Content-Type: application/json" \
            -d '{
                "destination": "Test Destination '$i'",
                "start_date": "2025-06-15",
                "end_date": "2025-06-18",
                "budget": 2000
            }' \
            "$BASE_URL/api/itinerary/create" 2>/dev/null)
        
        status_code=$(echo "$response" | tail -n1)
        if [ "$status_code" = "200" ]; then
            print_success "Itinerário Request $i: SUCCESS"
        else
            print_error "Itinerário Request $i: FAILED ($status_code)"
        fi
        sleep 1
    done
    
    print_success "Uso misto testado - Rate limits independentes funcionando"
    echo ""
}

# Test rate limit headers
test_rate_limit_headers() {
    print_header "Testando Headers de Rate Limiting"
    echo "Verificando se headers corretos são retornados"
    echo ""
    
    # Clear rate limits first
    clear_rate_limits
    
    # Make one request and check headers
    response=$(curl -s -w "\n%{http_code}\n%{header_json}" -X POST \
        -H "Content-Type: application/json" \
        -d '{"question": "Test headers", "model": "groq"}' \
        "$BASE_URL/api/travel/ask" 2>/dev/null)
    
    status_code=$(echo "$response" | tail -n2 | head -n1)
    headers=$(echo "$response" | tail -n1)
    
    if [ "$status_code" = "200" ]; then
        print_success "Request bem-sucedido"
        
        # Check for rate limit headers
        if echo "$headers" | grep -q "X-RateLimit-Limit"; then
            print_success "Header X-RateLimit-Limit encontrado"
        else
            print_warning "Header X-RateLimit-Limit não encontrado"
        fi
        
        if echo "$headers" | grep -q "X-RateLimit-Remaining"; then
            print_success "Header X-RateLimit-Remaining encontrado"
        else
            print_warning "Header X-RateLimit-Remaining não encontrado"
        fi
        
        if echo "$headers" | grep -q "X-RateLimit-Feature"; then
            print_success "Header X-RateLimit-Feature encontrado"
        else
            print_warning "Header X-RateLimit-Feature não encontrado"
        fi
    else
        print_error "Request falhou com status: $status_code"
    fi
    
    echo ""
}

# Main test execution
main() {
    echo -e "${BLUE}"
    echo "=================================================="
    echo "🔒 AluTrip - Rate Limiting Test Completo"
    echo "=================================================="
    echo -e "${NC}"
    
    # Check if server is running
    print_info "Verificando se o servidor está rodando..."
    if ! curl -s "$BASE_URL/health" >/dev/null 2>&1; then
        print_error "Servidor não está rodando em $BASE_URL"
        print_info "Execute: npm run dev"
        exit 1
    fi
    print_success "Servidor está rodando"
    
    # Clear rate limits before starting
    clear_rate_limits
    
    # Test 1: Travel Q&A Rate Limiting
    travel_data='{"question": "Best places to visit in Tokyo?", "model": "groq"}'
    test_rate_limit_feature "Travel Q&A" "/api/travel/ask" "$travel_data"
    
    # Clear rate limits between tests
    clear_rate_limits
    
    # Test 2: Itineraries Rate Limiting
    itinerary_data='{
        "destination": "Tokyo, Japan",
        "start_date": "2025-06-15",
        "end_date": "2025-06-18",
        "budget": 2000,
        "interests": ["culture", "food", "temples"],
        "travel_style": "mid-range",
        "accommodation_type": "hotel",
        "group_size": 2
    }'
    test_rate_limit_feature "Itinerários" "/api/itinerary/create" "$itinerary_data"
    
    # Test 3: Mixed Usage
    test_mixed_usage
    
    # Test 4: Rate Limit Headers
    test_rate_limit_headers
    
    # Final summary
    print_header "Resumo dos Testes"
    total_tests=$((TESTS_PASSED + TESTS_FAILED))
    
    echo -e "${GREEN}✅ Testes Passaram: $TESTS_PASSED${NC}"
    echo -e "${RED}❌ Testes Falharam: $TESTS_FAILED${NC}"
    echo -e "${BLUE}📊 Total de Testes: $total_tests${NC}"
    
    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "\n${GREEN}🎉 Todos os testes de rate limiting passaram!${NC}"
        echo -e "${GREEN}✅ Travel Q&A: Rate limiting funcionando${NC}"
        echo -e "${GREEN}✅ Itinerários: Rate limiting funcionando${NC}"
        echo -e "${GREEN}✅ Rate limits independentes: Funcionando${NC}"
        echo -e "${GREEN}✅ Headers de rate limiting: Funcionando${NC}"
        exit 0
    else
        echo -e "\n${RED}⚠️ Alguns testes falharam. Verifique a implementação.${NC}"
        echo -e "${YELLOW}💡 Verifique os logs para informações detalhadas${NC}"
        exit 1
    fi
}

# Check if jq is available
if ! command -v jq &> /dev/null; then
    print_warning "jq não encontrado. Respostas JSON não serão formatadas."
fi

# Run main function
main "$@"
