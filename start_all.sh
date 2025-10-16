#!/bin/bash

echo "🚀 Starting DeliverHub..."

# Start Backend
echo "🔧 Starting Backend Server..."
cd ~/deliverhub/backend
nohup node server.js > ~/deliverhub/logs/backend.log 2>&1 &
BACKEND_PID=$!
echo "✅ Backend PID: $BACKEND_PID"
sleep 2

# Start Frontend
echo "🎨 Starting Frontend Server..."
cd ~/deliverhub/frontend
nohup npm start > ~/deliverhub/logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "✅ Frontend PID: $FRONTEND_PID"

echo ""
echo "════════════════════════════════════════"
echo "✨ DeliverHub Started Successfully!"
echo "════════════════════════════════════════"
echo ""
echo "📱 Access your app:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:5000"
echo "   Database: SQLite (deliverhub.db)"
echo ""
echo "🔍 Check logs:"
echo "   tail -f ~/deliverhub/logs/backend.log"
echo "   tail -f ~/deliverhub/logs/frontend.log"
echo ""