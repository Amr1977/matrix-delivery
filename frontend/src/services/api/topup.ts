/**
 * Topup API Service
 * Client for interacting with Topup API endpoints
 */

import { ApiClient } from './client';
import type {
    PlatformWallet,
    Topup,
    CreateTopupRequest,
    TopupFilters,
    TopupResponse,
    TopupListResponse,
    PlatformWalletsResponse,
    AdminTopupFilters,
    AdminTopupListResponse,
    VerifyTopupResponse,
    RejectTopupResponse
} from '../../types/topup';

/**
 * Topup API Client
 */
export const topupApi = {
    /**
     * Get active platform wallets
     * @param paymentMethod - Optional filter by payment method
     */
    async getActiveWallets(paymentMethod?: string): Promise<PlatformWallet[]> {
        const queryString = paymentMethod 
            ? ApiClient.buildQueryString({ paymentMethod })
            : '';
        const response = await ApiClient.get<PlatformWalletsResponse>(
            `/wallet-payments/wallets/active${queryString}`
        );
        return response.wallets;
    },

    /**
     * Create a new topup request
     */
    async createTopup(request: CreateTopupRequest): Promise<Topup> {
        const response = await ApiClient.post<TopupResponse>(
            '/topups',
            request
        );
        return response.topup;
    },

    /**
     * Get user's topup history
     */
    async getTopups(filters?: TopupFilters): Promise<TopupListResponse> {
        const queryString = ApiClient.buildQueryString(filters || {});
        const response = await ApiClient.get<TopupListResponse>(
            `/topups${queryString}`
        );
        return response;
    },

    /**
     * Get a single topup by ID
     */
    async getTopupById(topupId: number): Promise<Topup> {
        const response = await ApiClient.get<TopupResponse>(
            `/topups/${topupId}`
        );
        return response.topup;
    },

    // ============ Admin Endpoints ============

    /**
     * Get pending topups for admin verification
     */
    async getPendingTopups(filters?: AdminTopupFilters): Promise<AdminTopupListResponse> {
        const queryString = ApiClient.buildQueryString(filters || {});
        const response = await ApiClient.get<AdminTopupListResponse>(
            `/admin/topups/pending${queryString}`
        );
        return response;
    },

    /**
     * Verify a pending topup
     */
    async verifyTopup(topupId: number): Promise<VerifyTopupResponse> {
        const response = await ApiClient.post<VerifyTopupResponse>(
            `/admin/topups/${topupId}/verify`
        );
        return response;
    },

    /**
     * Reject a pending topup
     */
    async rejectTopup(topupId: number, reason: string): Promise<RejectTopupResponse> {
        const response = await ApiClient.post<RejectTopupResponse>(
            `/admin/topups/${topupId}/reject`,
            { reason }
        );
        return response;
    }
};

export default topupApi;
