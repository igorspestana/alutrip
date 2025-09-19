#!/bin/bash

# AluTrip - Reset Docker Containers Script
# This script stops and removes only AluTrip containers and volumes

set -e

echo "🔄 AluTrip - Resetting Docker Containers"
echo "========================================"

# Navigate to docker directory
cd "$(dirname "$0")/../docker"

echo "📦 Stopping and removing AluTrip containers..."
docker-compose down

echo "🗑️  Removing AluTrip volumes (this will delete AluTrip data)..."
docker-compose down -v

echo "🧹 Cleaning up only AluTrip orphaned containers..."
# Remove only containers that are not running and were created by this compose
docker-compose rm -f

echo "🗑️  Removing AluTrip images..."
# Remove images built by this project
docker-compose down --rmi all

echo "🧹 Force removing any remaining AluTrip images..."
# Force remove any remaining AluTrip images
docker images | grep -E "(alutrip|docker-alutrip)" | awk '{print $3}' | xargs -r docker rmi -f

echo ""
echo "🎉 Reset complete! AluTrip containers, volumes and images removed."
echo "💡 To start fresh: docker-compose up -d"
echo ""