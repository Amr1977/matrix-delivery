#!/bin/bash
# GitHub Webhook Handler for Automated Deployment
# This script is triggered by GitHub webhooks on push to master

set -e  # Exit on error

# Configuration
REPO_DIR="/root/matrix-delivery"
LOG_FILE="/var/log/matrix-deploy.log"
BRANCH="master"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "========== Deployment Started =========="

# Navigate to repository
cd "$REPO_DIR" || exit 1

# Pull latest changes
log "📥 Pulling latest changes from GitHub..."
git fetch origin
git reset --hard origin/$BRANCH

# Install backend dependencies
log "📦 Installing backend dependencies..."
cd backend
npm install --production

# Restart backend with PM2
log "🔄 Restarting backend with PM2..."
pm2 restart matrix-delivery-backend

# Wait for backend to start
sleep 3

# Check if backend is running
if pm2 list | grep -q "matrix-delivery-backend.*online"; then
    log "✅ Backend deployed successfully"
else
    log "❌ Backend deployment failed"
    pm2 logs matrix-delivery-backend --lines 50
    exit 1
fi

# Install frontend dependencies and build
log "📦 Installing frontend dependencies..."
cd ../frontend
npm install

log "🏗️  Building frontend..."
npm run build:prod

# Deploy frontend to Firebase (if configured)
if command -v firebase &> /dev/null; then
    log "🚀 Deploying frontend to Firebase..."
    firebase deploy --only hosting
    log "✅ Frontend deployed successfully"
else
    log "⚠️  Firebase CLI not found, skipping frontend deployment"
fi

log "========== Deployment Complete =========="
log ""

# Send notification (optional - requires notification setup)
# curl -X POST "http://localhost:5000/api/admin/notifications" \
#   -H "Content-Type: application/json" \
#   -d '{"message": "Deployment completed successfully"}'
