/**
 * Balance and Transaction Types
 * TypeScript interfaces for balance system
 */

export interface UserBalance {
    userId: number;
    availableBalance: number;
    pendingBalance: number;
    heldBalance: number;
    totalBalance: number;
    currency: string;
    dailyWithdrawalLimit: number;
    monthlyWithdrawalLimit: number;
    minimumBalance: number;
    lifetimeDeposits: number;
    lifetimeWithdrawals: number;
    lifetimeEarnings: number;
    totalTransactions: number;
    isActive: boolean;
    isFrozen: boolean;
    freezeReason?: string;
    frozenAt?: string;
    frozenBy?: number;
    createdAt: string;
    updatedAt: string;
}

export interface BalanceTransaction {
    id: number;
    transactionId: string;
    userId: number;
    type: TransactionType;
    amount: number;
    currency: string;
    balanceBefore: number;
    balanceAfter: number;
    status: TransactionStatus;
    description: string;
    orderId?: number;
    createdAt: string;
}

export type TransactionType =
    | 'deposit'
    | 'withdrawal'
    | 'order_payment'
    | 'order_refund'
    | 'earnings'
    | 'commission_deduction'
    | 'adjustment'
    | 'hold'
    | 'hold_release';

export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled';

export interface DepositRequest {
    userId: number;
    amount: number;
    description: string;
    metadata?: Record<string, any>;
}

export interface WithdrawalRequest {
    userId: number;
    amount: number;
    destination: string;
    description: string;
    metadata?: Record<string, any>;
}

export interface TransactionFilters {
    type?: TransactionType | TransactionType[];
    status?: TransactionStatus | TransactionStatus[];
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
}

export interface BalanceStatementRequest {
    userId: number;
    startDate: string;
    endDate: string;
}

export interface BalanceStatement {
    userId: number;
    period: {
        startDate: string;
        endDate: string;
    };
    openingBalance: number;
    closingBalance: number;
    totalDeposits: number;
    totalWithdrawals: number;
    totalEarnings: number;
    totalDeductions: number;
    transactions: BalanceTransaction[];
    currency: string;
}

export interface BalanceHold {
    holdId: string;
    userId: number;
    amount: number;
    currency: string;
    status: 'active' | 'released' | 'captured' | 'expired' | 'cancelled';
    reason: string;
    expiresAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
    timestamp: string;
}

export interface TransactionHistoryResponse {
    transactions: BalanceTransaction[];
    pagination: {
        total: number;
        limit: number;
        offset: number;
        hasMore: boolean;
    };
}
