const { Client } = require('pg');
require('dotenv').config({ path: '.env.testing' });

const DB_CONFIG = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    password: process.env.DB_PASSWORD || 'be_the_one',
    port: process.env.DB_PORT || 5432,
};

const DB_NAME = process.env.DB_NAME_TEST || 'matrix_delivery_test';

async function setupTestDb() {
    console.log('🔧 Setting up test database...');

    // Connect to default 'postgres' database to drop/create target DB
    const client = new Client({
        ...DB_CONFIG,
        database: 'postgres',
    });

    try {
        await client.connect();
        console.log('✅ Connected to PostgreSQL');

        // Drop database if exists
        console.log(`📦 Dropping database ${DB_NAME} if exists...`);
        await client.query(`DROP DATABASE IF EXISTS "${DB_NAME}"`);

        // Create database
        console.log(`📦 Creating database ${DB_NAME}...`);
        await client.query(`CREATE DATABASE "${DB_NAME}"`);
        console.log('✅ Database created');
    } catch (err) {
        console.error('❌ Error creating database:', err);
        process.exit(1);
    } finally {
        await client.end();
    }

    // Connect to the new database to create schema
    const dbClient = new Client({
        ...DB_CONFIG,
        database: DB_NAME,
    });

    try {
        await dbClient.connect();
        console.log(`🔌 Connected to ${DB_NAME}`);

        console.log('🔄 Creating schema...');

        const schema = `
      -- Users table
      CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255),
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          phone VARCHAR(50),
          primary_role VARCHAR(50) NOT NULL,
          roles TEXT[],
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

      -- Orders table
      CREATE TABLE IF NOT EXISTS orders (
          id VARCHAR(255) PRIMARY KEY,
          order_number VARCHAR(50),
          title VARCHAR(255),
          description TEXT,
          pickup_address TEXT,
          delivery_address TEXT,
          from_lat DECIMAL(10, 8),
          from_lng DECIMAL(11, 8),
          from_name VARCHAR(255),
          to_lat DECIMAL(10, 8),
          to_lng DECIMAL(11, 8),
          to_name VARCHAR(255),
          price DECIMAL(10, 2),
          status VARCHAR(50) NOT NULL,
          customer_id VARCHAR(255) REFERENCES users(id),
          customer_name VARCHAR(255),
          assigned_driver_user_id VARCHAR(255) REFERENCES users(id),
          assigned_driver_name VARCHAR(255),
          assigned_driver_bid_price DECIMAL(10, 2),
          payment_status VARCHAR(50),
          crypto_payment BOOLEAN DEFAULT FALSE,
          crypto_token VARCHAR(255),
          crypto_amount DECIMAL(20, 6),
          total_price DECIMAL(10, 2),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP
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

      -- Payments table
      CREATE TABLE IF NOT EXISTS payments (
          id VARCHAR(255) PRIMARY KEY,
          order_id VARCHAR(255) REFERENCES orders(id),
          payer_id VARCHAR(255) REFERENCES users(id),
          payee_id VARCHAR(255) REFERENCES users(id),
          amount DECIMAL(10, 2) NOT NULL,
          currency VARCHAR(10) DEFAULT 'USD',
          payment_method VARCHAR(50),
          status VARCHAR(50) DEFAULT 'pending',
          stripe_payment_intent_id VARCHAR(255),
          stripe_charge_id VARCHAR(255),
          paypal_order_id VARCHAR(255),
          paypal_capture_id VARCHAR(255),
          platform_fee DECIMAL(10, 2),
          driver_earnings DECIMAL(10, 2),
          updated_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- User payment methods table
      CREATE TABLE IF NOT EXISTS user_payment_methods (
          id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(255) REFERENCES users(id),
          payment_method_type VARCHAR(50),
          provider VARCHAR(50),
          provider_token VARCHAR(255),
          last_four VARCHAR(4),
          expiry_month INTEGER,
          expiry_year INTEGER,
          is_default BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Logs table for comprehensive logging system
      CREATE TABLE IF NOT EXISTS logs (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        level VARCHAR(20) NOT NULL CHECK (level IN ('error', 'warn', 'info', 'debug', 'http')),
        source VARCHAR(20) NOT NULL CHECK (source IN ('frontend', 'backend')),
        category VARCHAR(50),
        message TEXT NOT NULL,
        user_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
        session_id VARCHAR(100),
        url TEXT,
        method VARCHAR(10),
        status_code INTEGER,
        duration_ms INTEGER,
        ip_address VARCHAR(45),
        user_agent TEXT,
        stack_trace TEXT,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_crypto_tx_user ON crypto_transactions(user_id);
      CREATE INDEX IF NOT EXISTS idx_crypto_tx_order ON crypto_transactions(order_id);
      CREATE INDEX IF NOT EXISTS idx_user_wallets_address ON user_wallets(wallet_address);
      CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
      CREATE INDEX IF NOT EXISTS idx_payments_payer ON payments(payer_id);
      CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);
      CREATE INDEX IF NOT EXISTS idx_logs_source ON logs(source);
      CREATE INDEX IF NOT EXISTS idx_logs_category ON logs(category);
      CREATE INDEX IF NOT EXISTS idx_logs_user_id ON logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_logs_session_id ON logs(session_id);
    `;

        await dbClient.query(schema);
        console.log('✅ Schema schema created successfully');

    } catch (err) {
        console.error('❌ Error applying schema:', err);
        process.exit(1);
    } finally {
        await dbClient.end();
    }
}

setupTestDb();
