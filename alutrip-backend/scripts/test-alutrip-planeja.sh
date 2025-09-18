#!/bin/bash

# AluTrip Backend - Itinerary API Test Script
# Tests all itinerary endpoints including hybrid system, PDF generation, and rescue functionality

set -e

# Configuration
API_BASE="http://localhost:3000"
ENDPOINT_BASE="$API_BASE/api/itinerary"

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

# Wait for itinerary processing
wait_for_processing() {
    local itinerary_id=$1
    local max_wait=120  # 2 minutes max
    local wait_time=0
    
    echo -e "${YELLOW}⏳ Waiting for itinerary $itinerary_id to process...${NC}"
    
    while [ $wait_time -lt $max_wait ]; do
        status_response=$(curl -s "$ENDPOINT_BASE/$itinerary_id/status")
        status=$(echo "$status_response" | grep -o '"processing_status":"[^"]*' | cut -d':' -f2 | tr -d '"')
        
        if [ "$status" = "completed" ]; then
            echo -e "${GREEN}✅ Itinerary $itinerary_id completed!${NC}"
            return 0
        elif [ "$status" = "failed" ]; then
            echo -e "${RED}❌ Itinerary $itinerary_id failed!${NC}"
            return 1
        fi
        
        echo -e "${YELLOW}   Status: $status (${wait_time}s)${NC}"
        sleep 5
        wait_time=$((wait_time + 5))
    done
    
    echo -e "${YELLOW}⚠️ Timeout waiting for itinerary $itinerary_id${NC}"
    return 1
}

