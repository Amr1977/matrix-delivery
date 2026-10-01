// Courier Career Network Types

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