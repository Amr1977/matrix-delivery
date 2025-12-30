/**
 * Balance System - Type Definitions (JS Version)
 */

// Supported currencies
const Currency = {
    EGP: 'EGP',
    USD: 'USD',
    EUR: 'EUR',
    SAR: 'SAR',
    AED: 'AED',
};

// Transaction types
const TransactionType = {
    DEPOSIT: 'deposit',
    WITHDRAWAL: 'withdrawal',
    ORDER_PAYMENT: 'order_payment',
    ORDER_REFUND: 'order_refund',
    EARNINGS: 'earnings',
    COMMISSION_DEDUCTION: 'commission_deduction',
    BONUS: 'bonus',
    CASHBACK: 'cashback',
    PENALTY: 'penalty',
    ADJUSTMENT: 'adjustment',
    HOLD: 'hold',
    RELEASE: 'release',
    FEE: 'fee',
    REVERSAL: 'reversal',
};

// Transaction status
const TransactionStatus = {
    PENDING: 'pending',
    COMPLETED: 'completed',
    FAILED: 'failed',
    REVERSED: 'reversed',
    CANCELLED: 'cancelled',
};

// Hold status
const HoldStatus = {
    ACTIVE: 'active',
    RELEASED: 'released',
    CAPTURED: 'captured',
    EXPIRED: 'expired',
    CANCELLED: 'cancelled',
};

// Default balance limits
const DEFAULT_LIMITS = {
    DAILY_WITHDRAWAL: 5000,
    MONTHLY_WITHDRAWAL: 50000,
    MINIMUM_BALANCE: 0,
    MAX_HOLD_DURATION_HOURS: 72,
};

// Transaction amount limits
const TRANSACTION_LIMITS = {
    MIN_DEPOSIT: 1,
    MAX_DEPOSIT: 100000,
    MIN_WITHDRAWAL: 10,
    MAX_WITHDRAWAL: 50000,
    MIN_TRANSFER: 1,
    MAX_TRANSFER: 10000,
};

const DEFAULT_CURRENCY = Currency.EGP;

module.exports = {
    Currency,
    TransactionType,
    TransactionStatus,
    HoldStatus,
    DEFAULT_LIMITS,
    TRANSACTION_LIMITS,
    DEFAULT_CURRENCY
};
