#!/bin/bash

# Production Database Reset and Migration Script
# WARNING: This will DROP and RECREATE the database!
# Only use when there are NO CUSTOMERS (safe for initial deployment)

set -e  # Exit on error

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  Production Database Reset & Migration                     ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "❌ Error: .env file not found!"
    exit 1
fi

# Database configuration
DB_NAME="${DB_NAME:-matrix_delivery}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

echo "📊 Database Configuration:"
echo "   Host: $DB_HOST"
echo "   Port: $DB_PORT"
echo "   Database: $DB_NAME"
echo "   User: $DB_USER"
echo ""

# Confirmation prompt
read -p "⚠️  WARNING: This will DROP the database '$DB_NAME' and recreate it. Continue? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "❌ Deployment cancelled"
    exit 0
fi

echo ""
echo "🗑️  Step 1: Dropping existing database..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"
echo "✅ Database dropped"

echo ""
echo "🆕 Step 2: Creating fresh database..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "CREATE DATABASE $DB_NAME;"
echo "✅ Database created"

echo ""
echo "🔧 Step 3: Installing PostGIS extension..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "CREATE EXTENSION IF NOT EXISTS postgis;"
echo "✅ PostGIS installed"

echo ""
echo "📋 Step 4: Running initial schema..."
if [ -f "schema.sql" ]; then
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f schema.sql
    echo "✅ Schema created"
else
    echo "⚠️  Warning: schema.sql not found, skipping..."
fi

echo ""
echo "🔄 Step 5: Running migrations..."

# Migration 1: Rename role columns
if [ -f "migrations/rename_role_columns.sql" ]; then
    echo "   Running: rename_role_columns.sql"
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f migrations/rename_role_columns.sql
    echo "   ✅ Role columns renamed"
else
    echo "   ⚠️  Migration not found: rename_role_columns.sql"
fi

# Migration 2: Add crypto payments
if [ -f "migrations/add_crypto_payments.sql" ]; then
    echo "   Running: add_crypto_payments.sql"
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f migrations/add_crypto_payments.sql
    echo "   ✅ Crypto payments added"
else
    echo "   ⚠️  Migration not found: add_crypto_payments.sql"
fi

echo ""
echo "✅ Step 6: Verifying database..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "\dt" > /dev/null
echo "✅ Database verified"

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  ✅ Database Reset Complete!                               ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo "1. Restart your backend: pm2 restart ecosystem.config.js --env production"
echo "2. Test API health: curl https://matrix-api.oldantique50.com/api/health"
echo "3. Create test user and verify login"
echo ""
