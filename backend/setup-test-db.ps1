# Test Database Setup Script
# Creates test database and runs migrations

Write-Host "Setting up test database..."

# Database configuration
$DB_NAME = "matrix_delivery_test"
$DB_USER = "postgres"
$DB_PASSWORD = "be_the_one"

# Check if psql is available
if (!(Get-Command psql -ErrorAction SilentlyContinue)) {
    Write-Host "PostgreSQL (psql) not found in PATH"
    Write-Host "Please ensure PostgreSQL is installed and psql is in your PATH"
    exit 1
}

Write-Host "PostgreSQL found"

# Drop existing test database if it exists
Write-Host "Dropping existing test database (if exists)..."
$env:PGPASSWORD = $DB_PASSWORD
psql -U $DB_USER -c "DROP DATABASE IF EXISTS $DB_NAME;" 2>$null

# Create test database
Write-Host "Creating test database: $DB_NAME..."
psql -U $DB_USER -c "CREATE DATABASE $DB_NAME;"

if ($LASTEXITCODE -eq 0) {
    Write-Host "Test database created successfully"
}
else {
    Write-Host "Failed to create test database"
    exit 1
}

# Run migrations
Write-Host "Running migrations..."

# Check if migrations directory exists
if (Test-Path "migrations") {
    $migrationFiles = Get-ChildItem -Path "migrations" -Filter "*.sql" | Sort-Object Name
    
    foreach ($file in $migrationFiles) {
        Write-Host "  Running: $($file.Name)..."
        psql -U $DB_USER -d $DB_NAME -f $file.FullName
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  $($file.Name) completed"
        }
        else {
            Write-Host "  $($file.Name) had warnings (may be normal)"
        }
    }
}
else {
    Write-Host "No migrations directory found"
    Write-Host "Creating basic schema..."
    
    # Create basic tables needed for tests
    $schema = @"
-- Users table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    primary_role VARCHAR(50) NOT NULL,
    granted_roles TEXT[],
    vehicle_type VARCHAR(50),
    country VARCHAR(100),
    city VARCHAR(100),
    area VARCHAR(100),
    rating DECIMAL(3, 2) DEFAULT 5.00,
    completed_deliveries INTEGER DEFAULT 0,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP,
    is_available BOOLEAN DEFAULT TRUE,
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

-- Password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) REFERENCES users(id),
    token VARCHAR(255) NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email verification tokens table
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) REFERENCES users(id),
    token VARCHAR(255) NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP NOT NULL,
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
Write-Host "Test database setup complete!"
Write-Host ""
Write-Host "Database: $DB_NAME"
Write-Host "Connection: postgresql://${DB_USER}:****@localhost:5432/$DB_NAME"
Write-Host ""
Write-Host "You can now run tests with: npm test"
Write-Host ""

# Clean up
$env:PGPASSWORD = $null
