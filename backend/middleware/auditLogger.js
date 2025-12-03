"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupOldAuditLogs = exports.getUserAuditLogs = exports.logDataAccess = exports.logPaymentEvent = exports.logAuthEvent = exports.auditMiddleware = exports.auditLog = exports.initAuditLogger = void 0;
// Database pool will be injected
let pool;
/**
 * Initialize audit logger with database pool
 */
const initAuditLogger = (dbPool) => {
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
exports.initAuditLogger = initAuditLogger;
/**
 * Log audit event to database
 */
const auditLog = async (userId, action, resource, details, ipAddress, userAgent) => {
    if (!pool) {
        console.error('Audit logger not initialized');
        return;
    }
    try {
        await pool.query(`INSERT INTO audit_logs (user_id, action, resource, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6)`, [userId || null, action, resource, JSON.stringify(details), ipAddress, userAgent]);
    }
    catch (error) {
        console.error('Failed to write audit log:', error);
        // Don't throw - audit logging should not break application flow
    }
};
exports.auditLog = auditLog;
/**
 * Audit middleware for Express routes
 */
const auditMiddleware = (action, resource) => {
    return async (req, res, next) => {
        // Capture original send function
        const originalSend = res.send;
        // Override send to log after response
        res.send = function (data) {
            // Log the audit event
            (0, exports.auditLog)(req.user?.userId, action, resource, {
                method: req.method,
                path: req.path,
                status: res.statusCode,
                query: req.query,
                params: req.params
            }, req.ip || req.socket.remoteAddress || 'unknown', req.get('user-agent') || 'unknown').catch(err => console.error('Audit log error:', err));
            // Call original send
            return originalSend.call(this, data);
        };
        next();
    };
};
exports.auditMiddleware = auditMiddleware;
/**
 * Log authentication events (login, logout, failed attempts)
 */
const logAuthEvent = async (userId, action, success, req, details) => {
    await (0, exports.auditLog)(userId, action, 'authentication', {
        success,
        email: details?.email,
        reason: details?.reason,
        ...details
    }, req.ip || req.socket.remoteAddress || 'unknown', req.get('user-agent') || 'unknown');
};
exports.logAuthEvent = logAuthEvent;
/**
 * Log payment events
 */
const logPaymentEvent = async (userId, action, orderId, amount, req, details) => {
    await (0, exports.auditLog)(userId, action, 'payment', {
        orderId,
        amount,
        currency: details?.currency || 'USD',
        ...details
    }, req.ip || req.socket.remoteAddress || 'unknown', req.get('user-agent') || 'unknown');
};
exports.logPaymentEvent = logPaymentEvent;
/**
 * Log data access events (for GDPR compliance)
 */
const logDataAccess = async (userId, action, req, details) => {
    await (0, exports.auditLog)(userId, action, 'user_data', details || {}, req.ip || req.socket.remoteAddress || 'unknown', req.get('user-agent') || 'unknown');
};
exports.logDataAccess = logDataAccess;
/**
 * Get audit logs for a user (for transparency)
 */
const getUserAuditLogs = async (userId, limit = 100, offset = 0) => {
    if (!pool) {
        throw new Error('Audit logger not initialized');
    }
    const result = await pool.query(`SELECT user_id, action, resource, details, ip_address, user_agent, created_at
     FROM audit_logs
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`, [userId, limit, offset]);
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
exports.getUserAuditLogs = getUserAuditLogs;
/**
 * Clean up old audit logs (retention policy)
 */
const cleanupOldAuditLogs = async (retentionDays = 90) => {
    if (!pool) {
        throw new Error('Audit logger not initialized');
    }
    const result = await pool.query(`DELETE FROM audit_logs
     WHERE created_at < NOW() - INTERVAL '${retentionDays} days'`);
    return result.rowCount || 0;
};
exports.cleanupOldAuditLogs = cleanupOldAuditLogs;
exports.default = {
    initAuditLogger: exports.initAuditLogger,
    auditLog: exports.auditLog,
    auditMiddleware: exports.auditMiddleware,
    logAuthEvent: exports.logAuthEvent,
    logPaymentEvent: exports.logPaymentEvent,
    logDataAccess: exports.logDataAccess,
    getUserAuditLogs: exports.getUserAuditLogs,
    cleanupOldAuditLogs: exports.cleanupOldAuditLogs
};
