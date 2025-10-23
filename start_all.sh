#!/bin/bash

echo "🚀 Starting Matrix Delivery Platform..."

# Start Backend
echo "🔧 Starting Backend Server..."
cd ~/matrix-delivery/backend
nohup node server.js > ~/matrix-delivery/logs/backend.log 2>&1 &
BACKEND_PID=$!
echo "✅ Backend PID: $BACKEND_PID"
sleep 2

# Start Frontend
echo "🎨 Starting Frontend Server..."
cd ~/matrix-delivery/frontend
nohup npm start > ~/matrix-delivery/logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "✅ Frontend PID: $FRONTEND_PID"

echo ""
echo "════════════════════════════════════════"
echo "✨ Matrix Delivery Platform Started Successfully!"
echo "════════════════════════════════════════"
echo ""
echo "📱 Access your app:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:5000"
echo "   Database: SQLite (matrix-delivery.db)"
echo ""
echo "🔍 Check logs:"
echo "   tail -f ~/matrix-delivery/logs/backend.log"
echo "   tail -f ~/matrix-delivery/logs/frontend.log"
echo ""
