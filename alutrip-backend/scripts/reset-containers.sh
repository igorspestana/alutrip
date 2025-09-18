#!/bin/bash

# AluTrip - Reset Docker Containers Script
# This script stops all containers e removes volumes (data)

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

echo "🧹 Cleaning up orphaned images..."
docker image prune -a -f

echo ""
echo "🎉 Reset complete! All containers are running with fresh data."
echo ""