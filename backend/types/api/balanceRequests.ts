/**
 * API Request Types for Balance System
 * 
 * Defines the structure of incoming API requests
 */

export interface DepositRequest {
    userId: string;
    amount: number;
    description: string;
    metadata?: Record<string, any>;
}

export interface WithdrawalRequest {
    userId: string;
    amount: number;
    destination: string;
    description: string;
    metadata?: Record<string, any>;
}

export interface CreateHoldRequest {
    userId: string;
    amount: number;
    reason: string;
    expiresInMinutes?: number;
    metadata?: Record<string, any>;
}

export interface ReleaseHoldRequest {
    holdId: string;
}

export interface CaptureHoldRequest {
    holdId: string;
    amount?: number; // Optional: capture partial amount
}

export interface TransactionHistoryQuery {
    userId: string;
    type?: string | string[];
    status?: string | string[];
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
    minAmount?: number;
    maxAmount?: number;
}

export interface BalanceStatementQuery {
    userId: string;
    startDate: string;
    endDate: string;
}

export interface FreezeBalanceRequest {
    userId: string;
    reason: string;
}

export interface UnfreezeBalanceRequest {
    userId: string;
}

export interface AdjustBalanceRequest {
    userId: string;
    amount: number;
    reason: string;
}
