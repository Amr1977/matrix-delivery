/**
 * Payment Configuration
 * Centralized configuration for all payment-related settings
 */

export const PAYMENT_CONFIG = {
    // Platform commission rate (as decimal)
    COMMISSION_RATE: 0.15, // 15%

    // Calculated values (derived from COMMISSION_RATE)
    get COMMISSION_RATE_PERCENT() { return this.COMMISSION_RATE * 100; },  // 15
    get COMMISSION_RATE_BASIS_POINTS() { return this.COMMISSION_RATE * 10000; },  // 1500

    // Debt Management Configuration
    DEBT_MANAGEMENT: {
        MAX_DEBT_THRESHOLD: -200,      // Maximum debt allowed (EGP) - drivers blocked beyond this
        WARNING_THRESHOLD: -150,        // Warning threshold (EGP) - drivers warned at this level
        BLOCK_NEW_ORDERS: true,         // Block drivers from accepting orders when debt exceeded
        ALLOW_NEGATIVE_BALANCE: true,   // Allow balance to go negative (creates debt)
    },

    // Minimum order amount for digital payments (EGP)
    MIN_DIGITAL_PAYMENT_AMOUNT: 5,

    // Payment processing fees
    FEES: {
        CARD: 0.025,      // 2.5%
        WALLET: 0.025,    // 2.5%
        CRYPTO: 0,        // No processing fee (only gas)
        COD: 0,           // Free
    },

    // Currency settings
    DEFAULT_CURRENCY: 'EGP',
    SUPPORTED_CURRENCIES: ['EGP', 'USD', 'EUR'],

    // Payment method settings
    PAYMENT_METHODS: {
        CARD: {
            enabled: true,
            name: 'Credit/Debit Card',
            fee: 0.025,
            minAmount: 5,
        },
        WALLET: {
            enabled: true,
            name: 'Mobile Wallet',
            fee: 0.025,
            minAmount: 5,
        },
        CRYPTO: {
            enabled: true,
            name: 'Cryptocurrency',
            fee: 0,
            minAmount: 5,
            supportedTokens: ['USDC', 'USDT'],
        },
        COD: {
            enabled: true,
            name: 'Cash on Delivery',
            fee: 0,
            minAmount: 0,
        },
    },

    // Timeout settings (milliseconds)
    TIMEOUTS: {
        PAYMENT_INTENT_EXPIRY: 3600000,  // 1 hour
        AUTH_TOKEN_EXPIRY: 3600000,      // 1 hour
    },
} as const;

/**
 * Get commission rate as percentage (for display)
 * @returns Commission rate as percentage (e.g., 15)
 */
export function getCommissionRatePercent(): number {
    return PAYMENT_CONFIG.COMMISSION_RATE * 100;
}

/**
 * Get commission rate in basis points (for smart contracts)
 * @returns Commission rate in basis points (e.g., 1500)
 */
export function getCommissionRateBasisPoints(): number {
    return PAYMENT_CONFIG.COMMISSION_RATE * 10000;
}

/**
 * Calculate platform commission
 * @param amount - Order amount
 * @param rate - Optional custom commission rate (defaults to PAYMENT_CONFIG.COMMISSION_RATE)
 * @returns Object with commission and payout amounts
 */
export function calculateCommission(amount: number, rate: number = PAYMENT_CONFIG.COMMISSION_RATE) {
    const commission = amount * rate;
    const payout = amount - commission;

    return {
        commission: parseFloat(commission.toFixed(2)),
        payout: parseFloat(payout.toFixed(2)),
        rate,
    };
}

/**
 * Calculate payment processing fee
 * @param amount - Order amount
 * @param paymentMethod - Payment method type
 * @returns Fee amount
 */
export function calculatePaymentFee(amount: number, paymentMethod: 'card' | 'wallet' | 'crypto' | 'cod'): number {
    const feeRate = PAYMENT_CONFIG.FEES[paymentMethod.toUpperCase() as keyof typeof PAYMENT_CONFIG.FEES] || 0;
    return parseFloat((amount * feeRate).toFixed(2));
}

/**
 * Calculate total amount including fees
 * @param amount - Base amount
 * @param paymentMethod - Payment method type
 * @returns Total amount with fees
 */
export function calculateTotalWithFees(amount: number, paymentMethod: 'card' | 'wallet' | 'crypto' | 'cod'): number {
    const fee = calculatePaymentFee(amount, paymentMethod);
    return parseFloat((amount + fee).toFixed(2));
}

/**
 * Validate payment amount
 * @param amount - Amount to validate
 * @param paymentMethod - Payment method type
 * @returns Validation result
 */
export function validatePaymentAmount(amount: number, paymentMethod: 'card' | 'wallet' | 'crypto' | 'cod'): {
    valid: boolean;
    error?: string;
} {
    if (amount <= 0) {
        return { valid: false, error: 'Amount must be greater than 0' };
    }

    const methodConfig = PAYMENT_CONFIG.PAYMENT_METHODS[paymentMethod.toUpperCase() as keyof typeof PAYMENT_CONFIG.PAYMENT_METHODS];

    if (!methodConfig.enabled) {
        return { valid: false, error: `${methodConfig.name} is currently disabled` };
    }

    if (amount < methodConfig.minAmount) {
        return { valid: false, error: `Minimum amount for ${methodConfig.name} is ${methodConfig.minAmount} ${PAYMENT_CONFIG.DEFAULT_CURRENCY}` };
    }

    return { valid: true };
}
