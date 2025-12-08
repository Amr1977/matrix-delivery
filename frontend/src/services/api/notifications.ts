// Notifications API Service

import { ApiClient } from './client';
import { Notification } from './types';

export class NotificationsApi {
    /**
     * Get all notifications for current user
     */
    static async getNotifications(): Promise<Notification[]> {
        return ApiClient.get<Notification[]>('/notifications');
    }

    /**
     * Mark notification as read
     */
    static async markAsRead(notificationId: string): Promise<void> {
        return ApiClient.post<void>(`/notifications/${notificationId}/read`);
    }

    /**
     * Mark all notifications as read
     */
    static async markAllAsRead(): Promise<void> {
        return ApiClient.post<void>('/notifications/read-all');
    }

    /**
     * Delete notification
     */
    static async deleteNotification(notificationId: string): Promise<void> {
        return ApiClient.delete<void>(`/notifications/${notificationId}`);
    }
}
