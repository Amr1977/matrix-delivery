// Courier Career Network API Service

import { ApiClient } from './client';
import {
    CourierPublicProfile,
    CourierCareerEvent,
    CourierTeam,
    CourierDirectoryResponse,
    CourierDirectoryFilters,
    UpdateProfileVisibilityRequest,
    CreateTeamRequest,
    AddTeamMemberRequest,
    TierRecalculationResult,
} from './types';

export class CourierCareerApi {
    /**
     * Get public courier profile
     */
    static async getPublicProfile(courierId: string): Promise<{ profile: CourierPublicProfile }> {
        return ApiClient.get<{ profile: CourierPublicProfile }>(`/couriers/${courierId}/profile`);
    }

    /**
     * Get courier career history
     */
    static async getCareerHistory(courierId: string): Promise<{ career_events: CourierCareerEvent[] }> {
        return ApiClient.get<{ career_events: CourierCareerEvent[] }>(`/couriers/${courierId}/career-history`);
    }

    /**
     * Update own profile visibility
     */
    static async updateProfileVisibility(data: UpdateProfileVisibilityRequest): Promise<{ is_profile_public: boolean }> {
        return ApiClient.patch<{ is_profile_public: boolean }>('/couriers/me/profile-visibility', data);
    }

    /**
     * Create a team (become team leader)
     */
    static async createTeam(data: CreateTeamRequest): Promise<{ team: CourierTeam }> {
        return ApiClient.post<{ team: CourierTeam }>('/couriers/teams', data);
    }

    /**
     * Get current user's team
     */
    static async getMyTeam(): Promise<{ team: CourierTeam | null }> {
        return ApiClient.get<{ team: CourierTeam | null }>('/couriers/me/team');
    }

    /**
     * Get team by ID with stats
     */
    static async getTeam(teamId: number): Promise<{ team: CourierTeam }> {
        return ApiClient.get<{ team: CourierTeam }>(`/couriers/teams/${teamId}`);
    }

    /**
     * Add member to team
     */
    static async addTeamMember(teamId: number, data: AddTeamMemberRequest): Promise<{ member: any }> {
        return ApiClient.post<{ member: any }>(`/couriers/teams/${teamId}/members`, data);
    }

    /**
     * Remove member from team
     */
    static async removeTeamMember(teamId: number, courierUserId: string): Promise<{ success: boolean }> {
        return ApiClient.delete<{ success: boolean }>(`/couriers/teams/${teamId}/members/${courierUserId}`);
    }

    /**
     * Get public courier directory
     */
    static async getDirectory(filters: CourierDirectoryFilters = {}): Promise<CourierDirectoryResponse> {
        const queryString = ApiClient.buildQueryString(filters);
        return ApiClient.get<CourierDirectoryResponse>(`/couriers/directory${queryString}`);
    }

    /**
     * Admin: trigger tier recalculation for a courier
     */
    static async recalculateTier(userId: string): Promise<TierRecalculationResult> {
        return ApiClient.post<TierRecalculationResult>('/couriers/recalculate-tier', { userId });
    }
}