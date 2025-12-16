/**
 * API Response Types for Balance System
 * 
 * Defines the structure of API responses
 */

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
    timestamp: string;
}

export interface BalanceResponse {
    userId: number;
    availableBalance: number;
    pendingBalance: number;
    heldBalance: number;
    totalBalance: number;
    currency: string;
    dailyWithdrawalLimit: number;
    monthlyWithdrawalLimit: number;
    minimumBalance: number;
    isActive: boolean;
    isFrozen: boolean;
    freezeReason?: string;
    frozenAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface TransactionResponse {
    transactionId: string;
    userId: number;
    type: string;
    amount: number;
    currency: string;
    balanceBefore: number;
    balanceAfter: number;
    status: string;
    description: string;
    orderId?: number;
    createdAt: string;
    balance: BalanceResponse;
}

export interface HoldResponse {
    holdId: string;
    userId: number;
    amount: number;
    currency: string;
    status: string;
    reason: string;
    expiresAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface TransactionHistoryResponse {
    transactions: Array<{
        id: number;
        transactionId: string;
        userId: number;
        type: string;
        amount: number;
        currency: string;
        balanceBefore: number;
        balanceAfter: number;
        status: string;
        description: string;
        orderId?: number;
        createdAt: string;
    }>;
    pagination: {
        total: number;
        limit: number;
        offset: number;
        hasMore: boolean;
    };
}

export interface BalanceStatementResponse {
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
    transactions: Array<{
        transactionId: string;
        type: string;
        amount: number;
        status: string;
        description: string;
        createdAt: string;
    }>;
    currency: string;
}

export interface ValidationErrorResponse {
    success: false;
    error: string;
    errors: Array<{
        field: string;
        message: string;
        value?: any;
    }>;
    timestamp: string;
}
