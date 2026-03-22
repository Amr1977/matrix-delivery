/**
 * Payment Configuration (JS Version)
 */

const PAYMENT_CONFIG = {
  // Platform commission rate (as decimal) - 10% for COD orders
  COMMISSION_RATE: 0.1, // 10%

  // Minimum bid amount for couriers (LE)
  MINIMUM_BID_AMOUNT: 10, // 10 LE minimum bid

  // Calculated values (as properties)
  get COMMISSION_RATE_PERCENT() {
    return this.COMMISSION_RATE * 100;
  }, // 10
  get COMMISSION_RATE_BASIS_POINTS() {
    return this.COMMISSION_RATE * 10000;
  }, // 1000

  // Debt Management Configuration - COD Model
  DEBT_MANAGEMENT: {
    MAX_DEBT_THRESHOLD: -100, // Maximum debt allowed (EGP) - drivers blocked beyond this
    WARNING_THRESHOLD: -80, // Warning threshold (EGP) - drivers warned at this level
    BLOCK_NEW_ORDERS: true, // Block drivers from accepting orders when debt exceeded
    ALLOW_NEGATIVE_BALANCE: true, // Allow balance to go negative (creates debt)
  },

  // Minimum order amount for digital payments (EGP)
  MIN_DIGITAL_PAYMENT_AMOUNT: 5,

  // Payment processing fees
  FEES: {
    CARD: 0.025, // 2.5%
    WALLET: 0.025, // 2.5%
    CRYPTO: 0, // No processing fee (only gas)
    COD: 0, // Free
  },

  // Currency settings
  DEFAULT_CURRENCY: "EGP",
  SUPPORTED_CURRENCIES: ["EGP", "USD", "EUR"],

  // Payment method settings
  PAYMENT_METHODS: {
    CARD: {
      enabled: true,
      name: "Credit/Debit Card",
      fee: 0.025,
      minAmount: 5,
    },
    WALLET: {
      enabled: true,
      name: "Mobile Wallet",
      fee: 0.025,
      minAmount: 5,
    },
    CRYPTO: {
      enabled: true,
      name: "Cryptocurrency",
      fee: 0,
      minAmount: 5,
      supportedTokens: ["USDC", "USDT"],
    },
    COD: {
      enabled: true,
      name: "Cash on Delivery",
      fee: 0,
      minAmount: 0,
    },
  },

  // Timeout settings (milliseconds)
  TIMEOUTS: {
    PAYMENT_INTENT_EXPIRY: 3600000, // 1 hour
    AUTH_TOKEN_EXPIRY: 3600000, // 1 hour
  },
};

/**
 * Calculate platform commission
 * @param {number} amount - Order amount
 * @param {number} rate - Optional custom commission rate (defaults to PAYMENT_CONFIG.COMMISSION_RATE)
 * @returns {Object} Object with commission and payout amounts
 */
const calculateCommission = (amount, rate = PAYMENT_CONFIG.COMMISSION_RATE) => {
  const commission = amount * rate;
  const payout = amount - commission;

  return {
    commission: parseFloat(commission.toFixed(2)),
    payout: parseFloat(payout.toFixed(2)),
    rate,
  };
};

/**
 * Calculate payment processing fee
 * @param {number} amount - Transaction amount
 * @param {string} method - Payment method (card, wallet, crypto, cod)
 * @returns {number} Fee amount
 */
const calculatePaymentFee = (amount, method) => {
  const methodKey = method.toUpperCase();
  const feeRate = PAYMENT_CONFIG.FEES[methodKey] || 0;
  const fee = amount * feeRate;
  return parseFloat(fee.toFixed(2));
};

/**
 * Calculate total amount including fees
 * @param {number} amount - Base amount
 * @param {string} method - Payment method
 * @returns {number} Total amount
 */
const calculateTotalWithFees = (amount, method) => {
  const fee = calculatePaymentFee(amount, method);
  const total = amount + fee;
  return parseFloat(total.toFixed(2));
};

/**
 * Validate payment amount for method
 * @param {number} amount - Transaction amount
 * @param {string} method - Payment method
 * @returns {Object} Validation result { valid: boolean, error: string }
 */
const validatePaymentAmount = (amount, method) => {
  const methodKey = method.toUpperCase();
  const config = PAYMENT_CONFIG.PAYMENT_METHODS[methodKey];

  if (amount <= 0) {
    return { valid: false, error: "Amount must be greater than 0" };
  }

  if (config && amount < config.minAmount) {
    return { valid: false, error: `Minimum amount is ${config.minAmount}` };
  }

  return { valid: true };
};

module.exports = {
  PAYMENT_CONFIG,
  calculateCommission,
  calculatePaymentFee,
  calculateTotalWithFees,
  validatePaymentAmount,
};
