import { Pool } from 'pg';
import admin from '../config/firebase-admin';
const logger = require('../config/logger');

interface PushPayload {
    title: string;
    body: string;
    data?: Record<string, string>;
}

interface PushResult {
    success: boolean;
    tokenDeleted?: boolean;
    error?: string;
}

/**
 * PushNotificationService - Handles FCM push notifications
 */
export class PushNotificationService {
    private pool: Pool;
    private logger: any;

    constructor(pool: Pool) {
        this.pool = pool;
        this.logger = logger;
    }

    /**
     * Send push notification to a single token
     */
    async sendPush(token: string, payload: PushPayload): Promise<PushResult> {
        try {
            await admin.messaging().send({
                token,
                notification: {
                    title: payload.title,
                    body: payload.body
                },
                data: payload.data || {}
            });

            return { success: true };
        } catch (error: any) {
            // Handle invalid/expired tokens
            if (error.code === 'messaging/registration-token-not-registered') {
                await this.deleteToken(token);
                this.logger.warn('Deleted stale FCM token');
                return { success: false, tokenDeleted: true };
            }

            this.logger.error('FCM send error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send push to all tokens for a user
     */
    async sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
        const result = await this.pool.query(
            'SELECT token FROM fcm_tokens WHERE user_id = $1 AND is_active = true',
            [userId]
        );

        const results = await Promise.all(
            result.rows.map(row => this.sendPush(row.token, payload))
        );

        // Log stats
        const successful = results.filter(r => r.success).length;
        const deleted = results.filter(r => r.tokenDeleted).length;
        const failed = results.filter(r => !r.success && !r.tokenDeleted).length;

        this.logger.info('Push notification sent', {
            userId,
            successful,
            deleted,
            failed
        });
    }

    /**
     * Register a new FCM token for a user
     */
    async registerToken(userId: string, role: string, token: string, deviceInfo?: string): Promise<void> {
        await this.pool.query(`
            INSERT INTO fcm_tokens (user_id, role, token, device_info)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (token)
            DO UPDATE SET user_id = EXCLUDED.user_id,
                          role = EXCLUDED.role,
                          device_info = EXCLUDED.device_info,
                          updated_at = NOW(),
                          is_active = true
        `, [userId, role, token, deviceInfo]);

        this.logger.info('FCM token registered', { userId, role });
    }

    /**
     * Deactivate a token (on logout or explicit unregister)
     */
    async deactivateToken(token: string): Promise<void> {
        await this.pool.query(
            'UPDATE fcm_tokens SET is_active = false WHERE token = $1',
            [token]
        );
    }

    /**
     * Delete an invalid token
     */
    private async deleteToken(token: string): Promise<void> {
        await this.pool.query('DELETE FROM fcm_tokens WHERE token = $1', [token]);
    }
}

let pushServiceInstance: PushNotificationService | null = null;

export function initializePushService(pool: Pool): PushNotificationService {
    pushServiceInstance = new PushNotificationService(pool);
    return pushServiceInstance;
}

export function getPushService(): PushNotificationService {
    if (!pushServiceInstance) {
        throw new Error('PushNotificationService not initialized');
    }
    return pushServiceInstance;
}