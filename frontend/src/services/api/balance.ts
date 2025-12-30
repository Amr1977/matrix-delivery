/**
 * Balance API Service
 * Client for interacting with Balance API v1
 */

import { ApiClient } from './client';
import type {
    UserBalance,
    DepositRequest,
    WithdrawalRequest,
    TransactionFilters,
    BalanceStatementRequest,
    BalanceStatement,
    ApiResponse,
    TransactionHistoryResponse,
    BalanceTransaction
} from '../../types/balance';

/**
 * Balance API Client
 */
export const balanceApi = {
    /**
     * Get user balance
     */
    async getBalance(userId: number): Promise<UserBalance> {
        const response = await ApiClient.get<ApiResponse<UserBalance>>(
            `/v1/balance/${userId}`
        );
        return response.data;
    },

    /**
     * Deposit funds to balance
     */
    async deposit(request: DepositRequest): Promise<BalanceTransaction> {
        const response = await ApiClient.post<ApiResponse<{ transaction: BalanceTransaction }>>(
            '/v1/balance/deposit',
            request
        );
        return response.data.transaction;
    },

    /**
     * Request withdrawal
     */
    async withdraw(request: WithdrawalRequest): Promise<BalanceTransaction> {
        const response = await ApiClient.post<ApiResponse<{ transaction: BalanceTransaction }>>(
            '/v1/balance/withdraw',
            request
        );
        return response.data.transaction;
    },

    /**
     * Get transaction history
     */
    async getTransactions(
        userId: number,
        filters?: TransactionFilters
    ): Promise<TransactionHistoryResponse> {
        // Build query manually since ApiClient doesn't support params object in get() directly yet 
        // OR simply use the buildQueryString if available. 
        // Checking client.ts, it has buildQueryString static method.
        const queryString = ApiClient.buildQueryString(filters || {});
        const response = await ApiClient.get<ApiResponse<TransactionHistoryResponse>>(
            `/v1/balance/${userId}/transactions${queryString}`
        );
        return response.data;
    },

    /**
     * Generate balance statement
     */
    async getStatement(request: BalanceStatementRequest): Promise<BalanceStatement> {
        const { userId, startDate, endDate } = request;
        const queryString = ApiClient.buildQueryString({ startDate, endDate });
        const response = await ApiClient.get<ApiResponse<BalanceStatement>>(
            `/v1/balance/${userId}/statement${queryString}`
        );
        return response.data;
    },

    /**
     * Create balance hold
     */
    async createHold(userId: number, amount: number, reason: string) {
        const response = await ApiClient.post<ApiResponse<any>>(
            '/v1/balance/hold',
            { userId, amount, reason }
        );
        return response.data;
    }
};

export default balanceApi;
