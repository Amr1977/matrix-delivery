import { TableSchema } from '../types';

/**
 * Payments table schema
 * Stores payment transactions for orders
 */
export const paymentsSchema: TableSchema = {
  name: 'payments',

  createStatement: `
    CREATE TABLE IF NOT EXISTS payments (
      id VARCHAR(255) PRIMARY KEY,
      order_id VARCHAR(255) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      amount DECIMAL(10,2) NOT NULL,
      currency VARCHAR(3) DEFAULT 'USD',
      payment_method VARCHAR(50) CHECK (payment_method IN ('credit_card', 'debit_card', 'paypal', 'bank_transfer', 'cash')),
      status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled')),
      stripe_payment_intent_id VARCHAR(255),
      stripe_charge_id VARCHAR(255),
      paypal_order_id VARCHAR(255),
      paypal_capture_id VARCHAR(255),
      payer_id VARCHAR(255) NOT NULL REFERENCES users(id),
      payee_id VARCHAR(255),
      platform_fee DECIMAL(10,2) DEFAULT 0.00,
      driver_earnings DECIMAL(10,2) DEFAULT 0.00,
      refund_amount DECIMAL(10,2) DEFAULT 0.00,
      refund_reason TEXT,
      metadata JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      processed_at TIMESTAMP,
      refunded_at TIMESTAMP
    )
  `,

  indexes: [
    'CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id)',
    'CREATE INDEX IF NOT EXISTS idx_payments_payer_id ON payments(payer_id)',
    'CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status)',
    'CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC)'
  ]
};

export const walletPaymentsSchema: TableSchema = {
  name: 'wallet_payments',
  createStatement: `
    CREATE TABLE IF NOT EXISTS wallet_payments (
        id SERIAL PRIMARY KEY,
        order_id VARCHAR(50) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        wallet_type VARCHAR(50) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'EGP',
        sender_phone VARCHAR(20),
        sender_name VARCHAR(255),
        transaction_reference VARCHAR(100),
        transfer_timestamp TIMESTAMP,
        recipient_phone VARCHAR(20) NOT NULL,
        recipient_name VARCHAR(255),
        status VARCHAR(20) DEFAULT 'pending',
        confirmed_by VARCHAR(50) REFERENCES users(id),
        confirmed_at TIMESTAMP,
        rejection_reason TEXT,
        sms_forwarded BOOLEAN DEFAULT FALSE,
        sms_content TEXT,
        auto_verified BOOLEAN DEFAULT FALSE,
        notes TEXT,
        screenshot_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT valid_wallet_type CHECK (wallet_type IN ('vodafone_cash', 'instapay', 'orange_cash', 'etisalat_cash', 'we_pay')),
        CONSTRAINT valid_status CHECK (status IN ('pending', 'confirmed', 'rejected', 'disputed')),
        CONSTRAINT positive_amount CHECK (amount > 0)
    )
    `,
  indexes: [
    'CREATE INDEX IF NOT EXISTS idx_wallet_payments_order_id ON wallet_payments(order_id)',
    'CREATE INDEX IF NOT EXISTS idx_wallet_payments_status ON wallet_payments(status)',
    'CREATE INDEX IF NOT EXISTS idx_wallet_payments_wallet_type ON wallet_payments(wallet_type)',
    'CREATE INDEX IF NOT EXISTS idx_wallet_payments_created_at ON wallet_payments(created_at)',
    'CREATE INDEX IF NOT EXISTS idx_wallet_payments_transaction_ref ON wallet_payments(transaction_reference)'
  ]
};
