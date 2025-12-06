-- Migration: Add Cryptocurrency Payment Support
-- Date: 2025-12-06
-- Description: Add crypto payment fields and wallet management

-- Add crypto payment fields to orders table
ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'crypto',
  ADD COLUMN IF NOT EXISTS crypto_token VARCHAR(100),
  ADD COLUMN IF NOT EXISTS crypto_amount DECIMAL(20, 8),
  ADD COLUMN IF NOT EXISTS blockchain_tx_hash VARCHAR(255),
  ADD COLUMN IF NOT EXISTS escrow_status VARCHAR(50);

-- Add wallet addresses to users table
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS wallet_address VARCHAR(255) UNIQUE,
  ADD COLUMN IF NOT EXISTS wallet_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS wallet_connected_at TIMESTAMP;

-- Create crypto transactions table
CREATE TABLE IF NOT EXISTS crypto_transactions (
  id VARCHAR(255) PRIMARY KEY,
  order_id VARCHAR(255) REFERENCES orders(id) ON DELETE CASCADE,
  user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
  transaction_type VARCHAR(50) NOT NULL, -- deposit, payout, refund, commission
  token_address VARCHAR(255) NOT NULL,
  token_symbol VARCHAR(10) NOT NULL,
  amount DECIMAL(20, 8) NOT NULL,
  tx_hash VARCHAR(255) UNIQUE,
  block_number BIGINT,
  status VARCHAR(50) DEFAULT 'pending', -- pending, confirmed, failed
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  confirmed_at TIMESTAMP,
  metadata JSONB
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_crypto_tx_order ON crypto_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_crypto_tx_user ON crypto_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_crypto_tx_hash ON crypto_transactions(tx_hash);
CREATE INDEX IF NOT EXISTS idx_crypto_tx_status ON crypto_transactions(status);
CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_orders_blockchain_tx ON orders(blockchain_tx_hash);
CREATE INDEX IF NOT EXISTS idx_orders_escrow_status ON orders(escrow_status);

-- Create driver earnings view
CREATE OR REPLACE VIEW driver_crypto_earnings AS
SELECT 
  u.id AS driver_id,
  u.name AS driver_name,
  u.wallet_address,
  ct.token_symbol,
  COUNT(DISTINCT ct.order_id) AS total_orders,
  SUM(ct.amount) AS total_earnings,
  MAX(ct.confirmed_at) AS last_payout
FROM users u
JOIN crypto_transactions ct ON u.id = ct.user_id
WHERE ct.transaction_type = 'payout' AND ct.status = 'confirmed'
GROUP BY u.id, u.name, u.wallet_address, ct.token_symbol;

-- Add comments
COMMENT ON COLUMN orders.payment_method IS 'Payment method: crypto';
COMMENT ON COLUMN orders.crypto_token IS 'Token symbol (USDC, USDT, etc.)';
COMMENT ON COLUMN orders.crypto_amount IS 'Payment amount in token units';
COMMENT ON COLUMN orders.blockchain_tx_hash IS 'Transaction hash on blockchain';
COMMENT ON COLUMN orders.escrow_status IS 'Escrow contract status';
COMMENT ON COLUMN users.wallet_address IS 'Ethereum-compatible wallet address';
COMMENT ON COLUMN users.wallet_verified IS 'Whether wallet ownership is verified';
COMMENT ON TABLE crypto_transactions IS 'All cryptocurrency transactions';

-- Grant permissions (adjust as needed)
-- GRANT SELECT, INSERT, UPDATE ON crypto_transactions TO matrix_delivery_app;
-- GRANT SELECT ON driver_crypto_earnings TO matrix_delivery_app;
