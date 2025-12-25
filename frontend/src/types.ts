export interface User {
    id: string;
    name: string;
    email: string;
    phone?: string;
    primary_role: 'customer' | 'driver' | 'admin' | 'vendor';
    granted_roles?: string[];
    profile_picture_url?: string;
    // isVerified removed in favor of is_verified
    is_verified?: boolean;
    completedDeliveries?: number;
    completed_deliveries?: number;
    rating?: number;
    gender?: 'male' | 'female' | 'other';
    language?: string;
    theme?: string;
    vehicle_type?: string;
    license_number?: string;
    service_area_zone?: string;
    is_available?: boolean;
    preferences?: any;
    notification_prefs?: any;
    two_factor_methods?: string[];
    document_verification_status?: string;
    verified_at?: string;
}

export interface Notification {
    id: string;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
    type?: string;
    orderId?: string;
}

export interface EarningsStats {
    today: number;
    week: number;
    month: number;
    chartData: {
        date: string;
        fullDate: string;
        amount: number;
    }[];
}

export interface OrderHistoryItem {
    id: string;
    orderNumber: string;
    date: string;
    amount: number;
    rating: number | null;
}

export interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface OrderHistoryResponse {
    orders: OrderHistoryItem[];
    pagination: Pagination;
}