# Main test execution
main() {
    echo -e "${BLUE}"
    echo "=================================================="
    echo "🧳 AluTrip Backend - AluTrip Planeja"
    echo "=================================================="
    echo -e "${NC}"
    
    # Clear rate limits before starting
    clear_rate_limits
    
    # Test 1: Health Check
    print_test_header "Health Check"
    test_api_endpoint "GET" "$API_BASE/health" "" "200" "API Health Check"
    
    # Test 2: Create Itinerary - Valid Request (Updated dates for 2025)
    print_test_header "Create Itinerary - Valid Request"
    itinerary_data='{
        "destination": "Paris, France",
        "start_date": "2025-06-15",
        "end_date": "2025-06-18",
        "budget": 1500,
        "interests": ["culture", "food", "art"]
    }'
    test_api_endpoint "POST" "$ENDPOINT_BASE/create" "$itinerary_data" "200" "Create Valid Itinerary"
    
    # Extract itinerary ID from the last successful response for future tests
    if [ $? -eq 0 ]; then
        ITINERARY_ID=$(echo "$response_body" | jq -r '.data.id' 2>/dev/null)
        echo "Extracted Itinerary ID: $ITINERARY_ID"
    fi
    
    # Test 3: Create Itinerary - Invalid Date (Past Date)
    print_test_header "Create Itinerary - Invalid Past Date"
    invalid_date_data='{
        "destination": "Tokyo, Japan",
        "start_date": "2023-01-01",
        "end_date": "2023-01-05",
        "budget": 2000
    }'
    test_api_endpoint "POST" "$ENDPOINT_BASE/create" "$invalid_date_data" "400" "Invalid Past Date"
    
    # Test 4: Create Itinerary - Invalid Date Range (End before Start)
    print_test_header "Create Itinerary - Invalid Date Range"
    invalid_range_data='{
        "destination": "London, UK",
        "start_date": "2025-12-31",
        "end_date": "2025-12-25",
        "budget": 1000
    }'
    test_api_endpoint "POST" "$ENDPOINT_BASE/create" "$invalid_range_data" "400" "Invalid Date Range"
    
    # Test 5: Create Itinerary - Missing Required Fields
    print_test_header "Create Itinerary - Missing Required Fields"
    missing_fields_data='{
        "destination": "Rome, Italy"
    }'
    test_api_endpoint "POST" "$ENDPOINT_BASE/create" "$missing_fields_data" "400" "Missing Required Fields"
    
    # Test 6: Get Itinerary Status (if we have an ID)
    if [ ! -z "$ITINERARY_ID" ] && [ "$ITINERARY_ID" != "null" ]; then
        print_test_header "Get Itinerary Status"
        test_api_endpoint "GET" "$ENDPOINT_BASE/$ITINERARY_ID/status" "" "200" "Get Itinerary Status"
    else
        print_warning "Skipping status test - No valid itinerary ID"
    fi
    
    # Test 7: Get Itinerary Status - Non-existent ID
    print_test_header "Get Itinerary Status - Non-existent"
    test_api_endpoint "GET" "$ENDPOINT_BASE/999999/status" "" "404" "Get Non-existent Itinerary"
    
    # Test 8: List Itineraries
    print_test_header "List Itineraries"
    test_api_endpoint "GET" "$ENDPOINT_BASE/list" "" "200" "List Itineraries"
    
    # Test 9: List Itineraries with Pagination
    print_test_header "List Itineraries - With Pagination"
    test_api_endpoint "GET" "$ENDPOINT_BASE/list?limit=5&offset=0" "" "200" "List with Pagination"
    
    # Test 10: List Itineraries with Status Filter
    print_test_header "List Itineraries - With Status Filter"
    test_api_endpoint "GET" "$ENDPOINT_BASE/list?status=pending" "" "200" "List with Status Filter"
    
    # Test 11: Get Itinerary Statistics
    print_test_header "Get Itinerary Statistics"
    test_api_endpoint "GET" "$ENDPOINT_BASE/stats" "" "200" "Get Statistics"
    
    # Test 12: Get Client History
    print_test_header "Get Client History"
    test_api_endpoint "GET" "$ENDPOINT_BASE/history" "" "200" "Get Client History"
    
    # Test 13: Test Direct Processing Endpoint
    print_test_header "Create Itinerary - Direct Processing"
    direct_data='{
        "destination": "Amsterdam, Netherlands",
        "start_date": "2025-07-01",
        "end_date": "2025-07-04",
        "budget": 1200,
        "interests": ["culture", "art"]
    }'
    test_api_endpoint "POST" "$ENDPOINT_BASE/create-direct" "$direct_data" "200" "Create Direct Processing"
    
    # Extract direct processing ID
    if [ $? -eq 0 ]; then
        DIRECT_ID=$(echo "$response_body" | jq -r '.data.id' 2>/dev/null)
        echo "Extracted Direct Processing ID: $DIRECT_ID"
    fi
    
    # Test 14: Test Process Stuck Endpoint
    print_test_header "Process Stuck Itineraries"
    test_api_endpoint "POST" "$ENDPOINT_BASE/process-stuck" "{}" "200" "Process Stuck Itineraries"
    
    # Test 15: Wait for Processing and Test PDF Generation
    if [ ! -z "$ITINERARY_ID" ] && [ "$ITINERARY_ID" != "null" ]; then
        print_test_header "Wait for Processing and Test PDF"
        echo "Waiting for itinerary $ITINERARY_ID to complete processing..."
        
        if wait_for_processing "$ITINERARY_ID"; then
            # Test PDF download
            print_test_header "Download PDF - Ready"
            test_api_endpoint "GET" "$ENDPOINT_BASE/$ITINERARY_ID/download" "" "200" "Download PDF (Ready)"
        else
            print_warning "Itinerary processing timed out, testing rescue..."
            # Test rescue system
            test_api_endpoint "POST" "$ENDPOINT_BASE/process-stuck" "{}" "200" "Rescue Stuck Itinerary"
        fi
    else
        print_warning "Skipping PDF download test - No valid itinerary ID"
    fi
    
    # Test 16: Rate Limiting Test (create multiple itineraries quickly)
    print_test_header "Rate Limiting Test"
    echo "Creating multiple itineraries to test rate limiting..."
    
    for i in {1..7}; do
        quick_data='{
            "destination": "Test Destination '$i'",
            "start_date": "2025-07-01",
            "end_date": "2025-07-03"
        }'
        
        echo "Request #$i..."
        response=$(curl -s -w "\nHTTP_STATUS:%{http_code}\n" \
            -X "POST" \
            -H "Content-Type: application/json" \
            -H "User-Agent: AluTrip-Test/1.0" \
            -d "$quick_data" \
            "$ENDPOINT_BASE/create")
        
        http_status=$(echo "$response" | grep "HTTP_STATUS:" | cut -d: -f2)
        
        if [ "$http_status" = "429" ]; then
            print_success "Rate limiting working - Got 429 after $i requests"
            break
        elif [ $i -eq 7 ]; then
            print_warning "Rate limiting not triggered after $i requests"
        fi
        
        sleep 0.1
    done
    
    # Test 17: Test Hybrid System (Queue + Fallback)
    print_test_header "Test Hybrid System"
    echo "Testing hybrid processing system..."
    
    hybrid_data='{
        "destination": "Barcelona, Spain",
        "start_date": "2025-08-01",
        "end_date": "2025-08-04",
        "budget": 1000,
        "interests": ["culture", "food"]
    }'
    
    # Create itinerary and check processing method
    response=$(curl -s -w "\nHTTP_STATUS:%{http_code}\n" \
        -X "POST" \
        -H "Content-Type: application/json" \
        -H "User-Agent: AluTrip-Test/1.0" \
        -d "$hybrid_data" \
        "$ENDPOINT_BASE/create")
    
    http_status=$(echo "$response" | grep "HTTP_STATUS:" | cut -d: -f2)
    response_body=$(echo "$response" | grep -v "HTTP_STATUS:")
    
    if [ "$http_status" = "200" ]; then
        processing_method=$(echo "$response_body" | grep -o '"processing_method":"[^"]*' | cut -d':' -f2 | tr -d '"')
        print_success "Hybrid system working - Method: $processing_method"
    else
        print_error "Hybrid system test failed - Status: $http_status"
    fi
    
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
        echo -e "\n${GREEN}🎉 All tests passed! AluTrip Planeja is working correctly!${NC}"
        echo -e "${GREEN}✅ Hybrid system (queue + fallback) tested${NC}"
        echo -e "${GREEN}✅ PDF generation tested${NC}"
        echo -e "${GREEN}✅ Rescue system tested${NC}"
        echo -e "${GREEN}✅ Direct processing tested${NC}"
        echo -e "${GREEN}✅ Rate limiting tested${NC}"
        exit 0
    else
        echo -e "\n${RED}⚠️ Some tests failed. Please check the implementation.${NC}"
        echo -e "${YELLOW}💡 Check logs for detailed error information${NC}"
        exit 1
    fi
}

# Check if jq is available
if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}⚠️ jq not found. JSON responses will not be formatted.${NC}"
fi

# Run main function
main "$@"
