#!/bin/bash

# Matrix Delivery Backend - Production Start Script
# This script properly starts the backend with PM2
# Usage: ./start-backend.sh [production|staging|development]

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
LOG_DIR="$SCRIPT_DIR/logs"
ENV_FILE=".env.production"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Parse arguments
ENVIRONMENT="${1:-production}"

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running from correct directory
if [[ ! -f "$BACKEND_DIR/server.js" ]]; then
    print_error "server.js not found in $BACKEND_DIR"
    exit 1
fi

# Create logs directory if not exists
mkdir -p "$LOG_DIR"

print_status "Starting Matrix Delivery Backend - Environment: $ENVIRONMENT"

# Stop existing PM2 processes
print_status "Stopping existing processes..."
pm2 delete matrix-delivery-backend 2>/dev/null || true
pm2 delete auto-deploy 2>/dev/null || true

# Start the backend with proper settings
print_status "Starting backend with PM2..."

cd "$BACKEND_DIR"

# Start with cluster mode, wait for ready, with proper timeouts
pm2 start ecosystem.config.js \
    --env "$ENVIRONMENT" \
    --wait-ready \
    --listen-timeout 60000 \
    --restart-delay 5000

# Wait for server to be ready
print_status "Waiting for server to start..."
sleep 10

# Check if server is running
if pm2 list | grep -q "matrix-delivery-backend.*online"; then
    print_status "Server started successfully!"
    
    # Test health endpoint
    if curl -s -f http://localhost:5000/api/health > /dev/null 2>&1; then
        print_status "Health check passed!"
    else
        print_warning "Health check endpoint not responding yet (may still be initializing)"
    fi
    
    # Save PM2 state for reboot persistence
    print_status "Saving PM2 state for reboot persistence..."
    pm2 save
    
    echo ""
    print_status "✅ Backend is running!"
    echo ""
    echo "Commands:"
    echo "  pm2 list              - Show status"
    echo "  pm2 logs              - View logs"
    echo "  pm2 restart           - Restart"
    echo ""
else
    print_error "Failed to start server. Check logs with: pm2 logs"
    exit 1
fi