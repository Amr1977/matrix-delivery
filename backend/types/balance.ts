/**
 * Balance System - Type Definitions
 * 
 * Comprehensive TypeScript types and interfaces for the balance system.
 * Provides type safety for all balance operations, transactions, and holds.
 * 
 * @module types/balance
 * @version 1.0.0
 */

// ============================================================================
// ENUMERATIONS
// ============================================================================

/**
 * Supported currencies in the balance system
 */
export enum Currency {
    EGP = 'EGP',  // Egyptian Pound
    USD = 'USD',  // US Dollar
    EUR = 'EUR',  // Euro
    SAR = 'SAR',  // Saudi Riyal
    AED = 'AED',  // UAE Dirham
}

/**
 * Transaction types for balance operations
 */
export enum TransactionType {
    DEPOSIT = 'deposit',                      // User deposits funds
    WITHDRAWAL = 'withdrawal',                // User withdraws funds
    ORDER_PAYMENT = 'order_payment',          // Customer pays for order
    ORDER_REFUND = 'order_refund',            // Refund to customer
    EARNINGS = 'earnings',                    // Driver receives earnings
    COMMISSION_DEDUCTION = 'commission_deduction', // Platform commission
    BONUS = 'bonus',                          // Promotional bonus
    CASHBACK = 'cashback',                    // Cashback reward
    PENALTY = 'penalty',                      // Penalty deduction
    ADJUSTMENT = 'adjustment',                // Manual adjustment
    HOLD = 'hold',                            // Move to held balance
    RELEASE = 'release',                      // Release from held balance
    FEE = 'fee',                              // Platform fee
    REVERSAL = 'reversal',                    // Transaction reversal
}

/**
 * Transaction status values
 */
export enum TransactionStatus {
    PENDING = 'pending',      // Transaction initiated
    COMPLETED = 'completed',  // Successfully completed
    FAILED = 'failed',        // Transaction failed
    REVERSED = 'reversed',    // Transaction reversed
    CANCELLED = 'cancelled',  // Transaction cancelled
}

/**
 * Balance hold status values
 */
export enum HoldStatus {
    ACTIVE = 'active',        // Hold is active
    RELEASED = 'released',    // Funds released
    CAPTURED = 'captured',    // Funds captured
    EXPIRED = 'expired',      // Hold expired
    CANCELLED = 'cancelled',  // Hold cancelled
}

// ============================================================================
// CORE INTERFACES
// ============================================================================

/**
 * User Balance Interface
 * Represents a user's complete balance state
 */
export interface UserBalance {
    userId: number;

    // Balance categories
    availableBalance: number;
    pendingBalance: number;
    heldBalance: number;
    totalBalance: number;

    // Currency
    currency: Currency;

    // Limits
    dailyWithdrawalLimit: number;
    monthlyWithdrawalLimit: number;
    minimumBalance: number;

    // Auto-reload settings
    autoReloadThreshold?: number;
    autoReloadAmount?: number;

    // Statistics
    lifetimeDeposits: number;
    lifetimeWithdrawals: number;
    lifetimeEarnings: number;
    totalTransactions: number;

    // Status
    isActive: boolean;
    isFrozen: boolean;
    freezeReason?: string;
    frozenAt?: Date;
    frozenBy?: number;

    // Metadata
    createdAt: Date;
    updatedAt: Date;
    lastTransactionAt?: Date;
}

/**
 * Balance Transaction Interface
 * Represents a single balance transaction with complete audit trail
 */
export interface BalanceTransaction {
    id: number;
    transactionId: string;
    userId: number;

    // Transaction details
    type: TransactionType;
    amount: number;
    currency: Currency;

    // Balance snapshots
    balanceBefore: number;
    balanceAfter: number;

    // Status
    status: TransactionStatus;

    // Related entities
    orderId?: number;
    walletPaymentId?: number;
    withdrawalRequestId?: number;
    relatedTransactionId?: number;

