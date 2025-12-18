/**
 * Balance API Service
 * Client for interacting with Balance API v1
 */

import axios from 'axios';
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
} from '../types/balance';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://matrix-api.oldantique50.com/api';

/**
 * Balance API Client
 */
export const balanceApi = {
    /**
     * Get user balance
     */
    async getBalance(userId: number): Promise<UserBalance> {
        const response = await axios.get<ApiResponse<UserBalance>>(
            `${API_BASE_URL}/v1/balance/${userId}`
        );
        return response.data.data;
    },

    /**
     * Deposit funds to balance
     */
    async deposit(request: DepositRequest): Promise<BalanceTransaction> {
        const response = await axios.post<ApiResponse<{ transaction: BalanceTransaction }>>(
            `${API_BASE_URL}/v1/balance/deposit`,
            request
        );
        return response.data.data.transaction;
    },

    /**
     * Request withdrawal
     */
    async withdraw(request: WithdrawalRequest): Promise<BalanceTransaction> {
        const response = await axios.post<ApiResponse<{ transaction: BalanceTransaction }>>(
            `${API_BASE_URL}/v1/balance/withdraw`,
            request
        );
        return response.data.data.transaction;
    },

    /**
     * Get transaction history
     */
    async getTransactions(
        userId: number,
        filters?: TransactionFilters
    ): Promise<TransactionHistoryResponse> {
        const response = await axios.get<ApiResponse<TransactionHistoryResponse>>(
            `${API_BASE_URL}/v1/balance/${userId}/transactions`,
            { params: filters }
        );
        return response.data.data;
    },

    /**
     * Generate balance statement
     */
    async getStatement(request: BalanceStatementRequest): Promise<BalanceStatement> {
        const { userId, startDate, endDate } = request;
        const response = await axios.get<ApiResponse<BalanceStatement>>(
            `${API_BASE_URL}/v1/balance/${userId}/statement`,
            { params: { startDate, endDate } }
        );
        return response.data.data;
    },

    /**
     * Create balance hold
     */
    async createHold(userId: number, amount: number, reason: string) {
        const response = await axios.post<ApiResponse<any>>(
            `${API_BASE_URL}/v1/balance/hold`,
            { userId, amount, reason }
        );
        return response.data.data;
    }
};

export default balanceApi;
