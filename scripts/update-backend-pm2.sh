#!/bin/bash
# PM2 Update and Restart Script for Matrix Delivery Backend
# This script pulls latest code and properly restarts PM2

set -e  # Exit on error

echo "🔄 Updating Matrix Delivery Backend..."

# Navigate to backend directory
cd /root/matrix-delivery/backend

# Pull latest code
echo "📥 Pulling latest code from Git..."
git pull origin master

# Install any new dependencies
echo "📦 Installing dependencies..."
npm install --production

# Stop PM2 process
echo "⏹️  Stopping PM2 process..."
pm2 stop matrix-delivery-backend || true

# Delete PM2 process to clear cache
echo "🗑️  Deleting PM2 process to clear cache..."
pm2 delete matrix-delivery-backend || true

# Start fresh PM2 process
echo "🚀 Starting fresh PM2 process..."
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
echo "💾 Saving PM2 configuration..."
pm2 save

# Show status
echo "✅ Update complete! Current status:"
pm2 status

echo ""
echo "📊 Viewing recent logs (press Ctrl+C to exit)..."
pm2 logs matrix-delivery-backend --lines 20
