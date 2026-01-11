// Base API Client with Cookie-Based Authentication

import { ApiError } from './types';

const API_URL = process.env.REACT_APP_API_URL;

export class ApiClient {
    /**
     * Generic request method with cookie-based authentication
     */
    private static csrfToken: string | null = null;
    private static tokenPromise: Promise<void> | null = null;

    private static async fetchCsrfToken(): Promise<void> {
        if (this.tokenPromise) return this.tokenPromise;

        this.tokenPromise = (async () => {
            try {
                const response = await fetch(`${API_URL}/csrf-token`, {
                    method: 'GET',
                    credentials: 'include'
                });

                if (response.ok) {
                    const data = await response.json();
                    this.csrfToken = data.csrfToken;
                }
            } catch (error) {
                console.error('Failed to fetch CSRF token:', error);
            } finally {
                this.tokenPromise = null;
            }
        })();

        return this.tokenPromise;
    }

    /**
     * Generic request method with cookie-based authentication
     */
    public static async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const method = (options.method || 'GET').toUpperCase();
        const headers: Record<string, string> = { ...options.headers as Record<string, string> };
        if (!(options.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
        }

        const config: RequestInit = {
            credentials: 'include', // Always include cookies for authentication
            headers,
            ...options,
        };

        // Add CSRF token for state-changing requests
        const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
        if (!safeMethods.includes(method)) {
            if (!this.csrfToken) {
                await this.fetchCsrfToken();
            }
            if (this.csrfToken) {
                (config.headers as any)['X-CSRF-Token'] = this.csrfToken;
            }
        }

        try {
            const response = await fetch(`${API_URL}${endpoint}`, config);

            // Handle 403 Forbidden (CSRF Token Invalid) - Retry logic
            if (response.status === 403 && !(options as any)._retry) {
                // Refresh token and retry once
                this.csrfToken = null;
                await this.fetchCsrfToken();
                return this.request<T>(endpoint, { ...options, _retry: true } as any);
            }

            // Handle non-JSON responses (e.g., 204 No Content)
            if (response.status === 204) {
                return {} as T;
            }

            // Parse JSON response
            const data = await response.json();

            // Handle error responses
            if (!response.ok) {
                const error: ApiError = {
                    error: data.error || `Request failed with status ${response.status}`,
                    statusCode: response.status,
                    details: data,
                };
                throw error;
            }

            return data as T;
        } catch (error: any) {
            // Re-throw ApiError as-is
            if (error.statusCode) {
                throw error;
            }

            // Wrap network errors
            const apiError: ApiError = {
                error: error.message || 'Network request failed',
                statusCode: 0,
            };
            throw apiError;
        }
    }

    /**
     * GET request
     */
    static async get<T>(endpoint: string): Promise<T> {
        return this.request<T>(endpoint, { method: 'GET' });
    }

    /**
     * POST request
     */
    static async post<T>(endpoint: string, data?: any): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'POST',
            body: data ? JSON.stringify(data) : undefined,
        });
    }

    /**
     * PUT request
     */
    static async put<T>(endpoint: string, data?: any): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'PUT',
            body: data ? JSON.stringify(data) : undefined,
        });
    }

    /**
     * DELETE request
     */
    static async delete<T>(endpoint: string): Promise<T> {
        return this.request<T>(endpoint, { method: 'DELETE' });
    }

    /**
     * Build query string from filters object
     */
    static buildQueryString(params: Record<string, any>): string {
        const searchParams = new URLSearchParams();

        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                searchParams.append(key, String(value));
            }
        });

        const queryString = searchParams.toString();
        return queryString ? `?${queryString}` : '';
    }
}
