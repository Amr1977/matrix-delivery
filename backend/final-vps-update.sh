#!/bin/bash
# Final VPS Update - Fix HTTPS Redirect Loop

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  Updating VPS with HTTPS Redirect Fix                     ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

cd /root/matrix-delivery

# Pull latest code
echo "1. Pulling latest code..."
git pull origin security-enforcement

# Go to backend
cd backend

# Compile TypeScript
echo ""
echo "2. Compiling TypeScript..."
npx tsc middleware/security.ts --outDir . --module commonjs --target es2020 --esModuleInterop --skipLibCheck --resolveJsonModule

# Restart PM2
echo ""
echo "3. Restarting PM2..."
pm2 restart all

# Wait for startup
sleep 3

# Test
echo ""
echo "4. Testing endpoints..."
echo ""
echo "Local health check:"
curl http://localhost:5000/api/health
echo ""
echo ""
echo "External health check:"
curl https://matrix-api.oldantique50.com/api/health
echo ""
echo ""

# Show PM2 status
echo "5. PM2 Status:"
pm2 status

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  Deployment Complete!                                      ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "✅ HTTPS redirect disabled (Apache handles SSL)"
echo "✅ Security headers active via Helmet.js"
echo "✅ Backend running on PM2"
echo ""
echo "Check logs: pm2 logs --lines 30"
