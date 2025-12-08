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
