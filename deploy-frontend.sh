#!/bin/bash
# === Matrix Delivery Frontend Deploy Script ===
# Build & deploy React frontend to Apache web root

set -e  # Exit on error

FRONTEND_DIR="/root/matrix-delivery/frontend"
WEB_ROOT="/var/www/matrix-delivery"

echo "🚀 Starting frontend deployment..."

# Step 1: Go to frontend folder
cd "$FRONTEND_DIR"

echo "📦 Installing dependencies..."
npm ci --silent

echo "🏗️ Building project..."
# Set production API URL
export REACT_APP_API_URL=https://matrix-api.oldantique50.com/api
export NODE_ENV=production
export CI=false
npm run build

# Step 2: Remove old build
if [ -d "$WEB_ROOT" ]; then
  echo "🧹 Removing old files from $WEB_ROOT..."
    rm -rf "$WEB_ROOT"/*
    else
      echo "📁 Creating web root directory..."
        mkdir -p "$WEB_ROOT"
        fi

        # Step 3: Copy new build
        echo "📤 Copying new build to $WEB_ROOT..."
        cp -r build/* "$WEB_ROOT"/

        # Step 4: Fix permissions
        echo "🔒 Setting permissions..."
        chown -R www-data:www-data "$WEB_ROOT"
        find "$WEB_ROOT" -type d -exec chmod 755 {} \;
        find "$WEB_ROOT" -type f -exec chmod 644 {} \;

        # Step 5: Restart Apache (optional)
        echo "🔁 Restarting Apache..."
        systemctl restart apache2

        echo "✅ Frontend deployed successfully!"
