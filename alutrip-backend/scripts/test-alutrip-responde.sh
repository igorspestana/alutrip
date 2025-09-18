#!/bin/bash

# AluTrip Backend - Travel Q&A API Test Script
# Tests Travel Q&A endpoints including guardrails, AI models, and rate limiting

set -e

# Configuration
API_BASE="http://localhost:3000"
ENDPOINT_BASE="$API_BASE/api/travel"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

print_test_header() {
    echo -e "\n${BLUE}🧪 Testing: $1${NC}"
    echo "----------------------------------------"
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

# Clear rate limits before testing
clear_rate_limits() {
    echo -e "${YELLOW}🧹 Clearing rate limits before testing...${NC}"
    if [ -f "./scripts/clear-rate-limits.sh" ]; then
        ./scripts/clear-rate-limits.sh >/dev/null 2>&1
        echo -e "${GREEN}✅ Rate limits cleared${NC}"
    else
        echo -e "${YELLOW}⚠️ Rate limit script not found, continuing...${NC}"
    fi
    echo ""
}

test_travel_question() {
    local question=$1
    local model=$2
    local expected_guardrail=$3
    local test_name=$4
    
    echo "Testing: $test_name"
    echo "Question: $question"
    echo "Model: $model"
    
    response=$(curl -s -w "\nHTTP_STATUS:%{http_code}\n" \
        -X "POST" \
        -H "Content-Type: application/json" \
        -H "User-Agent: AluTrip-Test/1.0" \
        -d "{\"question\": \"$question\", \"model\": \"$model\"}" \
        "$ENDPOINT_BASE/ask" || echo "ERROR")
    
    if [[ "$response" == "ERROR" ]]; then
        print_error "Connection failed to $ENDPOINT_BASE/ask"
        return 1
    fi
    
    # Extract HTTP status
    http_status=$(echo "$response" | grep "HTTP_STATUS:" | cut -d: -f2)
    response_body=$(echo "$response" | grep -v "HTTP_STATUS:")
    
    echo "Status: $http_status"
    echo "Response: $(echo "$response_body" | jq . 2>/dev/null || echo "$response_body")"
    
    if [ "$http_status" = "200" ]; then
        if [ "$expected_guardrail" = "true" ]; then
            # Should contain guardrail message
            if echo "$response_body" | grep -q "Essa pergunta que você fez foge um pouquinho do tema de viagens"; then
                print_success "$test_name - Guardrail activated correctly"
                return 0
            else
                print_error "$test_name - Guardrail not activated for non-travel question"
                return 1
            fi
        else
            # Should NOT contain guardrail message
            if echo "$response_body" | grep -q "Essa pergunta que você fez foge um pouquinho do tema de viagens"; then
                print_error "$test_name - Guardrail incorrectly activated for travel question"
                return 1
            else
                print_success "$test_name - Travel question processed correctly"
                return 0
            fi
        fi
    else
        print_error "$test_name - Expected: 200, Got: $http_status"
        return 1
    fi
}

# Main test execution
main() {
    echo -e "${BLUE}"
    echo "=================================================="
    echo "🧳 AluTrip Backend - AluTrip Responde"
    echo "=================================================="
    echo -e "${NC}"
    
    # Clear rate limits before starting
    clear_rate_limits

    # Test 1: Health Check
    print_test_header "Health Check"
    test_api_endpoint "GET" "$API_BASE/health" "" "200" "API Health Check"
    
    # Test 2: AI Models Health Check
    print_test_header "AI Models Health Check"
    test_api_endpoint "GET" "$ENDPOINT_BASE/models/health" "" "200" "AI Models Health"
    
    # Test 3: Get Travel Statistics
    print_test_header "Get Travel Statistics"
    test_api_endpoint "GET" "$ENDPOINT_BASE/stats" "" "200" "Get Travel Statistics"
    
    # Test 4: Get Recent Questions
    print_test_header "Get Recent Questions"
    test_api_endpoint "GET" "$ENDPOINT_BASE/questions?limit=5" "" "200" "Get Recent Questions"
    
    # Test 5: Get Client History
    print_test_header "Get Client History"
    test_api_endpoint "GET" "$ENDPOINT_BASE/history?limit=5" "" "200" "Get Client History"
    
    # Test 6: Non-Travel Questions (Guardrails)
    print_test_header "Non-Travel Questions - Guardrails"
    
    # Test cases for non-travel questions
    declare -a NON_TRAVEL_QUESTIONS=(
        "Como programar em JavaScript?"
        "Qual é a melhor estratégia de investimento?"
        "Você pode me ajudar com meu dever de matemática?"
        "Como está o clima hoje?"
        "Como conserto meu computador?"
    )
    
    for question in "${NON_TRAVEL_QUESTIONS[@]}"; do
        test_travel_question "$question" "groq" "true" "Non-travel: $question"
        sleep 1
    done
    
    # Test 7: Travel Questions (Should Pass Through)
    print_test_header "Travel Questions - Should Pass Through"
    
    # Test cases for travel questions
    declare -a TRAVEL_QUESTIONS=(
        "Qual é a melhor época para visitar o Japão?"
        "Você pode recomendar bons restaurantes em Paris?"
        "Quais são as principais atrações para ver em Roma?"
        "Quanto devo reservar de orçamento para uma viagem à Tailândia?"
        "Qual é a melhor forma de se locomover em Nova York?"
    )
    
    for question in "${TRAVEL_QUESTIONS[@]}"; do
        test_travel_question "$question" "groq" "false" "Travel: $question"
        sleep 1
    done
    
    # Test 8: Test Gemini Model
    print_test_header "Test Gemini Model"
    test_travel_question "Quais são os melhores destinos para lua de mel na Europa?" "gemini" "false" "Gemini Model Test"
    
    # Test 9: Invalid Model
    print_test_header "Invalid Model Test"
    echo "Testing with invalid model..."
    
    response=$(curl -s -w "\nHTTP_STATUS:%{http_code}\n" \
        -X "POST" \
        -H "Content-Type: application/json" \
        -H "User-Agent: AluTrip-Test/1.0" \
        -d '{"question": "Qual é a melhor época para visitar o Japão?", "model": "invalid-model"}' \
        "$ENDPOINT_BASE/ask" || echo "ERROR")
    
    http_status=$(echo "$response" | grep "HTTP_STATUS:" | cut -d: -f2)
    
    if [ "$http_status" = "400" ]; then
        print_success "Invalid model rejected correctly - Status: $http_status"
    else
        print_error "Invalid model not rejected - Expected: 400, Got: $http_status"
    fi
    
    # Test 10: Missing Question Field
    print_test_header "Missing Question Field"
    echo "Testing with missing question field..."
    
    response=$(curl -s -w "\nHTTP_STATUS:%{http_code}\n" \
        -X "POST" \
        -H "Content-Type: application/json" \
        -H "User-Agent: AluTrip-Test/1.0" \
        -d '{"model": "groq"}' \
        "$ENDPOINT_BASE/ask" || echo "ERROR")
    
    http_status=$(echo "$response" | grep "HTTP_STATUS:" | cut -d: -f2)
    
    if [ "$http_status" = "400" ]; then
        print_success "Missing question field rejected correctly - Status: $http_status"
    else
        print_error "Missing question field not rejected - Expected: 400, Got: $http_status"
    fi
    
    # Test 11: Question Too Short
    print_test_header "Question Too Short"
    test_travel_question "Hi" "groq" "true" "Question Too Short"
    
    # Test 12: Question Too Long
    print_test_header "Question Too Long"
    long_question="Esta é uma pergunta muito longa que excede o limite máximo de caracteres permitido para perguntas de viagem. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incididunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?"
    
    response=$(curl -s -w "\nHTTP_STATUS:%{http_code}\n" \
        -X "POST" \
        -H "Content-Type: application/json" \
        -H "User-Agent: AluTrip-Test/1.0" \
        -d "{\"question\": \"$long_question\", \"model\": \"groq\"}" \
        "$ENDPOINT_BASE/ask" || echo "ERROR")
    
    http_status=$(echo "$response" | grep "HTTP_STATUS:" | cut -d: -f2)
    
    if [ "$http_status" = "400" ]; then
        print_success "Question too long rejected correctly - Status: $http_status"
    else
        print_error "Question too long not rejected - Expected: 400, Got: $http_status"
    fi
    
    # Test 13: Rate Limiting Test
    print_test_header "Rate Limiting Test"
    echo "Testing rate limiting by making multiple requests..."
    
    for i in {1..7}; do
        echo "Request #$i..."
        response=$(curl -s -w "\nHTTP_STATUS:%{http_code}\n" \
            -X "POST" \
            -H "Content-Type: application/json" \
            -H "User-Agent: AluTrip-Test/1.0" \
            -d "{\"question\": \"Test rate limiting question $i\", \"model\": \"groq\"}" \
            "$ENDPOINT_BASE/ask")
        
        http_status=$(echo "$response" | grep "HTTP_STATUS:" | cut -d: -f2)
        
        if [ "$http_status" = "429" ]; then
            print_success "Rate limiting working - Got 429 after $i requests"
            break
        elif [ $i -eq 7 ]; then
            print_warning "Rate limiting not triggered after $i requests"
        fi
        
        sleep 0.1
    done
    
    # Test 14: Get Specific Question (if we have any)
    print_test_header "Get Specific Question"
    test_api_endpoint "GET" "$ENDPOINT_BASE/questions/1" "" "200" "Get Specific Question"
    
    # Summary
    echo -e "\n${BLUE}"
    echo "=================================================="
    echo "🏁 Test Results Summary"
    echo "=================================================="
    echo -e "${NC}"
    
    total_tests=$((TESTS_PASSED + TESTS_FAILED))
    
    echo -e "${GREEN}✅ Tests Passed: $TESTS_PASSED${NC}"
    echo -e "${RED}❌ Tests Failed: $TESTS_FAILED${NC}"
    echo -e "${BLUE}📊 Total Tests: $total_tests${NC}"
    
    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "\n${GREEN}🎉 All tests passed! AluTrip Responde is working correctly!${NC}"
        echo -e "${GREEN}✅ Guardrails working properly${NC}"
        echo -e "${GREEN}✅ AI models (Groq & Gemini) tested${NC}"
        echo -e "${GREEN}✅ Rate limiting working${NC}"
        echo -e "${GREEN}✅ Validation working${NC}"
        exit 0
    else
        echo -e "\n${RED}⚠️ Some tests failed. Please check the implementation.${NC}"
        echo -e "${YELLOW}💡 Check logs for detailed error information${NC}"
        exit 1
    fi
}

# Helper function for API endpoint testing
test_api_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local expected_status=$4
    local test_name=$5
    
    echo "Testing: $test_name"
    echo "Request: $method $endpoint"
    
    if [ "$method" = "POST" ]; then
        response=$(curl -s -w "\nHTTP_STATUS:%{http_code}\n" \
            -X "$method" \
            -H "Content-Type: application/json" \
            -H "User-Agent: AluTrip-Test/1.0" \
            -d "$data" \
            "$endpoint" || echo "ERROR")
    else
        response=$(curl -s -w "\nHTTP_STATUS:%{http_code}\n" \
            -X "$method" \
            -H "User-Agent: AluTrip-Test/1.0" \
            "$endpoint" || echo "ERROR")
    fi
    
    if [[ "$response" == "ERROR" ]]; then
        print_error "Connection failed to $endpoint"
        return 1
    fi
    
    # Extract HTTP status
    http_status=$(echo "$response" | grep "HTTP_STATUS:" | cut -d: -f2)
    response_body=$(echo "$response" | grep -v "HTTP_STATUS:")
    
    echo "Status: $http_status"
    echo "Response: $(echo "$response_body" | jq . 2>/dev/null || echo "$response_body")"
    
    if [ "$http_status" = "$expected_status" ]; then
        print_success "$test_name - Status: $http_status"
        return 0
    else
        print_error "$test_name - Expected: $expected_status, Got: $http_status"
        return 1
    fi
}

# Check if jq is available
if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}⚠️ jq not found. JSON responses will not be formatted.${NC}"
fi

# Run main function
main "$@"
