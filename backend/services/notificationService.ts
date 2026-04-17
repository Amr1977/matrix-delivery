import { Pool } from "pg";
import { Server as SocketIOServer } from "socket.io";
import { getPushService } from "./pushNotificationService";

/**
 * Notification creation parameters
 */
export interface CreateNotificationParams {
  userId: string;
  orderId: string | null;
  type: string;
  title: string;
  message: string;
}

/**
 * Notification database record
 */
export interface NotificationRecord {
  id: number;
  user_id: string;
  order_id: string | null;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: Date;
}

/**
 * NotificationService - Handles creation and real-time delivery of notifications
 *
 * This service is responsible for:
 * - Creating notifications in the database
 * - Emitting real-time notifications via WebSocket
 * - Logging notification events
 */
export class NotificationService {
  private pool: Pool;
  private io: SocketIOServer | null;
  private logger: any;

  /**
   * Initialize the notification service
   * @param pool - PostgreSQL connection pool
   * @param io - Socket.IO server instance (optional)
   * @param logger - Logger instance
   */
  constructor(pool: Pool, io: SocketIOServer | null, logger: any) {
    this.pool = pool;
    this.io = io;
    this.logger = logger;
  }

  /**
   * Set the Socket.IO instance
   */
  setIo(io: SocketIOServer) {
    this.io = io;
  }

  /**
   * Create a notification and emit it via WebSocket
   * @param params - Notification parameters
   * @returns The created notification record
   */
  async createNotification(
    params: CreateNotificationParams,
  ): Promise<NotificationRecord | null> {
    const { userId, orderId, type, title, message } = params;

    try {
      const result = await this.pool.query<NotificationRecord>(
        `INSERT INTO notifications (user_id, order_id, type, title, message)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, user_id, order_id, type, title, message, is_read, created_at`,
        [userId, orderId, type, title, message],
      );

      const notification = result.rows[0];

      // Emit real-time notification via WebSocket
      if (this.io) {
        this.io.to(`user_${userId}`).emit("notification", {
          id: notification.id,
          orderId: notification.order_id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          isRead: false,
          createdAt: notification.created_at,
        });

        this.logger.info("Real-time notification sent", {
          userId,
          title,
          category: "notification",
        });
      }

      // NEW: Send push notification
      try {
        const pushService = getPushService();
        await pushService.sendPushToUser(userId, {
          title,
          body: message,
          data: {
            type,
            orderId: orderId || "",
            notificationId: String(notification.id),
          },
        });
      } catch (pushError) {
        this.logger.error("Push notification failed:", pushError);
        // Don't fail the main operation if push fails
      }

      return notification;
    } catch (error) {
      this.logger.error("Error creating notification:", error);
      return null;
    }
  }

  /**
   * Create a notification (legacy function signature for backward compatibility)
   * @deprecated Use createNotification with params object instead
   */
  async create(
    userId: string,
    orderId: string | null,
    type: string,
    title: string,
    message: string,
  ): Promise<NotificationRecord | null> {
    return this.createNotification({ userId, orderId, type, title, message });
  }

  /**
   * Get all notifications for a user
   */
  async getNotificationsByUser(userId: string): Promise<NotificationRecord[]> {
    try {
      const result = await this.pool.query(
        `SELECT id, user_id, order_id, type, title, message, is_read, created_at, metadata
                 FROM notifications 
                 WHERE user_id = $1 
                 ORDER BY created_at DESC 
                 LIMIT 100`,
        [userId],
      );
      return result.rows;
    } catch (error) {
      this.logger.error("Error getting notifications:", error);
      return [];
    }
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await this.pool.query(
      "UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2",
      [notificationId, userId],
    );
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<void> {
    await this.pool.query(
      "UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false",
      [userId],
    );
  }

  /**
   * Delete a notification
   */
  async deleteNotification(
    notificationId: string,
    userId: string,
  ): Promise<void> {
    await this.pool.query(
      "DELETE FROM notifications WHERE id = $1 AND user_id = $2",
      [notificationId, userId],
    );
  }
}

/**
 * Singleton instance of NotificationService
 * Will be initialized by server.js after pool and io are created
 */
let notificationServiceInstance: NotificationService | null = null;

/**
 * Initialize the notification service singleton
 */
export function initializeNotificationService(
  pool: Pool,
  io: SocketIOServer | null,
  logger: any,
): NotificationService {
  notificationServiceInstance = new NotificationService(pool, io, logger);
  return notificationServiceInstance;
}

/**
 * Get the notification service instance
 * @throws Error if service hasn't been initialized
 */
export function getNotificationService(): NotificationService {
  if (!notificationServiceInstance) {
    throw new Error(
      "NotificationService has not been initialized. Call initializeNotificationService first.",
    );
  }
  return notificationServiceInstance;
}

/**
 * Helper function for backward compatibility with existing code
 * Maintains the same function signature as the old createNotification
 */
export async function createNotification(
  userId: string,
  orderId: string | null,
  type: string,
  title: string,
  message: string,
): Promise<NotificationRecord | null> {
  const service = getNotificationService();
  return service.createNotification({ userId, orderId, type, title, message });
}
