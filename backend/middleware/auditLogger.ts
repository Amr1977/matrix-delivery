import { Pool } from 'pg';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { AuditLogEntry } from '../types/security';

// Database pool will be injected
let pool: Pool;

/**
 * Initialize audit logger with database pool
 */
export const initAuditLogger = (dbPool: Pool): void => {
    pool = dbPool;

    // Create audit_logs table if it doesn't exist
    pool.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(255),
      action VARCHAR(100) NOT NULL,
      resource VARCHAR(255) NOT NULL,
      details JSONB,
      ip_address VARCHAR(45),
      user_agent TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `).then(() => {
        // Create indexes for performance
        return pool.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
    `);
    }).then(() => {
        console.log('✅ Audit logging initialized');
    }).catch(error => {
        console.error('❌ Failed to initialize audit logging:', error);
    });
};

/**
 * Log audit event to database
 */
export const auditLog = async (
    userId: string | undefined,
    action: string,
    resource: string,
    details: Record<string, any>,
    ipAddress: string,
    userAgent: string
): Promise<void> => {
    if (!pool) {
        console.error('Audit logger not initialized');
        return;
    }

    try {
        await pool.query(
            `INSERT INTO audit_logs (user_id, action, resource, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6)`,
            [userId || null, action, resource, JSON.stringify(details), ipAddress, userAgent]
        );
    } catch (error) {
        console.error('Failed to write audit log:', error);
        // Don't throw - audit logging should not break application flow
    }
};

/**
 * Audit middleware for Express routes
 */
export const auditMiddleware = (action: string, resource: string): RequestHandler => {
    return async (req: Request, res: Response, next: NextFunction) => {
        // Capture original send function
        const originalSend = res.send;

        // Override send to log after response
        res.send = function (data: any): Response {
            // Log the audit event
            auditLog(
                (req as any).user?.userId,
                action,
                resource,
                {
                    method: req.method,
                    path: req.path,
                    status: res.statusCode,
                    query: req.query,
                    params: req.params
                },
                req.ip || req.socket.remoteAddress || 'unknown',
                req.get('user-agent') || 'unknown'
            ).catch(err => console.error('Audit log error:', err));

            // Call original send
            return originalSend.call(this, data);
        };

        next();
    };
};

/**
 * Log authentication events (login, logout, failed attempts)
 */
export const logAuthEvent = async (
    userId: string | undefined,
    action: 'login' | 'logout' | 'login_failed' | 'register' | 'password_reset',
    success: boolean,
    req: Request,
    details?: Record<string, any>
): Promise<void> => {
    await auditLog(
        userId,
        action,
        'authentication',
        {
            success,
            email: details?.email,
            reason: details?.reason,
            ...details
        },
        req.ip || req.socket.remoteAddress || 'unknown',
        req.get('user-agent') || 'unknown'
    );
};

/**
 * Log payment events
 */
export const logPaymentEvent = async (
    userId: string,
    action: 'payment_initiated' | 'payment_completed' | 'payment_failed' | 'refund',
    orderId: string,
    amount: number,
    req: Request,
    details?: Record<string, any>
): Promise<void> => {
    await auditLog(
        userId,
        action,
        'payment',
        {
            orderId,
            amount,
            currency: details?.currency || 'USD',
            ...details
        },
        req.ip || req.socket.remoteAddress || 'unknown',
        req.get('user-agent') || 'unknown'
    );
};

/**
 * Log data access events (for GDPR compliance)
 */
export const logDataAccess = async (
    userId: string,
    action: 'data_export' | 'data_deletion' | 'profile_update',
    req: Request,
    details?: Record<string, any>
): Promise<void> => {
    await auditLog(
        userId,
        action,
        'user_data',
        details || {},
        req.ip || req.socket.remoteAddress || 'unknown',
        req.get('user-agent') || 'unknown'
    );
};

/**
 * Get audit logs for a user (for transparency)
 */
export const getUserAuditLogs = async (
    userId: string,
    limit: number = 100,
    offset: number = 0
): Promise<AuditLogEntry[]> => {
    if (!pool) {
        throw new Error('Audit logger not initialized');
    }

    const result = await pool.query(
        `SELECT user_id, action, resource, details, ip_address, user_agent, created_at
     FROM audit_logs
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
    );

    return result.rows.map(row => ({
        userId: row.user_id,
        action: row.action,
        resource: row.resource,
        details: row.details,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        timestamp: row.created_at
    }));
};

/**
 * Clean up old audit logs (retention policy)
 */
export const cleanupOldAuditLogs = async (retentionDays: number = 90): Promise<number> => {
    if (!pool) {
        throw new Error('Audit logger not initialized');
    }

    const result = await pool.query(
        `DELETE FROM audit_logs
     WHERE created_at < NOW() - INTERVAL '${retentionDays} days'`
    );

    return result.rowCount || 0;
};

export default {
    initAuditLogger,
    auditLog,
    auditMiddleware,
    logAuthEvent,
    logPaymentEvent,
    logDataAccess,
    getUserAuditLogs,
    cleanupOldAuditLogs
};
