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
    BalanceTransaction,
    WithdrawalInitiationResponse,
    WithdrawalVerificationResponse,
    AdminWithdrawalListResponse,
    AdminWithdrawalRequest
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
    async withdraw(request: WithdrawalRequest): Promise<WithdrawalInitiationResponse> {
        const response = await ApiClient.post<ApiResponse<WithdrawalInitiationResponse>>(
            '/v1/balance/withdraw',
            request
        );
        return response.data;
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
    },

    /**
     * Verify withdrawal with PIN code
     */
    async verifyWithdrawal(
        userId: number,
        withdrawalRequestId: number,
        code: string
    ): Promise<WithdrawalVerificationResponse> {
        const response = await ApiClient.post<ApiResponse<WithdrawalVerificationResponse>>(
            `/v1/balance/withdraw/${withdrawalRequestId}/verify`,
            {
                userId,
                withdrawalRequestId,
                code
            }
        );
        return response.data;
    },

    /**
     * Cancel a pending withdrawal request by user
     */
    async cancelWithdrawal(
        userId: number,
        withdrawalRequestId: number,
        reason?: string
    ): Promise<UserBalance> {
        const response = await ApiClient.post<ApiResponse<{ balance: UserBalance }>>(
            `/v1/balance/withdraw/${withdrawalRequestId}/cancel`,
            {
                userId,
                withdrawalRequestId,
                reason
            }
        );
        return response.data.balance;
    },

    /**
     * Get pending withdrawals for admin review
     */
    async getPendingWithdrawals(options?: {
        limit?: number;
        offset?: number;
    }): Promise<AdminWithdrawalListResponse> {
        const queryString = ApiClient.buildQueryString(options || {});
        const response = await ApiClient.get<ApiResponse<{ requests: any[]; total: number }>>(
            `/v1/balance/admin/withdrawals${queryString}`
        );
        const { requests, total } = response.data;
        const mappedRequests: AdminWithdrawalRequest[] = (requests || []).map((r: any) => {
            let destinationDetails: any = {};
            const rawDetails = r.destination_details;

            if (rawDetails) {
                if (typeof rawDetails === 'string') {
                    try {
                        destinationDetails = JSON.parse(rawDetails);
                    } catch {
                        destinationDetails = {};
                    }
                } else if (typeof rawDetails === 'object') {
                    destinationDetails = rawDetails;
                }
            }

            return {
                id: r.id,
                requestNumber: r.request_number,
                userId: String(r.user_id),
                userName: r.user_name,
                userEmail: r.user_email,
                amount: typeof r.amount === 'string' ? parseFloat(r.amount) : r.amount,
                currency: r.currency,
                withdrawalMethod: r.withdrawal_method,
                destinationType: r.destination_type,
                destinationDetails,
                status: r.status,
                createdAt: r.created_at,
                verifiedAt: r.verified_at || undefined
            };
        });
        return {
            requests: mappedRequests,
            total
        };
    },

    /**
     * Approve a pending withdrawal request
     */
    async approveWithdrawal(
        requestId: number,
        reference: string
    ): Promise<{ success: boolean; message: string }> {
        const response = await ApiClient.post<{ success: boolean; message: string }>(
            `/v1/balance/admin/withdrawals/${requestId}/approve`,
            { reference }
        );
        return response;
    },

    /**
     * Reject a pending withdrawal request
     */
    async rejectWithdrawal(
        requestId: number,
        reason: string
    ): Promise<{ success: boolean; message: string }> {
        const response = await ApiClient.post<{ success: boolean; message: string }>(
            `/v1/balance/admin/withdrawals/${requestId}/reject`,
            { reason }
        );
        return response;
    }
};

export default balanceApi;
