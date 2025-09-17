#!/bin/bash

# AluTrip - Reset Docker Containers Script
# This script stops all containers, removes volumes (data), and starts fresh containers

set -e

echo "🔄 AluTrip - Resetting Docker Containers"
echo "========================================"

# Navigate to docker directory
cd "$(dirname "$0")/../docker"

echo "📦 Stopping and removing containers..."
docker-compose down

echo "🗑️  Removing volumes (this will delete all data)..."
docker-compose down -v

echo "🧹 Cleaning up orphaned volumes..."
docker volume prune -f

echo "🚀 Starting fresh containers..."
docker-compose up -d postgres redis pgadmin redis-commander

echo "⏳ Waiting for services to be healthy..."
sleep 10

echo "✅ Checking container status..."
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "🎉 Reset complete! All containers are running with fresh data."
echo ""
echo "📍 Service URLs:"
echo "   🐘 PostgreSQL: localhost:5432"
echo "   🔴 Redis: localhost:6379"
echo "   🗄️  PgAdmin: http://localhost:8080"
echo "   🔧 Redis Commander: http://localhost:8001"
echo ""
echo "💡 Next steps:"
echo "   1. Run database migrations: npm run migrate"
echo "   2. Start the backend: npm run dev"
