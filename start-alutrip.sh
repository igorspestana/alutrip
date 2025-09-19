#!/bin/bash

# AluTrip Startup Script
# This script automates the complete startup process for AluTrip application

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

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to wait for service to be ready
wait_for_service() {
    local service_name="$1"
    local check_command="$2"
    local max_attempts=30
    local attempt=1
    
    print_info "Waiting for $service_name to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        if eval "$check_command" >/dev/null 2>&1; then
            print_success "$service_name is ready!"
            return 0
        fi
        
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    print_error "$service_name failed to start after $((max_attempts * 2)) seconds"
    print_info "Container status:"
    docker ps --filter "name=alutrip" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    return 1
}

# Function to check if Docker is running
check_docker() {
    if ! command_exists docker; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker first."
        exit 1
    fi
    
    print_success "Docker is running"
}

# Function to check if .env file exists
check_env_file() {
    if [ ! -f "alutrip-backend/.env" ]; then
        print_warning ".env file not found in alutrip-backend/"
        print_info "Creating .env file from .env.example..."
        
        if [ -f "alutrip-backend/.env.example" ]; then
            cp alutrip-backend/.env.example alutrip-backend/.env
            print_success ".env file created from .env.example"
            print_warning "Please update the API keys in alutrip-backend/.env for full functionality"
        else
            print_error ".env.example file not found. Please create the .env file manually."
            exit 1
        fi
    else
        print_success ".env file found"
    fi
}

# Main startup function
start_alutrip() {
    echo -e "${PURPLE}"
    echo "=========================================="
    echo "🚀 Starting AluTrip Travel Assistant"
    echo "=========================================="
    echo -e "${NC}"
    
    # Check prerequisites
    print_step "Checking prerequisites..."
    check_docker
    check_env_file
    
    # Start Backend Services
    print_step "Starting Backend Services..."
    cd alutrip-backend
    
    print_info "Starting Docker containers for backend services..."
    npm run dc:up
    
    # Wait for services to be ready
    print_info "Waiting for services to initialize (30-60 seconds)..."
    sleep 10
    
    # Check container status
    print_info "Checking container status..."
    npm run dc:ps
    
    # Wait for PostgreSQL to be ready
    wait_for_service "PostgreSQL" "docker exec alutrip-postgres pg_isready -U alutrip_user"
    
    # Wait for Redis to be ready
    wait_for_service "Redis" "docker exec alutrip-redis redis-cli ping"
    
    # Wait for Backend API to be ready
    wait_for_service "Backend API" "curl -s http://localhost:3000/health >/dev/null"
    
    # Run database migrations
    print_step "Running database migrations..."
    npm run migrate:dev up
    
    # Check migration status
    print_info "Checking migration status..."
    npm run migrate:dev status
    
    print_success "Backend services are ready!"
    
    # Start Frontend
    print_step "Starting Frontend..."
    cd ../alutrip-frontend
    
    print_info "Starting frontend container..."
    npm run dc:up
    
    # Wait for frontend to be ready
    wait_for_service "Frontend" "curl -s http://localhost:5173 >/dev/null"
    
    print_success "Frontend is ready!"
    
    # Display access information
    echo -e "${GREEN}"
    echo "=========================================="
    echo "🎉 AluTrip is now running!"
    echo "=========================================="
    echo -e "${NC}"
    
    print_info "Access URLs:"
    echo -e "  🌐 ${CYAN}Frontend:${NC} http://localhost:5173"
    echo -e "  🔧 ${CYAN}Backend API:${NC} http://localhost:3000"
    echo -e "  📚 ${CYAN}API Documentation:${NC} http://localhost:3000/docs"
    echo -e "  🏥 ${CYAN}Health Check:${NC} http://localhost:3000/health"
    echo -e "  🗄️  ${CYAN}PgAdmin:${NC} http://localhost:8080"
    echo -e "  📊 ${CYAN}Redis Commander:${NC} http://localhost:8001"
    
    echo ""
    print_info "Useful commands:"
    echo -e "  📋 ${CYAN}Check container status:${NC} cd alutrip-backend && npm run dc:ps"
    echo -e "  📋 ${CYAN}View logs:${NC} cd alutrip-backend && npm run dc:logs"
    echo -e "  🛑 ${CYAN}Stop all services:${NC} ./stop-alutrip.sh"
    
    echo ""
    print_success "AluTrip Travel Assistant is ready to use! 🌍✈️"
}

# Function to handle cleanup on exit
cleanup() {
    print_info "Cleaning up..."
    # Add any cleanup logic here if needed
}

# Set up signal handlers
trap cleanup EXIT INT TERM

# Run the main function
start_alutrip
