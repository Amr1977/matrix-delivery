#!/bin/bash

set -e  # Exit on any error

echo "🚀 Starting Matrix Delivery Platform..."
echo "🏠 Working directory: $(pwd)"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "🔍 Checking prerequisites..."
if ! command_exists node; then
    echo "❌ Node.js not found. Please install Node.js first."
    exit 1
fi

if ! command_exists npm; then
    echo "❌ npm not found. Please install npm/Node.js first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"

# Create logs directory if it doesn't exist
mkdir -p logs

# Function to install dependencies if needed
install_deps() {
    local dir=$1
    local name=$2
    echo "🔧 Checking $name dependencies..."
    if [ ! -d "$dir/node_modules" ]; then
        echo "📦 Installing $name dependencies..."
        cd "$dir"
        if ! npm install; then
            echo "❌ Failed to install $name dependencies"
            exit 1
        fi
        cd ..
    else
        echo "✅ $name dependencies already installed"
    fi
}

# Install dependencies
install_deps backend "Backend"
install_deps frontend "Frontend"

# Start Backend
echo "🔧 Starting Backend Server..."
cd backend
export NODE_ENV=production
nohup node server.js > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
echo "✅ Backend PID: $BACKEND_PID"
cd ..

# Wait for backend to start and check health
echo "⏳ Waiting for backend to initialize..."
sleep 3
if ! curl -f http://localhost:5000/api/health > /dev/null 2>&1; then
    echo "⚠️  Warning: Backend health check failed. Check logs."
fi

# Start Frontend
echo "🎨 Starting Frontend Server..."
cd frontend
export CI=false  # Prevent warnings in production
export PORT=3000
export HOST=0.0.0.0
export REACT_APP_API_URL=http://localhost:5000/api
nohup npm start > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "✅ Frontend PID: $FRONTEND_PID"
cd ..

# Wait for frontend to start
echo "⏳ Waiting for frontend to initialize..."
sleep 5

echo ""
echo "════════════════════════════════════════"
echo "✨ Matrix Delivery Platform Started Successfully!"
echo "════════════════════════════════════════"
echo ""
echo "📱 Access your app:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:5000"
echo "   Database: PostgreSQL"
echo ""
echo "🔍 Check logs:"
echo "   tail -f logs/backend.log"
echo "   tail -f logs/frontend.log"
echo ""
echo "🛑 To stop services, run: ./stop_all.sh"
echo ""
echo "⚠️  Note: This script starts development servers."
echo "   For production, use proper deployment with nginx/reverse proxy"
