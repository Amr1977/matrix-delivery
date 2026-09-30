// API Type Definitions for Matrix Delivery

// ============ User & Auth Types ============

export interface User {
  id: string;
  userId?: string; // Legacy field
  email: string;
  name: string;
  phone?: string;
  primary_role?: "customer" | "driver" | "admin" | "vendor";
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
  profile_picture_url?: string;
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
  primary_role: "customer" | "driver" | "vendor";
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
  new_primary_role: string;
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
  id: string;
  orderId?: string;
  title: string;
  description?: string;
  package_description?: string;
  package_weight?: number;
  estimated_value?: number;
  special_instructions?: string;
  estimated_delivery_date?: string;
  price: number;
  status:
    | "pending_bids"
    | "accepted"
    | "picked_up"
    | "in_transit"
    | "delivered"
    | "courier_delivered"
    | "customer_delivered"
    | "completed"
    | "cancelled";
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
  heading?: number | null;
  speed?: number | null;
  accuracy?: number | null;
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
  sort?: "recent" | "upvotes";
  limit?: number;
  page?: number;
}

// ============ Platform Wallet Types ============

export interface PlatformWallet {
  id: number;
  paymentMethod:
    | "vodafone_cash"
    | "orange_money"
    | "etisalat_cash"
    | "we_pay"
    | "instapay";
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
  paymentMethod:
    | "vodafone_cash"
    | "orange_money"
    | "etisalat_cash"
    | "we_pay"
    | "instapay";
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

export type PaymentMethodType =
  | "vodafone_cash"
  | "orange_money"
  | "etisalat_cash"
  | "we_pay"
  | "instapay";

// ============ Courier Career Network Types ============

export type CourierTier = "junior" | "mid" | "senior" | "team_leader";

export interface CourierTierRule {
  tier_name: CourierTier;
  display_order: number;
  min_completed_deliveries: number;
  min_tenure_days: number;
  min_rating: number;
  min_team_size: number;
}

export interface CourierTeam {
  id: number;
  leader_user_id: string;
  name: string;
  created_at: string;
  members?: CourierTeamMember[];
  stats?: {
    member_count: number;
    total_deliveries: number;
    average_rating: number;
    verified_count: number;
  };
}

export interface CourierTeamMember {
  id: number;
  team_id: number;
  courier_user_id: string;
  joined_at: string;
  name?: string;
  rating?: number;
  completed_deliveries?: number;
  current_tier?: CourierTier;
  profile_picture_url?: string;
}

export interface CourierCareerEvent {
  id: number;
  courier_user_id: string;
  event_type: string;
  event_detail: Record<string, any>;
  occurred_at: string;
}

export interface CourierPublicProfile {
  id: string;
  name: string;
  profile_picture_url?: string;
  rating: number;
  completed_deliveries: number;
  is_verified: boolean;
  current_tier: CourierTier;
  tier_updated_at?: string;
  tenure_days: number;
  service_area_zone?: string;
  city?: string;
  country?: string;
  license_number?: string;
  created_at: string;
  is_profile_owner?: boolean;
}

export interface CourierDirectoryFilters {
  page?: number;
  limit?: number;
  tier?: CourierTier;
  city?: string;
  country?: string;
}

export interface CourierDirectoryResponse {
  couriers: CourierPublicProfile[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UpdateProfileVisibilityRequest {
  is_profile_public: boolean;
}

export interface CreateTeamRequest {
  name: string;
}

export interface AddTeamMemberRequest {
  courier_user_id: string;
}

export interface TierRecalculationResult {
  changed: boolean;
  previousTier?: CourierTier;
  newTier?: CourierTier;
  eventType?: string;
  currentTier?: CourierTier;
}

// ============ Store Branding Types ============

export interface StoreBranding {
  logo_url?: string;
  logo_public_id?: string;
  cover_image_url?: string;
  cover_public_id?: string;
}

export interface StoreGalleryImage {
  id: number;
  image_url: string;
  cloudinary_public_id: string;
  display_order: number;
  is_primary: boolean;
  created_at: string;
}

export interface StoreGalleryResponse {
  images: StoreGalleryImage[];
}

export interface AddStoreGalleryImageRequest {
  file: File; // Will be uploaded via multipart/form-data
}

export interface UpdateStoreBrandingRequest {
  logo_url?: string;
  logo_public_id?: string;
  cover_image_url?: string;
  cover_public_id?: string;
}

// ============ Item Image Types ============

export interface ItemImage {
  id: number;
  image_url: string;
  cloudinary_public_id: string;
  display_order: number;
  is_primary: boolean;
  created_at: string;
}

export interface ItemImageResponse {
  images: ItemImage[];
}

export interface ItemImageUploadResponse {
  image: ItemImage;
  was_new_primary: boolean;
}

export interface ReorderImagesRequest {
  imageOrders: Array<{ id: number; display_order: number }>;
}

// ============ Response Types ============

export type PaymentMethodType =
  | "vodafone_cash"
  | "orange_money"
  | "etisalat_cash"
  | "we_pay"
  | "instapay";

// ============ Courier Career Network Types ============

export type CourierTier = "junior" | "mid" | "senior" | "team_leader";

export interface CourierTierRule {
  tier_name: CourierTier;
  display_order: number;
  min_completed_deliveries: number;
  min_tenure_days: number;
  min_rating: number;
  min_team_size: number;
}

export interface CourierTeam {
  id: number;
  leader_user_id: string;
  name: string;
  created_at: string;
  members?: CourierTeamMember[];
  stats?: {
    member_count: number;
    total_deliveries: number;
    average_rating: number;
    verified_count: number;
  };
}

export interface CourierTeamMember {
  id: number;
  team_id: number;
  courier_user_id: string;
  joined_at: string;
  name?: string;
  rating?: number;
  completed_deliveries?: number;
  current_tier?: CourierTier;
  profile_picture_url?: string;
}

export interface CourierCareerEvent {
  id: number;
  courier_user_id: string;
  event_type: string;
  event_detail: Record<string, any>;
  occurred_at: string;
}

export interface CourierPublicProfile {
  id: string;
  name: string;
  profile_picture_url?: string;
  rating: number;
  completed_deliveries: number;
  is_verified: boolean;
  current_tier: CourierTier;
  tier_updated_at?: string;
  tenure_days: number;
  service_area_zone?: string;
  city?: string;
  country?: string;
  license_number?: string;
  created_at: string;
  is_profile_owner?: boolean;
}

export interface CourierDirectoryFilters {
  page?: number;
  limit?: number;
  tier?: CourierTier;
  city?: string;
  country?: string;
}

export interface CourierDirectoryResponse {
  couriers: CourierPublicProfile[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UpdateProfileVisibilityRequest {
  is_profile_public: boolean;
}

export interface CreateTeamRequest {
  name: string;
}

export interface AddTeamMemberRequest {
  courier_user_id: string;
}

export interface TierRecalculationResult {
  changed: boolean;
  previousTier?: CourierTier;
  newTier?: CourierTier;
  eventType?: string;
  currentTier?: CourierTier;
}
