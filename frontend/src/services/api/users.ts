// Users API Service

import { ApiClient } from './client';
import {
    User,
    UpdateProfileRequest,
    UpdateAvailabilityRequest,
    UserPreferences,
    PaymentMethod,
    AddPaymentMethodRequest,
    Favorite,
} from './types';

export class UsersApi {
    /**
     * Get user profile
     */
    static async getProfile(): Promise<User> {
        return ApiClient.get<User>('/users/me');
    }

    /**
     * Update user profile
     */
    static async updateProfile(data: UpdateProfileRequest): Promise<{ user: User }> {
        return ApiClient.put<{ user: User }>('/users/me/profile', data);
    }

    /**
     * Update driver availability
     */
    static async updateAvailability(data: UpdateAvailabilityRequest): Promise<{ isAvailable: boolean }> {
        return ApiClient.post<{ isAvailable: boolean }>('/users/me/availability', data);
    }

    /**
     * Get user preferences
     */
    static async getPreferences(): Promise<UserPreferences> {
        return ApiClient.get<UserPreferences>('/users/me/preferences');
    }

    /**
     * Update user preferences
     */
    static async updatePreferences(data: Partial<UserPreferences>): Promise<UserPreferences> {
        return ApiClient.put<UserPreferences>('/users/me/preferences', data);
    }

    /**
     * Get payment methods
     */
    static async getPaymentMethods(): Promise<PaymentMethod[]> {
        return ApiClient.get<PaymentMethod[]>('/users/me/payment-methods');
    }

    /**
     * Add payment method
     */
    static async addPaymentMethod(data: AddPaymentMethodRequest): Promise<PaymentMethod> {
        return ApiClient.post<PaymentMethod>('/users/me/payment-methods', data);
    }

    /**
     * Delete payment method
     */
    static async deletePaymentMethod(paymentMethodId: string): Promise<void> {
        return ApiClient.delete<void>(`/users/me/payment-methods/${paymentMethodId}`);
    }

    /**
     * Get favorite drivers/customers
     */
    static async getFavorites(): Promise<Favorite[]> {
        return ApiClient.get<Favorite[]>('/users/me/favorites');
    }

    /**
     * Add favorite driver/customer
     */
    static async addFavorite(userId: string): Promise<Favorite> {
        return ApiClient.post<Favorite>('/users/me/favorites', { userId });
    }

    /**
     * Remove favorite driver/customer
     */
    static async deleteFavorite(userId: string): Promise<void> {
        return ApiClient.delete<void>(`/users/me/favorites/${userId}`);
    }

    /**
     * Update profile picture
     */
    static async updateProfilePicture(data: { imageDataUrl?: string } | FormData): Promise<{ profilePictureUrl: string }> {
        if (data instanceof FormData) {
            // For FormData, use fetch directly as ApiClient might not handle it
            const API_URL = process.env.REACT_APP_API_URL || 'https://matrix-api.oldantique50.com/api';
            const response = await fetch(`${API_URL}/users/me/profile-picture`, {
                method: 'POST',
                credentials: 'include',
                body: data
            });
            if (!response.ok) {
                throw new Error('Failed to upload profile picture');
            }
            return response.json();
        }
        return ApiClient.post<{ profilePictureUrl: string }>('/users/me/profile-picture', data);
    }

    /**
     * Get user reviews (received or given)
     */
    static async getUserReviews(userId: string, type: 'received' | 'given'): Promise<{ reviews: any[] }> {
        return ApiClient.get<{ reviews: any[] }>(`/users/${userId}/reviews/${type}`);
    }
}
