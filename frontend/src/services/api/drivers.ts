// Drivers API Service

import { ApiClient } from './client';
import {
    DriverLocation,
    DriverStatusRequest,
    DriverEarnings,
    UpdateLocationRequest,
} from './types';

export class DriversApi {
    /**
     * Update driver online/offline status
     */
    static async updateStatus(data: DriverStatusRequest): Promise<void> {
        return ApiClient.post<void>('/drivers/status', data);
    }

    /**
     * Update driver location
     */
    static async updateLocation(location: UpdateLocationRequest): Promise<DriverLocation> {
        return ApiClient.post<DriverLocation>('/drivers/location', location);
    }

    /**
     * Update driver location while bidding
     */
    static async updateBiddingLocation(location: UpdateLocationRequest): Promise<void> {
        return ApiClient.post<void>('/drivers/location/bidding', location);
    }

    /**
     * Get driver location
     */
    static async getLocation(driverId: string): Promise<DriverLocation> {
        return ApiClient.get<DriverLocation>(`/drivers/location/${driverId}`);
    }

    /**
     * Get driver bidding location
     */
    static async getBiddingLocation(driverId: string): Promise<DriverLocation> {
        return ApiClient.get<DriverLocation>(`/drivers/location/bidding/${driverId}`);
    }

    /**
     * Get locations of all drivers bidding on an order
     */
    static async getOrderBidders(orderId: string): Promise<DriverLocation[]> {
        return ApiClient.get<DriverLocation[]>(`/drivers/location/order/${orderId}/bidders`);
    }

    /**
     * Get driver earnings and statistics
     */
    static async getEarnings(): Promise<DriverEarnings> {
        return ApiClient.get<DriverEarnings>('/drivers/earnings');
    }

    /**
     * Get driver statistics
     */
    static async getStats(): Promise<any> {
        return ApiClient.get<any>('/drivers/stats');
    }
}
