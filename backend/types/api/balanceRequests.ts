/**
 * API Request Types for Balance System
 * 
 * Defines the structure of incoming API requests
 */

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

export interface CreateHoldRequest {
    userId: number;
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
    userId: number;
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
    userId: number;
    startDate: string;
    endDate: string;
}

export interface FreezeBalanceRequest {
    userId: number;
    reason: string;
}

export interface UnfreezeBalanceRequest {
    userId: number;
}

export interface AdjustBalanceRequest {
    userId: number;
    amount: number;
    reason: string;
}