    // Processing info
    processedAt?: Date;
    processedBy?: number;
    processingMethod?: string;

    // Metadata
    description: string;
    metadata?: Record<string, any>;
    notes?: string;

    // Audit trail
    createdAt: Date;
    updatedAt: Date;
    ipAddress?: string;
    userAgent?: string;
}

/**
 * Balance Hold Interface
 * Represents a temporary hold on user balance
 */
export interface BalanceHold {
    id: number;
    holdId: string;
    userId: number;

    // Hold details
    amount: number;
    currency: Currency;
    reason: string;

    // Related entities
    orderId?: number;
    disputeId?: number;
    transactionId?: number;

    // Status
    status: HoldStatus;

    // Timing
    heldAt: Date;
    expiresAt?: Date;
    releasedAt?: Date;
    releasedBy?: number;

    // Metadata
    description?: string;
    notes?: string;
    metadata?: Record<string, any>;

    createdAt: Date;
    updatedAt: Date;
}

// ============================================================================
// DATA TRANSFER OBJECTS (DTOs)
// ============================================================================

/**
 * DTO for creating a deposit transaction
 */
export interface DepositDTO {
    userId: number;
    amount: number;
    currency?: Currency;
    walletPaymentId?: number;
    description: string;
    metadata?: Record<string, any>;
}

/**
 * DTO for creating a withdrawal transaction
 */
export interface WithdrawalDTO {
    userId: number;
    amount: number;
    currency?: Currency;
    destination: string;
    description: string;
    metadata?: Record<string, any>;
}

/**
 * DTO for order payment
 */
export interface OrderPaymentDTO {
    userId: number;
    orderId: number;
    amount: number;
    currency?: Currency;
    description: string;
    metadata?: Record<string, any>;
}

/**
 * DTO for order refund
 */
export interface OrderRefundDTO {
    userId: number;
    orderId: number;
    amount: number;
    currency?: Currency;
    reason: string;
    metadata?: Record<string, any>;
}

/**
 * DTO for driver earnings
 */
export interface EarningsDTO {
    driverId: number;
    orderId: number;
    amount: number;
    currency?: Currency;
    description: string;
    metadata?: Record<string, any>;
}

/**
 * DTO for creating a balance hold
 */
export interface CreateHoldDTO {
    userId: number;
    amount: number;
    currency?: Currency;
    reason: string;
    orderId?: number;
    expiresAt?: Date;
    description?: string;
    metadata?: Record<string, any>;
}

/**
 * DTO for transaction filters
 */
export interface TransactionFilters {
    userId?: number;
    type?: TransactionType | TransactionType[];
    status?: TransactionStatus | TransactionStatus[];
    startDate?: Date;
    endDate?: Date;
    minAmount?: number;
    maxAmount?: number;
    orderId?: number;
    limit?: number;
    offset?: number;
}

/**
 * DTO for balance statement request
 */
export interface BalanceStatementRequest {
    userId: number;
    startDate: Date;
    endDate: Date;
    includeMetadata?: boolean;
}

// ============================================================================
// RESPONSE INTERFACES
// ============================================================================

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

/**
 * Transaction creation response
 */
export interface TransactionResponse {
    transaction: BalanceTransaction;
    balance: UserBalance;
}

/**
 * Hold creation response
 */
export interface HoldResponse {
    hold: BalanceHold;
    balance: UserBalance;
}

/**
 * Balance statement response
 */
export interface BalanceStatement {
    userId: number;
    period: {
        startDate: Date;
        endDate: Date;
    };
    openingBalance: number;
    closingBalance: number;
    totalDeposits: number;
    totalWithdrawals: number;
    totalEarnings: number;
    totalDeductions: number;
    transactions: BalanceTransaction[];
    currency: Currency;
}

/**
 * Transaction summary response
 */
export interface TransactionSummary {
    userId: number;
    period: {
        startDate: Date;
        endDate: Date;
    };
    totalTransactions: number;
    byType: Record<TransactionType, {
        count: number;
        totalAmount: number;
    }>;
    byStatus: Record<TransactionStatus, number>;
    currency: Currency;
}

