// API Services - Central Export Point

// Export all API services
export { AuthApi } from './auth';
export { OrdersApi } from './orders';
export { DriversApi } from './drivers';
export { UsersApi } from './users';
export { NotificationsApi } from './notifications';
export { ReviewsApi } from './reviews';
export { platformWalletsApi } from './platformWallets';
export { MapsApi } from './maps';
export { CourierCareerApi } from './courierCareer';

// Export types
export * from './types';

// Explicitly re-export courier career types
export type {
  CourierTier,
  CourierTierRule,
  CourierTeam,
  CourierTeamMember,
  CourierCareerEvent,
  CourierPublicProfile,
  CourierDirectoryFilters,
  CourierDirectoryResponse,
  UpdateProfileVisibilityRequest,
  CreateTeamRequest,
  AddTeamMemberRequest,
  TierRecalculationResult,
} from './courierCareerTypes';

// Export API client for advanced use cases
export { ApiClient } from './client';
