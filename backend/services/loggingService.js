const logger = require('../logger');

/**
 * Logging Service
 * Handles database persistence of logs from both frontend and backend
 */
class LoggingService {
    constructor(pool) {
        this.pool = pool;
        this.logRetentionDays = 30;
    }

    /**
     * Create a log entry in the database
     * @param {Object} logData - Log entry data
     * @returns {Promise<Object>} Created log entry
     */
    async createLog(logData) {
        try {
            const {
                level,
                source,
                category,
                message,
                userId,
                sessionId,
                url,
                method,
                statusCode,
                durationMs,
                ipAddress,
                userAgent,
                stackTrace,
                metadata
            } = logData;

            const result = await this.pool.query(
                `INSERT INTO logs (
          level, source, category, message, user_id, session_id,
          url, method, status_code, duration_ms, ip_address, user_agent,
          stack_trace, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *`,
                [
                    level,
                    source,
                    category,
                    message,
                    userId || null,
                    sessionId || null,
                    url || null,
                    method || null,
                    statusCode || null,
                    durationMs || null,
                    ipAddress || null,
                    userAgent || null,
                    stackTrace || null,
                    metadata ? JSON.stringify(metadata) : null
                ]
            );

            return result.rows[0];
        } catch (error) {
            // Log to Winston but don't throw to avoid infinite loops
            logger.error('Failed to create log entry in database', {
                error: error.message,
                stack: error.stack,
                category: 'logging_service'
            });
            return null;
        }
    }

    /**
     * Retrieve logs with filtering and pagination
     * @param {Object} filters - Filter criteria
     * @returns {Promise<Object>} Logs and pagination info
     */
    async getLogs(filters = {}) {
        try {
            const {
                level,
                source,
                category,
                startDate,
                endDate,
                userId,
                search,
                page = 1,
                limit = 50
            } = filters;

            const conditions = [];
            const params = [];
            let paramIndex = 1;

            if (level) {
                conditions.push(`level = $${paramIndex++}`);
                params.push(level);
            }

            if (source) {
                conditions.push(`source = $${paramIndex++}`);
                params.push(source);
            }

            if (category) {
                conditions.push(`category = $${paramIndex++}`);
                params.push(category);
            }

            if (userId) {
                conditions.push(`user_id = $${paramIndex++}`);
                params.push(userId);
            }

            if (startDate) {
                conditions.push(`timestamp >= $${paramIndex++}`);
                params.push(startDate);
            }

            if (endDate) {
                conditions.push(`timestamp <= $${paramIndex++}`);
                params.push(endDate);
            }

            if (search) {
                conditions.push(`(
          message ILIKE $${paramIndex} OR
          stack_trace ILIKE $${paramIndex} OR
          metadata::text ILIKE $${paramIndex}
        )`);
                params.push(`%${search}%`);
                paramIndex++;
            }

            const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

            // Get total count
            const countResult = await this.pool.query(
                `SELECT COUNT(*) FROM logs ${whereClause}`,
                params
            );
            const totalCount = parseInt(countResult.rows[0].count);

            // Get paginated logs
            const offset = (page - 1) * limit;
            params.push(limit, offset);

            const logsResult = await this.pool.query(
                `SELECT * FROM logs ${whereClause}
         ORDER BY timestamp DESC
         LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
                params
            );

            return {
                logs: logsResult.rows,
                pagination: {
                    page,
                    limit,
                    totalCount,
                    totalPages: Math.ceil(totalCount / limit),
                    hasMore: offset + logsResult.rows.length < totalCount
                }
            };
        } catch (error) {
            logger.error('Failed to retrieve logs from database', {
                error: error.message,
                stack: error.stack,
                category: 'logging_service'
            });
            throw error;
        }
    }

    /**
     * Get a single log entry by ID
     * @param {number} logId - Log entry ID
     * @returns {Promise<Object>} Log entry
     */
    async getLogById(logId) {
        try {
            const result = await this.pool.query(
                'SELECT * FROM logs WHERE id = $1',
                [logId]
            );
            return result.rows[0] || null;
        } catch (error) {
            logger.error('Failed to retrieve log by ID', {
                error: error.message,
                logId,
                category: 'logging_service'
            });
            throw error;
        }
    }

    /**
     * Get log statistics
     * @returns {Promise<Object>} Log statistics
     */
    async getLogStats() {
        try {
            const result = await this.pool.query(`
        SELECT
          COUNT(*) as total_logs,
          COUNT(CASE WHEN level = 'error' THEN 1 END) as error_count,
          COUNT(CASE WHEN level = 'warn' THEN 1 END) as warn_count,
          COUNT(CASE WHEN level = 'info' THEN 1 END) as info_count,
          COUNT(CASE WHEN level = 'debug' THEN 1 END) as debug_count,
          COUNT(CASE WHEN source = 'frontend' THEN 1 END) as frontend_count,
          COUNT(CASE WHEN source = 'backend' THEN 1 END) as backend_count,
          COUNT(CASE WHEN timestamp >= NOW() - INTERVAL '24 hours' THEN 1 END) as last_24h_count,
          COUNT(CASE WHEN timestamp >= NOW() - INTERVAL '7 days' THEN 1 END) as last_7d_count
        FROM logs
      `);

            return result.rows[0];
        } catch (error) {
            logger.error('Failed to retrieve log statistics', {
                error: error.message,
                category: 'logging_service'
            });
            throw error;
        }
    }

    /**
     * Clean up old logs based on retention policy
     * @returns {Promise<number>} Number of deleted logs
     */
    async cleanupOldLogs() {
        try {
            const result = await this.pool.query(
                `DELETE FROM logs
         WHERE timestamp < NOW() - INTERVAL '${this.logRetentionDays} days'
         RETURNING id`
            );

            const deletedCount = result.rowCount;
            logger.info(`Cleaned up ${deletedCount} old log entries`, {
                category: 'logging_service',
                retentionDays: this.logRetentionDays
            });

            return deletedCount;
        } catch (error) {
            logger.error('Failed to cleanup old logs', {
                error: error.message,
                stack: error.stack,
                category: 'logging_service'
            });
            throw error;
        }
    }

    /**
     * Log backend event to database
     * @param {string} level - Log level (error, warn, info, debug)
     * @param {string} message - Log message
     * @param {Object} metadata - Additional metadata
     * @param {Object} req - Express request object (optional)
     */
    async logBackendEvent(level, message, metadata = {}, req = null) {
        const logData = {
            level,
            source: 'backend',
            category: metadata.category || 'general',
            message,
            userId: req?.user?.userId || metadata.userId || null,
            sessionId: req?.sessionID || metadata.sessionId || null,
            url: req?.originalUrl || metadata.url || null,
            method: req?.method || metadata.method || null,
            statusCode: metadata.statusCode || null,
            durationMs: metadata.durationMs || null,
            ipAddress: req?.ip || metadata.ipAddress || null,
            userAgent: req?.get('User-Agent') || metadata.userAgent || null,
            stackTrace: metadata.stack || null,
            metadata: metadata
        };

        return await this.createLog(logData);
    }

    /**
     * Log frontend event to database
     * @param {Object} logData - Frontend log data
     */
    async logFrontendEvent(logData) {
        const enrichedData = {
            ...logData,
            source: 'frontend',
            level: logData.level || 'info',
            category: logData.category || 'general'
        };

        return await this.createLog(enrichedData);
    }
}

module.exports = LoggingService;
