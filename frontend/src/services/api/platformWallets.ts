/**
 * Platform Wallets API Service
 * Handles API calls for platform wallet management
 * 
 * Requirements: 3.1, 4.7, 5.4
 */

import api from '../../api';

export interface PlatformWallet {
  id: number;
  paymentMethod: 'vodafone_cash' | 'orange_money' | 'etisalat_cash' | 'we_pay' | 'instapay';
  phoneNumber?: string;
  instapayAlias?: string;
  holderName: string;
  isActive: boolean;
  dailyLimit: number;
  monthlyLimit: number;
  dailyUsed: number;
  monthlyUsed: number;
  lastResetDaily?: string;
  lastResetMonthly?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WalletFormData {
  paymentMethod: 'vodafone_cash' | 'orange_money' | 'etisalat_cash' | 'we_pay' | 'instapay';
  phoneNumber?: string;
  instapayAlias?: string;
  holderName: string;
  dailyLimit: number;
  monthlyLimit: number;
}

export interface WalletUpdateData {
  phoneNumber?: string;
  instapayAlias?: string;
  holderName?: string;
  dailyLimit?: number;
  monthlyLimit?: number;
  isActive?: boolean;
}

export interface GetWalletsResponse {
  success: boolean;
  wallets: PlatformWallet[];
}

export interface CreateWalletResponse {
  success: boolean;
  message: string;
  wallet: PlatformWallet;
}

export interface UpdateWalletResponse {
  success: boolean;
  message: string;
  wallet: PlatformWallet;
}

export const platformWalletsApi = {
  /**
   * Get all platform wallets
   */
  getAll: async (): Promise<GetWalletsResponse> => {
    return api.get('/admin/topups/platform-wallets');
  },

  /**
   * Create a new platform wallet
   */
  create: async (data: WalletFormData): Promise<CreateWalletResponse> => {
    return api.post('/admin/topups/platform-wallets', data);
  },

  /**
   * Update an existing platform wallet
   */
  update: async (
    id: number, 
    data: WalletUpdateData
  ): Promise<UpdateWalletResponse> => {
    return api.put(`/admin/topups/platform-wallets/${id}`, data);
  }
};

export default platformWalletsApi;