/**
 * Payment Configuration (JS Version)
 */

const PAYMENT_CONFIG = {
    // Platform commission rate (as decimal)
    COMMISSION_RATE: 0.15, // 15%

    // Calculated values (as properties)
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
};

module.exports = { PAYMENT_CONFIG };
