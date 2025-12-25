// API Type Definitions for Matrix Delivery

// ============ User & Auth Types ============

export interface User {
    id: string;
    userId?: string; // Legacy field
    email: string;
    name: string;
    phone?: string;
    primary_role?: 'customer' | 'driver' | 'admin' | 'vendor';
    granted_roles?: string[];
    country?: string;
    city?: string;
    area?: string;
    vehicle_type?: string;
    license_number?: string;
    service_area_zone?: string;
    is_available?: boolean;
    rating?: number;
    total_deliveries?: number;
    profile_image?: string;
    is_verified?: boolean;
    language?: string;
    theme?: string;
    stripe_customer_id?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface LoginRequest {
    email: string;
    password: string;
    recaptchaToken?: string;
}

export interface RegisterRequest {
    name: string;
    email: string;
    password: string;
    phone: string;
    primary_role: 'customer' | 'driver' | 'vendor';
    country: string;
    city: string;
    area?: string;
    vehicle_type?: string;
    recaptchaToken?: string;
}

export interface AuthResponse {
    user: User;
    token?: string; // May not be present with cookie auth
}

export interface SwitchRoleRequest {
    primary_role: string;
}

// ============ Order Types ============

export interface Address {
    personName: string;
    street: string;
    buildingNumber?: string;
    floor?: string;
    apartmentNumber?: string;
    area: string;
    city: string;
    country: string;
    phone?: string;
    notes?: string;
}

export interface Location {
    lat: number;
    lng: number;
    address?: Address;
}

export interface Bid {
    userId: string;
    userName?: string;
    userRating?: number;
    bidPrice: number;
    estimatedPickupTime?: string;
    estimatedDeliveryTime?: string;
    message?: string;
    createdAt: string;
}

export interface Order {
    _id: string;
    orderId?: string;
    title: string;
    description?: string;
    package_description?: string;
    package_weight?: number;
    estimated_value?: number;
    special_instructions?: string;
    estimated_delivery_date?: string;
    price: number;
    status: 'pending_bids' | 'accepted' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
    customerId: string;
    customerName?: string;
    pickupAddress?: Address;
    dropoffAddress?: Address;
    pickupLocation?: Location;
    dropoffLocation?: Location;
    routeInfo?: {
        distance?: number;
        duration?: number;
        polyline?: string;
    };
    bids?: Bid[];
    assignedDriver?: {
        userId: string;
        userName: string;
        userRating?: number;
        bidPrice: number;
    };
    currentLocation?: Location;
    distance?: number; // Distance from driver
    createdAt: string;
    updatedAt: string;
}

export interface CreateOrderRequest {
    title: string;
    description?: string;
    package_description?: string;
    package_weight?: number;
    estimated_value?: number;
    special_instructions?: string;
    estimated_delivery_date?: string;
    price: number;
    pickupAddress: Address;
    dropoffAddress: Address;
    pickupLocation?: Location;
    dropoffLocation?: Location;
    routeInfo?: {
        distance?: number;
        duration?: number;
        polyline?: string;
    };
}

export interface PlaceBidRequest {
    bidPrice: number;
    estimatedPickupTime?: string;
    estimatedDeliveryTime?: string;
    message?: string;
}

export interface AcceptBidRequest {
    userId: string;
}

export interface UpdateLocationRequest {
    latitude: number;
    longitude: number;
}

export interface OrderFilters {
    country?: string;
    city?: string;
    area?: string;
    lat?: number;
    lng?: number;
}

// ============ Driver Types ============

export interface DriverLocation {
    userId?: string;
    latitude: number | null;
    longitude: number | null;
    lastUpdated: Date | string | null;
    timestamp?: string; // Legacy field
}

export interface DriverStatusRequest {
    isOnline: boolean;
}

export interface DriverEarnings {
    totalEarnings: number;
    completedDeliveries: number;
    averageRating: number;
    earnings: Array<{
        orderId: string;
        amount: number;
        date: string;
    }>;
}

// ============ User Profile Types ============

export interface UpdateProfileRequest {
    name?: string;
    phone?: string;
    language?: string;
    theme?: string;
    vehicle_type?: string;
    license_number?: string;
    service_area_zone?: string;
}

export interface UpdateAvailabilityRequest {
    is_available: boolean;
}

export interface UserPreferences {
    preferences?: Record<string, any>;
    notification_prefs?: Record<string, any>;
    two_factor_methods?: string[];
}

export interface PaymentMethod {
    id: string;
    payment_method_type: string;
    masked_details: string;
    is_default: boolean;
}

export interface AddPaymentMethodRequest {
    payment_method_type: string;
    masked_details: string;
    is_default: boolean;
}

export interface Favorite {
    userId: string;
    userName: string;
    userRating?: number;
}

// ============ Notification Types ============

export interface Notification {
    id: string;
    userId: string;
    type: string;
    title: string;
    message: string;
    data?: Record<string, any>;
    read: boolean;
    createdAt: string;
}

// ============ Error Types ============

export interface ApiError {
    error: string;
    statusCode?: number;
    details?: any;
}

// ============ Response Types ============

export interface ApiResponse<T> {
    data?: T;
    error?: string;
    message?: string;
}

// ============ Review Types ============

export interface Review {
    id: string;
    user_id: string;
    user_name: string;
    rating: number;
    comment: string;
    upvotes: number;
    downvotes?: number;
    flag_count: number;
    created_at: string;
    is_approved?: boolean;
}

export interface CreateReviewRequest {
    rating: number;
    comment: string;
}

export interface ReviewFilters {
    sort?: 'recent' | 'upvotes';
    limit?: number;
    page?: number;
}
