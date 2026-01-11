// Orders API Service

import { ApiClient } from './client';
import {
    Order,
    CreateOrderRequest,
    PlaceBidRequest,
    AcceptBidRequest,
    UpdateLocationRequest,
    OrderFilters,
} from './types';

export class OrdersApi {
    /**
     * Get orders with optional filters
     */
    static async getOrders(filters: OrderFilters = {}): Promise<Order[]> {
        const queryString = ApiClient.buildQueryString(filters);
        return ApiClient.get<Order[]>(`/orders${queryString}`);
    }

    static async getHistoryOrders(filters: OrderFilters = {}): Promise<Order[]> {
        const queryString = ApiClient.buildQueryString(filters);
        return ApiClient.get<Order[]>(`/orders/history${queryString}`);
    }

    /**
     * Create new order
     */
    static async createOrder(orderData: CreateOrderRequest): Promise<Order> {
        return ApiClient.post<Order>('/orders', orderData);
    }

    /**
     * Place bid on order
     */
    static async placeBid(orderId: string, bidData: PlaceBidRequest): Promise<Order> {
        return ApiClient.post<Order>(`/orders/${orderId}/bid`, bidData);
    }

    /**
     * Modify existing bid
     */
    static async modifyBid(orderId: string, bidData: PlaceBidRequest): Promise<Order> {
        return ApiClient.put<Order>(`/orders/${orderId}/bid`, bidData);
    }

    /**
     * Withdraw bid from order
     */
    static async withdrawBid(orderId: string): Promise<Order> {
        return ApiClient.delete<Order>(`/orders/${orderId}/bid`);
    }

    /**
     * Accept a bid on order
     */
    static async acceptBid(orderId: string, data: AcceptBidRequest): Promise<Order> {
        return ApiClient.post<Order>(`/orders/${orderId}/accept-bid`, data);
    }

    /**
     * Update order status (pickup, in-transit, complete)
     */
    static async updateStatus(orderId: string, action: string): Promise<Order> {
        return ApiClient.post<Order>(`/orders/${orderId}/${action}`);
    }

    /**
     * Mark order as picked up
     */
    static async pickup(orderId: string): Promise<Order> {
        return this.updateStatus(orderId, 'pickup');
    }

    /**
     * Mark order as in transit
     */
    static async inTransit(orderId: string): Promise<Order> {
        return this.updateStatus(orderId, 'in-transit');
    }

    /**
     * Mark order as complete
     */
    static async complete(orderId: string): Promise<Order> {
        return this.updateStatus(orderId, 'complete');
    }

    /**
     * Update driver location for order
     */
    static async updateLocation(
        orderId: string,
        location: UpdateLocationRequest
    ): Promise<void> {
        return ApiClient.post<void>(`/orders/${orderId}/location`, location);
    }

    /**
     * Delete order
     */
    static async deleteOrder(orderId: string): Promise<void> {
        return ApiClient.delete<void>(`/orders/${orderId}`);
    }

    /**
     * Submit review for order
     */
    static async submitReview(
        orderId: string,
        reviewData: { rating: number; comment?: string }
    ): Promise<Order> {
        return ApiClient.post<Order>(`/orders/${orderId}/review`, reviewData);
    }

    /**
     * Get order reviews
     */
    static async getReviews(orderId: string): Promise<any[]> {
        return ApiClient.get<any[]>(`/orders/${orderId}/reviews`);
    }

    /**
     * Get review status for order (check if already reviewed)
     */
    static async getReviewStatus(orderId: string): Promise<any> {
        return ApiClient.get<any>(`/orders/${orderId}/review-status`);
    }
}
