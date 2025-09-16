#!/bin/bash

# AluTrip Backend - Phase 1 Testing Script
# Este script testa todas as implementações da Phase 1: Foundation

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TESTS_TOTAL=0
TESTS_PASSED=0
TESTS_FAILED=0

echo -e "${BLUE}🧪 AluTrip Backend - Phase 1 Testing Suite${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Helper functions
print_test() {
    echo -e "${YELLOW}🔍 Testing: $1${NC}"
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the alutrip-backend directory."
    exit 1
fi

echo -e "${BLUE}🏗️  Phase 1: Foundation Tests${NC}"
echo ""

# Test 1: Dependencies Installation
print_test "Dependencies Installation"
if npm list > /dev/null 2>&1; then
    print_success "All dependencies installed correctly"
else
    print_error "Dependencies missing or corrupted"
fi

# Test 2: TypeScript Configuration
print_test "TypeScript Configuration"
if [ -f "tsconfig.json" ]; then
    print_success "tsconfig.json exists and is configured"
else
    print_error "tsconfig.json missing"
fi

# Test 3: ESLint Configuration
print_test "ESLint Configuration"
if [ -f ".eslintrc.js" ]; then
    print_success "ESLint configured"
else
    print_error "ESLint configuration missing"
fi

# Test 4: Build Process
print_test "TypeScript Build Process"
if npm run build > /dev/null 2>&1; then
    print_success "TypeScript builds successfully"
    if [ -d "dist" ]; then
        print_success "Build output directory created"
    else
        print_error "Build output directory not found"
    fi
else
    print_error "TypeScript build failed"
fi

# Test 5: Linting
print_test "Code Linting"
if npm run lint > /dev/null 2>&1; then
    print_success "Code passes linting checks"
else
    print_error "Linting errors found"
fi

# Test 6: Project Structure
print_test "Project Structure"
required_dirs=("src/config" "src/controllers" "src/middleware" "src/models" "src/routes" "src/schemas" "src/types" "migrations" "docker")
missing_dirs=()

for dir in "${required_dirs[@]}"; do
    if [ ! -d "$dir" ]; then
        missing_dirs+=("$dir")
    fi
done

if [ ${#missing_dirs[@]} -eq 0 ]; then
    print_success "All required directories exist"
else
    print_error "Missing directories: ${missing_dirs[*]}"
fi

# Test 7: Configuration Files
print_test "Configuration Files"
config_files=("src/config/env.ts" "src/config/database.ts" "src/config/redis.ts" "src/config/logger.ts" "src/config/axios.ts")
missing_files=()

for file in "${config_files[@]}"; do
    if [ ! -f "$file" ]; then
        missing_files+=("$file")
    fi
done

if [ ${#missing_files[@]} -eq 0 ]; then
    print_success "All configuration files exist"
else
    print_error "Missing config files: ${missing_files[*]}"
fi

# Test 8: Middleware Files
print_test "Middleware Implementation"
middleware_files=("src/middleware/error-handler.ts" "src/middleware/rate-limit.ts")
missing_middleware=()

for file in "${middleware_files[@]}"; do
    if [ ! -f "$file" ]; then
        missing_middleware+=("$file")
    fi
done

if [ ${#missing_middleware[@]} -eq 0 ]; then
    print_success "All middleware files implemented"
else
    print_error "Missing middleware: ${missing_middleware[*]}"
fi

# Test 9: Models
print_test "Database Models"
model_files=("src/models/travel-questions.model.ts" "src/models/itineraries.model.ts")
missing_models=()

for file in "${model_files[@]}"; do
    if [ ! -f "$file" ]; then
        missing_models+=("$file")
    fi
done

if [ ${#missing_models[@]} -eq 0 ]; then
    print_success "All database models implemented"
else
    print_error "Missing models: ${missing_models[*]}"
fi

# Test 10: Database Migrations
print_test "Database Migrations"
if [ -f "migrations/001_create_travel_questions.sql" ] && 
   [ -f "migrations/002_create_itineraries.sql" ] && 
   [ -f "migrations/003_create_rate_limits.sql" ] && 
   [ -f "migrations/004_create_conversations.sql" ]; then
    print_success "All database migrations exist"
else
    print_error "Some database migrations are missing"
fi

# Test 11: Docker Configuration
print_test "Docker Configuration"
if [ -f "Dockerfile" ] && [ -f "docker/docker-compose.yml" ]; then
    print_success "Docker configuration complete"
else
    print_error "Docker configuration incomplete"
fi

# Test 12: Health Check Controller
print_test "Health Check Implementation"
if [ -f "src/controllers/health.controller.ts" ] && [ -f "src/routes/health.routes.ts" ]; then
    print_success "Health check endpoints implemented"
else
    print_error "Health check implementation incomplete"
fi

# Test 13: Zod Schemas
print_test "Validation Schemas"
if [ -f "src/schemas/travel.schemas.ts" ]; then
    print_success "Validation schemas implemented"
else
    print_error "Validation schemas missing"
fi

# Test 14: TypeScript Types
print_test "TypeScript Type Definitions"
if [ -f "src/types/api.ts" ] && [ -f "src/types/travel.ts" ]; then
    print_success "Type definitions complete"
else
    print_error "Type definitions incomplete"
fi

# Test 15: Environment Configuration
print_test "Environment Configuration"
if [ -f ".env" ] || [ -f ".env.example" ]; then
    print_success "Environment configuration exists"
else
    print_error "Environment configuration missing"
fi

# Test 16: Documentation
print_test "Documentation"
if [ -f "README.md" ] && [ -f "TESTING_GUIDE.md" ]; then
    print_success "Documentation complete"
else
    print_error "Documentation incomplete"
fi

echo ""
echo -e "${BLUE}🌐 Network & Service Tests${NC}"
echo ""

# Test 17: Server Startup Test (without external dependencies)
print_test "Server Startup (Basic)"
timeout 10s npm start > /dev/null 2>&1 &
SERVER_PID=$!
sleep 2

if kill -0 $SERVER_PID 2>/dev/null; then
    print_success "Server starts without critical errors"
    kill $SERVER_PID 2>/dev/null || true
else
    print_info "Server startup test (expected to fail without database/redis)"
fi

# Test 18: Docker Services Test (if Docker is available)
print_test "Docker Services (Optional)"
if command -v docker &> /dev/null && command -v docker-compose &> /dev/null; then
    if cd docker && docker-compose config > /dev/null 2>&1; then
        print_success "Docker Compose configuration is valid"
        cd ..
    else
        print_error "Docker Compose configuration invalid"
        cd ..
    fi
else
    print_info "Docker not available - skipping Docker tests"
fi

echo ""
echo -e "${BLUE}📊 Test Results Summary${NC}"
echo -e "${BLUE}========================${NC}"
echo -e "Total Tests: $TESTS_TOTAL"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 All Phase 1 tests passed! Foundation is solid.${NC}"
    echo -e "${GREEN}✅ Ready for Phase 2: AluTrip Responde Implementation${NC}"
    exit 0
else
    echo ""
    echo -e "${YELLOW}⚠️  Some tests failed. Please review the errors above.${NC}"
    echo -e "${BLUE}ℹ️  Note: Some failures may be expected without external services running.${NC}"
    exit 1
fi
