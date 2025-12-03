#!/bin/bash
# Debug VPS Server Crash
# Run this to find out why the server is crashing

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  Debugging Server Crash                                    ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

cd /root/matrix-delivery/backend

# 1. Check if .env file exists and has correct name
echo "1. Checking .env file..."
if [ -f ".env" ]; then
    echo "   ✅ .env exists"
    ls -lh .env
else
    echo "   ❌ .env NOT found"
fi

if [ -f ".env.production" ]; then
    echo "   ⚠️  .env.production exists (should be renamed to .env)"
    echo "   Renaming..."
    mv .env.production .env
    chmod 600 .env
fi
echo ""

# 2. Check for required environment variables
echo "2. Checking required environment variables in .env..."
for var in JWT_SECRET JWT_REFRESH_SECRET ENCRYPTION_KEY CORS_ORIGIN DB_PASSWORD; do
    if grep -q "^${var}=" .env 2>/dev/null; then
        echo "   ✅ $var is set"
    else
        echo "   ❌ $var is MISSING"
    fi
done
echo ""

# 3. Check if TypeScript files are compiled
echo "3. Checking compiled JavaScript files..."
for file in utils/tokenManager.js utils/encryption.js middleware/security.js middleware/auditLogger.js; do
    if [ -f "$file" ]; then
        echo "   ✅ $file exists"
    else
        echo "   ❌ $file MISSING - needs compilation"
    fi
done
echo ""

# 4. Try to run server directly to see the actual error
echo "4. Running server directly to see error..."
echo "   (Press Ctrl+C after you see the error)"
echo ""
NODE_ENV=production node server.js
