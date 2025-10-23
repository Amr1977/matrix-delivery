#!/bin/bash

echo "🛑 Stopping Matrix Delivery Platform services..."

# Kill all Node processes
pkill -f "node server"
echo "✅ Backend stopped"

# Kill npm processes
pkill -f "npm start"
echo "✅ Frontend stopped"

echo "✨ All Matrix Delivery Platform services stopped"
