#!/bin/bash
# === Matrix Delivery Frontend Firebase Deploy Script ===
# Build & deploy React frontend to Firebase Hosting

set -e  # Exit on error

FRONTEND_DIR="./frontend"

echo "🚀 Starting Firebase frontend deployment..."

# Step 1: Go to frontend folder
cd "$FRONTEND_DIR"

echo "📦 Installing dependencies..."
npm ci --silent

echo "🏗️ Building project..."
npm run build

echo "🔥 Deploying to Firebase hosting..."
firebase deploy --only hosting

echo "✅ Frontend deployed to Firebase successfully!"
cd ..
