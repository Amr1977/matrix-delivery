# Production Database Reset and Migration Script (PowerShell)
# WARNING: This will DROP and RECREATE the database!
# Only use when there are NO CUSTOMERS (safe for initial deployment)

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Production Database Reset & Migration                     ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Load environment variables from .env
if (Test-Path .env) {
    Get-Content .env | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            Set-Item -Path "env:$name" -Value $value
        }
    }
}
else {
    Write-Host "❌ Error: .env file not found!" -ForegroundColor Red
    exit 1
}

# Database configuration
$DB_NAME = if ($env:DB_NAME) { $env:DB_NAME } else { "matrix_delivery" }
$DB_USER = if ($env:DB_USER) { $env:DB_USER } else { "postgres" }
$DB_HOST = if ($env:DB_HOST) { $env:DB_HOST } else { "localhost" }
$DB_PORT = if ($env:DB_PORT) { $env:DB_PORT } else { "5432" }
$DB_PASSWORD = $env:DB_PASSWORD

Write-Host "📊 Database Configuration:" -ForegroundColor Yellow
Write-Host "   Host: $DB_HOST"
Write-Host "   Port: $DB_PORT"
Write-Host "   Database: $DB_NAME"
Write-Host "   User: $DB_USER"
Write-Host ""

# Confirmation prompt
$confirm = Read-Host "⚠️  WARNING: This will DROP the database '$DB_NAME' and recreate it. Continue? (yes/no)"
if ($confirm -ne "yes") {
    Write-Host "❌ Deployment cancelled" -ForegroundColor Red
    exit 0
}

# Set PGPASSWORD environment variable
$env:PGPASSWORD = $DB_PASSWORD

Write-Host ""
Write-Host "🗑️  Step 1: Dropping existing database..." -ForegroundColor Yellow
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"
Write-Host "✅ Database dropped" -ForegroundColor Green

Write-Host ""
Write-Host "🆕 Step 2: Creating fresh database..." -ForegroundColor Yellow
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "CREATE DATABASE $DB_NAME;"
Write-Host "✅ Database created" -ForegroundColor Green

Write-Host ""
Write-Host "🔧 Step 3: Installing PostGIS extension..." -ForegroundColor Yellow
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "CREATE EXTENSION IF NOT EXISTS postgis;"
Write-Host "✅ PostGIS installed" -ForegroundColor Green

Write-Host ""
Write-Host "📋 Step 4: Running initial schema..." -ForegroundColor Yellow
if (Test-Path "schema.sql") {
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f schema.sql
    Write-Host "✅ Schema created" -ForegroundColor Green
}
else {
    Write-Host "⚠️  Warning: schema.sql not found, skipping..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🔄 Step 5: Running migrations..." -ForegroundColor Yellow

# Migration 1: Rename primary_role columns
if (Test-Path "migrations\rename_role_columns.sql") {
    Write-Host "   Running: rename_role_columns.sql"
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f migrations\rename_role_columns.sql
    Write-Host "   ✅ primary_role columns renamed" -ForegroundColor Green
}
else {
    Write-Host "   ⚠️  Migration not found: rename_role_columns.sql" -ForegroundColor Yellow
}

# Migration 2: Add crypto payments
if (Test-Path "migrations\add_crypto_payments.sql") {
    Write-Host "   Running: add_crypto_payments.sql"
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f migrations\add_crypto_payments.sql
    Write-Host "   ✅ Crypto payments added" -ForegroundColor Green
}
else {
    Write-Host "   ⚠️  Migration not found: add_crypto_payments.sql" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ Step 6: Verifying database..." -ForegroundColor Yellow
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "\dt" | Out-Null
Write-Host "✅ Database verified" -ForegroundColor Green

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  ✅ Database Reset Complete!                               ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "1. Restart your backend: pm2 restart ecosystem.config.js --env production"
Write-Host "2. Test API health: curl https://matrix-api.oldantique50.com/api/health"
Write-Host "3. Create test user and verify login"
Write-Host ""
