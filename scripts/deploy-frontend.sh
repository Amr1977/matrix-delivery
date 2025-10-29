#!/bin/bash

# Frontend deployment script for Ubuntu VPS
# This script builds the frontend with production API URL

echo "🚀 Deploying Frontend for Matrix Delivery Platform..."
echo "🏠 Working directory: $(pwd)"

# Check if we're in the project root
if [ ! -d "frontend" ]; then
    echo "❌ Error: Must run from project root directory"
    exit 1
fi

# Navigate to frontend directory
cd frontend

echo "🔧 Building frontend for production..."

# Set production environment variables
export CI=false  # Prevent warnings
export NODE_ENV=production
export REACT_APP_API_URL=https://matrix-api.oldantique50.com/api

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf build

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build the application
echo "🏗️ Building application..."
if npm run build; then
    echo "✅ Frontend build completed successfully"
    echo "📁 Build files are in frontend/build/"
    echo "🌐 API URL set to: $REACT_APP_API_URL"

    # Optionally, display build info
    echo "📊 Build stats:"
    ls -la build/
else
    echo "❌ Frontend build failed"
    exit 1
fi

cd ..

echo ""
echo "════════════════════════════════════════"
echo "✨ Frontend Deployment Complete!"
echo "════════════════════════════════════════"
echo ""
echo "🚀 Next steps:"
echo "   1. Serve the build files using nginx/apache"
echo "   2. Point nginx to serve from frontend/build/"
echo "   3. Configure SSL certificate for HTTPS"
echo ""
echo "📄 nginx example config:"
echo "   location / {"
echo "       root /path/to/frontend/build;"
echo "       index index.html;"
echo "       try_files \$uri \$uri/ /index.html;"
echo "   }"
echo ""
echo "🔧 Don't forget to configure CORS in the API server for your domain!"
