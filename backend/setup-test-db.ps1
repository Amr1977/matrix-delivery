# Test Database Setup Script
# Creates test database and runs migrations

Write-Host "🔧 Setting up test database..." -ForegroundColor Cyan

# Database configuration
$DB_NAME = "matrix_delivery_test"
$DB_USER = "postgres"
$DB_PASSWORD = "***REDACTED***"

# Check if psql is available
if (!(Get-Command psql -ErrorAction SilentlyContinue)) {
    Write-Host "❌ PostgreSQL (psql) not found in PATH" -ForegroundColor Red
    Write-Host "Please ensure PostgreSQL is installed and psql is in your PATH" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ PostgreSQL found" -ForegroundColor Green

# Drop existing test database if it exists
Write-Host "📦 Dropping existing test database (if exists)..." -ForegroundColor Yellow
$env:PGPASSWORD = $DB_PASSWORD
psql -U $DB_USER -c "DROP DATABASE IF EXISTS $DB_NAME;" 2>$null

# Create test database
Write-Host "📦 Creating test database: $DB_NAME..." -ForegroundColor Cyan
psql -U $DB_USER -c "CREATE DATABASE $DB_NAME;"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Test database created successfully" -ForegroundColor Green
}
else {
    Write-Host "❌ Failed to create test database" -ForegroundColor Red
    exit 1
}

# Run migrations
Write-Host "🔄 Running migrations..." -ForegroundColor Cyan

# Check if migrations directory exists
if (Test-Path "migrations") {
    $migrationFiles = Get-ChildItem -Path "migrations" -Filter "*.sql" | Sort-Object Name
    
    foreach ($file in $migrationFiles) {
        Write-Host "  Running: $($file.Name)..." -ForegroundColor Gray
        psql -U $DB_USER -d $DB_NAME -f $file.FullName
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✅ $($file.Name) completed" -ForegroundColor Green
        }
        else {
            Write-Host "  ⚠️  $($file.Name) had warnings (may be normal)" -ForegroundColor Yellow
        }
    }
}
else {
    Write-Host "⚠️  No migrations directory found" -ForegroundColor Yellow
    Write-Host "Creating basic schema..." -ForegroundColor Cyan
    
    # Create basic tables needed for tests
    $schema = @"
-- Users table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User wallets table
CREATE TABLE IF NOT EXISTS user_wallets (
    user_id VARCHAR(255) PRIMARY KEY REFERENCES users(id),
    wallet_address VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crypto transactions table
CREATE TABLE IF NOT EXISTS crypto_transactions (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) REFERENCES users(id),
    order_id VARCHAR(255),
    transaction_type VARCHAR(50) NOT NULL,
    token_address VARCHAR(255),
    token_symbol VARCHAR(10) NOT NULL,
    amount DECIMAL(20, 6) NOT NULL,
    tx_hash VARCHAR(255),
    block_number INTEGER,
    status VARCHAR(50) DEFAULT 'pending',
    confirmed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders table (minimal for tests)
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(255) PRIMARY KEY,
    customer_id VARCHAR(255) REFERENCES users(id),
    driver_id VARCHAR(255) REFERENCES users(id),
    status VARCHAR(50) NOT NULL,
    crypto_payment BOOLEAN DEFAULT FALSE,
    crypto_token VARCHAR(255),
    crypto_amount DECIMAL(20, 6),
    total_price DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_crypto_tx_user ON crypto_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_crypto_tx_order ON crypto_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_user_wallets_address ON user_wallets(wallet_address);
"@
    
    $schema | psql -U $DB_USER -d $DB_NAME
}

Write-Host ""
Write-Host "✅ Test database setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Database: $DB_NAME" -ForegroundColor Cyan
Write-Host "Connection: postgresql://${DB_USER}:****@localhost:5432/$DB_NAME" -ForegroundColor Cyan
Write-Host ""
Write-Host "You can now run tests with: npm test" -ForegroundColor Yellow
Write-Host ""

# Clean up
$env:PGPASSWORD = $null
