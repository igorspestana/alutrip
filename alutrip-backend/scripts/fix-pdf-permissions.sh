#!/bin/bash

# Fix PDF permissions script for AluTrip Docker containers
# This script ensures the pdfs directory has correct permissions for Docker containers

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PDFS_DIR="$PROJECT_ROOT/pdfs"

echo "🔧 AluTrip PDF Permissions Fix"
echo "================================"

# Create pdfs directory if it doesn't exist
if [ ! -d "$PDFS_DIR" ]; then
    echo "📁 Creating pdfs directory: $PDFS_DIR"
    mkdir -p "$PDFS_DIR"
fi

# Set correct permissions
echo "🔐 Setting permissions for pdfs directory..."
chmod 755 "$PDFS_DIR"

# Change ownership to current user if needed
current_user=$(id -u):$(id -g)
echo "👤 Setting ownership to current user ($current_user)..."
chown "$current_user" "$PDFS_DIR" 2>/dev/null || true

# Show final permissions
echo "✅ Current permissions:"
ls -la "$PROJECT_ROOT" | grep "pdfs"

echo ""
echo "📋 Next steps:"
echo "1. Run: docker-compose down (if containers are running)"
echo "2. Run: docker-compose build --no-cache alutrip-backend"
echo "3. Run: docker-compose up alutrip-backend"
echo ""
echo "🎯 The PDF generation should now work correctly in Docker!"
