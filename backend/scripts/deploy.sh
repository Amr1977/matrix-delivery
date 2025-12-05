#!/bin/bash
# Backend Deployment Script
# 1. Pull latest changes from master
# 2. Update dependencies
# 3. Reload PM2

echo "🚀 Starting deployment..."

# Go to project root (assuming script is in backend/scripts/ or similar)
cd "$(dirname "$0")/../.."

# 1. Pull changes
echo "📥 Pulling latest changes from master..."
git fetch origin master
git reset --hard origin/master

# 2. Update backend dependencies
echo "📦 Updating backend dependencies..."
cd backend
npm ci --production

# 3. Reload PM2
echo "🔄 Reloading PM2 processes..."
# Reload ecosystem if it exists, otherwise just reload all
if [ -f "ecosystem.config.js" ]; then
  pm2 reload ecosystem.config.js
else
  pm2 reload all
fi

echo "✅ Deployment complete!"
