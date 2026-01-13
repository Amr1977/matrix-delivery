/**
 * Topup Types for Egypt Payment Phase 1
 * TypeScript interfaces for topup system
 */

export type PaymentMethodType = 'vodafone_cash' | 'orange_money' | 'etisalat_cash' | 'we_pay' | 'instapay';
export type TopupStatus = 'pending' | 'verified' | 'rejected';

export interface PlatformWallet {
    id: number;
    paymentMethod: PaymentMethodType;
    phoneNumber?: string;
    instapayAlias?: string;
    holderName: string;
    isActive: boolean;
    dailyLimit: number;
    monthlyLimit: number;
    dailyUsed: number;
    monthlyUsed: number;
    createdAt: string;
    updatedAt: string;
}

export interface Topup {
    id: number;
    userId: string;
    amount: number;
    paymentMethod: PaymentMethodType;
    transactionReference: string;
    platformWalletId: number;
    status: TopupStatus;
    rejectionReason?: string;
    verifiedBy?: string;
    verifiedAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateTopupRequest {
    amount: number;
    paymentMethod: PaymentMethodType;
    transactionReference: string;
    platformWalletId: number;
}

export interface TopupFilters {
    status?: TopupStatus;
    limit?: number;
    offset?: number;
}

export interface TopupResponse {
    success: boolean;
    topup: Topup;
    message?: string;
}

export interface TopupListResponse {
    success: boolean;
    topups: Topup[];
    total: number;
}

export interface PlatformWalletsResponse {
    success: boolean;
    wallets: PlatformWallet[];
}

export interface DuplicateTopupError {
    error: string;
    code: 'DUPLICATE_REFERENCE';
    existingTopup: Topup;
}

// Admin types
export interface AdminTopup extends Topup {
    userName?: string;
    userEmail?: string;
    userPhone?: string;
}

export interface AdminTopupFilters {
    paymentMethod?: PaymentMethodType;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
}

export interface AdminTopupListResponse {
    success: boolean;
    topups: AdminTopup[];
    total: number;
    pendingCount: number;
    pagination: {
        limit: number;
        offset: number;
        hasMore: boolean;
    };
}

export interface VerifyTopupResponse {
    success: boolean;
    message: string;
    topup: Topup;
    newBalance: number;
}

export interface RejectTopupResponse {
    success: boolean;
    message: string;
    topup: Topup;
}
