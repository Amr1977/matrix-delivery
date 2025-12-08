// Authentication API Service

import { ApiClient } from './client';
import {
    LoginRequest,
    RegisterRequest,
    AuthResponse,
    SwitchRoleRequest,
    User,
} from './types';

export class AuthApi {
    /**
     * Login user
     */
    static async login(credentials: LoginRequest): Promise<AuthResponse> {
        return ApiClient.post<AuthResponse>('/auth/login', credentials);
    }

    /**
     * Register new user
     */
    static async register(userData: RegisterRequest): Promise<AuthResponse> {
        return ApiClient.post<AuthResponse>('/auth/register', userData);
    }

    /**
     * Logout user
     */
    static async logout(): Promise<void> {
        return ApiClient.post<void>('/auth/logout');
    }

    /**
     * Switch user role
     */
    static async switchRole(data: SwitchRoleRequest): Promise<AuthResponse> {
        return ApiClient.post<AuthResponse>('/auth/switch-role', data);
    }

    /**
     * Get current user info
     */
    static async getCurrentUser(): Promise<User> {
        return ApiClient.get<User>('/auth/me');
    }
}
