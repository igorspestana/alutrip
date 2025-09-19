#!/bin/bash

# AluTrip Stop Script
# This script stops all AluTrip services

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_info() {
    echo -e "${CYAN}[INFO]${NC} $1"
}

# Main stop function
stop_alutrip() {
    echo -e "${PURPLE}"
    echo "=========================================="
    echo "🛑 Stopping AluTrip Travel Assistant"
    echo "=========================================="
    echo -e "${NC}"
    
    # Stop Frontend
    print_step "Stopping Frontend..."
    if [ -d "alutrip-frontend" ]; then
        cd alutrip-frontend
        print_info "Stopping frontend container..."
        npm run dc:down
        print_success "Frontend stopped!"
        cd ..
    else
        print_warning "Frontend directory not found"
    fi
    
    # Stop Backend
    print_step "Stopping Backend Services..."
    if [ -d "alutrip-backend" ]; then
        cd alutrip-backend
        print_info "Stopping backend containers..."
        npm run dc:down
        print_success "Backend services stopped!"
        cd ..
    else
        print_warning "Backend directory not found"
    fi
    
    echo -e "${GREEN}"
    echo "=========================================="
    echo "✅ AluTrip has been stopped"
    echo "=========================================="
    echo -e "${NC}"
    
    print_info "All services have been stopped successfully!"
    print_info "To start again, run: ./start-alutrip.sh"
}

# Run the main function
stop_alutrip
