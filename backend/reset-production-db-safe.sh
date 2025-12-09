#!/bin/bash

# Safe Production Database Reset Script
# This will drop and recreate the production database

set -e

echo "⚠️  WARNING: This will DROP the entire production database!"
echo "⚠️  All data will be LOST!"
echo ""
read -p "Type 'YES I UNDERSTAND' to continue: " confirmation

if [ "$confirmation" != "YES I UNDERSTAND" ]; then
    echo "❌ Aborted"
    exit 1
fi

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "❌ Error: .env file not found!"
    exit 1
fi

DB_NAME="${DB_NAME:-matrix_delivery_prod}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

echo ""
echo "📋 Database Configuration:"
echo "   Host: $DB_HOST"
echo "   Port: $DB_PORT"
echo "   Database: $DB_NAME"
echo "   User: $DB_USER"
echo ""

# Stop PM2 processes
echo "1️⃣  Stopping PM2 processes..."
pm2 stop ecosystem.config.js || true

# Drop database
echo "2️⃣  Dropping database $DB_NAME..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres << EOF
DROP DATABASE IF EXISTS $DB_NAME;
EOF

# Create database
echo "3️⃣  Creating database $DB_NAME..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres << EOF
CREATE DATABASE $DB_NAME;
EOF

# Enable PostGIS extension
echo "4️⃣  Enabling PostGIS extension..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << EOF
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
EOF

echo ""
echo "✅ Database reset complete!"
echo ""
echo "5️⃣  Starting PM2 processes..."
pm2 start ecosystem.config.js --env production

echo ""
echo "6️⃣  Watching logs..."
pm2 logs --lines 50
