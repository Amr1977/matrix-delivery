#!/bin/bash

# Mark migrations as already applied
# Use this when your database already has the correct schema
# but the migrations table doesn't know about it

set -e

echo "🔧 Marking migrations as already applied..."

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

echo "Database: $DB_NAME"
echo ""

# Create migrations table if it doesn't exist
echo "1. Creating schema_migrations table..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << EOF
CREATE TABLE IF NOT EXISTS schema_migrations (
  id SERIAL PRIMARY KEY,
  migration_name VARCHAR(255) UNIQUE NOT NULL,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  checksum VARCHAR(64),
  execution_time_ms INTEGER
);
CREATE INDEX IF NOT EXISTS idx_migration_name ON schema_migrations(migration_name);
EOF

echo "✅ Migrations table ready"
echo ""

# Mark migrations as applied
echo "2. Marking migrations as already applied..."

# Migration 1: rename_role_columns.sql
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << EOF
INSERT INTO schema_migrations (migration_name, checksum, execution_time_ms)
VALUES ('rename_role_columns.sql', 'manual_skip', 0)
ON CONFLICT (migration_name) DO NOTHING;
EOF
echo "   ✅ rename_role_columns.sql marked as applied"

# Migration 2: add_crypto_payments.sql
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << EOF
INSERT INTO schema_migrations (migration_name, checksum, execution_time_ms)
VALUES ('add_crypto_payments.sql', 'manual_skip', 0)
ON CONFLICT (migration_name) DO NOTHING;
EOF
echo "   ✅ add_crypto_payments.sql marked as applied"

echo ""
echo "3. Verifying migrations table..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT migration_name, applied_at FROM schema_migrations ORDER BY id;"

echo ""
echo "✅ All migrations marked as applied!"
echo ""
echo "Now restart your server:"
echo "  pm2 restart ecosystem.config.js --env production"
echo ""
