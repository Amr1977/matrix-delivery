#!/bin/bash

echo "🛑 Stopping DeliverHub services..."

# Kill all Node processes
pkill -f "node server"
echo "✅ Backend stopped"

# Kill npm processes
pkill -f "npm start"
echo "✅ Frontend stopped"

echo "✨ All services stopped"