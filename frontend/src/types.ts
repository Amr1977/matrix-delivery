export interface User {
    id: string;
    name: string;
    email: string;
    role: 'customer' | 'driver' | 'admin' | 'vendor';
    primary_role?: 'customer' | 'driver' | 'admin' | 'vendor'; // New backend field
    roles?: string[]; // Legacy
    granted_roles?: string[]; // New backend field
    profile_picture_url?: string;
    isVerified?: boolean;
    completedDeliveries?: number;
    rating?: number;
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
