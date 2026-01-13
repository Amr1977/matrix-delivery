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
            `/topups/wallets/active${queryString}`
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
    },

    // ============ Platform Wallet Management ============

    /**
     * Get all platform wallets (admin)
     */
    async getAllPlatformWallets(): Promise<PlatformWallet[]> {
        const response = await ApiClient.get<{ success: boolean; wallets: PlatformWallet[] }>(
            '/admin/topups/platform-wallets'
        );
        return response.wallets;
    },

    /**
     * Create a new platform wallet (admin)
     */
    async createPlatformWallet(data: {
        paymentMethod: string;
        phoneNumber?: string;
        instapayAlias?: string;
        holderName: string;
        dailyLimit?: number;
        monthlyLimit?: number;
    }): Promise<PlatformWallet> {
        const response = await ApiClient.post<{ success: boolean; wallet: PlatformWallet }>(
            '/admin/topups/platform-wallets',
            data
        );
        return response.wallet;
    },

    /**
     * Update a platform wallet (admin)
     */
    async updatePlatformWallet(walletId: number, data: {
        phoneNumber?: string;
        instapayAlias?: string;
        holderName?: string;
        dailyLimit?: number;
        monthlyLimit?: number;
        isActive?: boolean;
    }): Promise<PlatformWallet> {
        const response = await ApiClient.put<{ success: boolean; wallet: PlatformWallet }>(
            `/admin/topups/platform-wallets/${walletId}`,
            data
        );
        return response.wallet;
    }
};