// ============================================================================
// VALIDATION INTERFACES
// ============================================================================

/**
 * Balance validation result
 */
export interface BalanceValidation {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

/**
 * Transaction validation result
 */
export interface TransactionValidation {
    isValid: boolean;
    errors: string[];
    canProceed: boolean;
    requiredActions?: string[];
}

// ============================================================================
// SERVICE INTERFACES
// ============================================================================

/**
 * Balance Service Interface
 * Defines the contract for balance operations
 */
export interface IBalanceService {
    // Balance operations
    getBalance(userId: number): Promise<UserBalance>;
    createBalance(userId: number, currency?: Currency): Promise<UserBalance>;

    // Deposit operations
    deposit(dto: DepositDTO): Promise<TransactionResponse>;

    // Withdrawal operations
    withdraw(dto: WithdrawalDTO): Promise<TransactionResponse>;

    // Order operations
    deductForOrder(dto: OrderPaymentDTO): Promise<TransactionResponse>;
    refundForOrder(dto: OrderRefundDTO): Promise<TransactionResponse>;

    // Driver operations
    creditEarnings(dto: EarningsDTO): Promise<TransactionResponse>;
    deductCommission(driverId: number, orderId: number, commission: number): Promise<TransactionResponse>;

    // Hold operations
    createHold(dto: CreateHoldDTO): Promise<HoldResponse>;
    releaseHold(holdId: string): Promise<HoldResponse>;
    captureHold(holdId: string): Promise<TransactionResponse>;

    // Query operations
    getTransactionHistory(filters: TransactionFilters): Promise<BalanceTransaction[]>;
    getBalanceStatement(request: BalanceStatementRequest): Promise<BalanceStatement>;
    getTransactionSummary(userId: number, startDate: Date, endDate: Date): Promise<TransactionSummary>;

    // Validation operations
    validateSufficientBalance(userId: number, amount: number): Promise<boolean>;
    validateWithdrawalLimits(userId: number, amount: number): Promise<BalanceValidation>;

    // Admin operations
    freezeBalance(userId: number, reason: string, adminId: number): Promise<UserBalance>;
    unfreezeBalance(userId: number, adminId: number): Promise<UserBalance>;
    adjustBalance(userId: number, amount: number, reason: string, adminId: number): Promise<TransactionResponse>;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Partial update type for user balance
 */
export type UpdateBalanceDTO = Partial<Pick<UserBalance,
    'dailyWithdrawalLimit' |
    'monthlyWithdrawalLimit' |
    'minimumBalance' |
    'autoReloadThreshold' |
    'autoReloadAmount'
>>;

/**
 * Transaction metadata type
 */
export type TransactionMetadata = {
    source?: string;
    destination?: string;
    reference?: string;
    notes?: string;
    [key: string]: any;
};

/**
 * Hold metadata type
 */
export type HoldMetadata = {
    autoRelease?: boolean;
    releaseCondition?: string;
    [key: string]: any;
};

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default balance limits
 */
export const DEFAULT_LIMITS = {
    DAILY_WITHDRAWAL: 5000,
    MONTHLY_WITHDRAWAL: 50000,
    MINIMUM_BALANCE: 0,
    MAX_HOLD_DURATION_HOURS: 72,
} as const;

/**
 * Transaction amount limits
 */
export const TRANSACTION_LIMITS = {
    MIN_DEPOSIT: 1,
    MAX_DEPOSIT: 100000,
    MIN_WITHDRAWAL: 10,
    MAX_WITHDRAWAL: 50000,
    MIN_TRANSFER: 1,
    MAX_TRANSFER: 10000,
} as const;

/**
 * Precision for decimal calculations
 */
export const DECIMAL_PRECISION = 2;

/**
 * Default currency
 */
export const DEFAULT_CURRENCY = Currency.EGP;
