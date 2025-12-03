#!/bin/bash
# VPS Deployment - Final Steps
# Run this on your VPS after pulling code and uploading .env

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  Matrix Delivery - VPS Deployment                          ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Step 1: Verify we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Not in backend directory"
    echo "Please run: cd /root/matrix-delivery/backend"
    exit 1
fi

echo "✅ In correct directory: $(pwd)"
echo ""

# Step 2: Secure .env file
echo "1. Securing .env file..."
if [ -f ".env" ]; then
    chmod 600 .env
    echo "   ✅ .env permissions set to 600"
else
    echo "   ❌ .env file not found!"
    echo "   Please upload it with:"
    echo "   scp -P 2222 backend/.env.production root@matrix-api.oldantique50.com:/root/matrix-delivery/backend/.env"
    exit 1
fi
echo ""

# Step 3: Install dependencies
echo "2. Installing npm packages..."
npm install
echo "   ✅ Dependencies installed"
echo ""

# Step 4: Compile TypeScript
echo "3. Compiling TypeScript security utilities..."
npx tsc utils/tokenManager.ts utils/encryption.ts middleware/security.ts middleware/auditLogger.ts \
    --outDir . \
    --module commonjs \
    --target es2020 \
    --esModuleInterop \
    --skipLibCheck \
    --resolveJsonModule

if [ $? -eq 0 ]; then
    echo "   ✅ TypeScript compiled successfully"
    echo ""
    echo "   Compiled files:"
    ls -lh utils/tokenManager.js utils/encryption.js middleware/security.js middleware/auditLogger.js
else
    echo "   ❌ TypeScript compilation failed"
    exit 1
fi
echo ""

# Step 5: Check PM2 status
echo "4. Checking PM2 status..."
if command -v pm2 &> /dev/null; then
    echo "   ✅ PM2 is installed"
    echo ""
    echo "   Current PM2 processes:"
    pm2 list
else
    echo "   ❌ PM2 not found. Installing..."
    npm install -g pm2
    echo "   ✅ PM2 installed"
fi
echo ""

# Step 6: Restart backend
echo "5. Restarting backend..."
pm2 restart ecosystem.config.js --env production

if [ $? -eq 0 ]; then
    echo "   ✅ Backend restarted successfully"
else
    echo "   ⚠️  Restart failed, trying to start fresh..."
    pm2 start ecosystem.config.js --env production
    pm2 save
fi
echo ""

# Step 7: Wait for startup
echo "6. Waiting for server to start..."
sleep 3
echo ""

# Step 8: Check logs
echo "7. Checking server logs..."
pm2 logs --lines 20 --nostream

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  Deployment Complete - Running Verification                ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Step 9: Verify health endpoint
echo "8. Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s http://localhost:5000/api/health)

if [ $? -eq 0 ]; then
    echo "   ✅ Health endpoint responding"
    echo "   Response: $HEALTH_RESPONSE"
else
    echo "   ❌ Health endpoint not responding"
    echo "   Check logs with: pm2 logs"
fi
echo ""

# Step 10: Check security headers
echo "9. Checking security headers..."
echo ""
curl -I https://matrix-api.oldantique50.com/api/health 2>/dev/null | grep -E "(strict-transport-security|x-frame-options|x-content-type-options|content-security-policy)"

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  Deployment Summary                                        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "✅ Code pulled from git"
echo "✅ Dependencies installed"
echo "✅ TypeScript compiled"
echo "✅ Backend restarted"
echo ""
echo "Next steps:"
echo "1. Test your application: https://matrix-delivery.web.app"
echo "2. Monitor logs: pm2 logs"
echo "3. Check PM2 status: pm2 status"
echo ""
echo "If you see errors, check:"
echo "- pm2 logs --err --lines 50"
echo "- cat /root/matrix-delivery/backend/.env | grep JWT_REFRESH_SECRET"
echo ""
