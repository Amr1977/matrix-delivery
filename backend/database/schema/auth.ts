import { TableSchema } from '../types';

/**
 * Password reset tokens table schema
 * Stores tokens for password reset functionality
 */
export const passwordResetTokensSchema: TableSchema = {
    name: 'password_reset_tokens',

    createStatement: `
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id VARCHAR(255) PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token VARCHAR(255) UNIQUE NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      used BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `,

    indexes: [
        'CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token)',
        'CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at)'
    ]
};

/**
 * Email verification tokens table schema
 * Stores tokens for email verification
 */
export const emailVerificationTokensSchema: TableSchema = {
    name: 'email_verification_tokens',

    createStatement: `
    CREATE TABLE IF NOT EXISTS email_verification_tokens (
      id VARCHAR(255) PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token VARCHAR(255) UNIQUE NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      used BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `,

    indexes: [
        'CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id ON email_verification_tokens(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token ON email_verification_tokens(token)',
        'CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_expires_at ON email_verification_tokens(expires_at)'
    ]
};

/**
 * User favorites table schema
 * Stores favorite drivers/customers for users
 */
export const userFavoritesSchema: TableSchema = {
    name: 'user_favorites',

    createStatement: `
    CREATE TABLE IF NOT EXISTS user_favorites (
      user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      favorite_user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, favorite_user_id)
    )
  `,

    indexes: []
};

/**
 * User payment methods table schema
 * Stores saved payment methods for users
 */
export const userPaymentMethodsSchema: TableSchema = {
    name: 'user_payment_methods',

    createStatement: `
    CREATE TABLE IF NOT EXISTS user_payment_methods (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      payment_method_type VARCHAR(50) NOT NULL CHECK (payment_method_type IN ('credit_card', 'debit_card', 'paypal', 'bank_account')),
      provider VARCHAR(50) NOT NULL DEFAULT 'stripe',
      provider_token VARCHAR(255),
      last_four VARCHAR(4),
      expiry_month INTEGER,
      expiry_year INTEGER,
      is_default BOOLEAN DEFAULT false,
      is_verified BOOLEAN DEFAULT false,
      metadata JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, provider_token)
    )
  `,

    indexes: []
};
