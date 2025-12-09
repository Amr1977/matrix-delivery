#!/bin/bash

# PostgreSQL Service Starter
# Finds and starts the correct PostgreSQL version

echo "🔍 Finding PostgreSQL services..."

# List all PostgreSQL services
systemctl list-units --type=service | grep postgresql

echo ""
echo "📋 Checking PostgreSQL versions installed..."
ls -la /etc/postgresql/

echo ""
echo "🚀 Starting PostgreSQL..."

# Try to start the specific version (usually postgresql@14 or postgresql@15)
if systemctl list-units --type=service | grep -q "postgresql@"; then
    VERSION=$(systemctl list-units --type=service | grep "postgresql@" | head -1 | sed 's/.*postgresql@\([0-9]*\).*/\1/')
    echo "Found PostgreSQL version: $VERSION"
    sudo systemctl start postgresql@$VERSION-main
    sudo systemctl status postgresql@$VERSION-main
else
    # Try generic postgresql service
    sudo systemctl start postgresql
    sudo systemctl status postgresql
fi

echo ""
echo "✅ Checking if PostgreSQL is now listening..."
sudo netstat -tlnp | grep 5432 || echo "❌ PostgreSQL not listening on port 5432"
