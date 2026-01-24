const express = require('express');
const router = express.Router();
const logger = require('../config/logger');
const { verifyToken, requireAdmin } = require('../middleware/auth');

/**
 * Logs API Routes
 * Handles log retrieval and frontend log submission
 */

module.exports = (pool) => {
    const LoggingService = require('../services/loggingService');
    const loggingService = new LoggingService(pool);



    /**
     * POST /api/logs/frontend
     * Receive logs from frontend (single or batch)
     */
    router.post('/frontend', async (req, res) => {
        try {
            const payload = req.body;
            
            if (!payload) {
                console.error('[LOGS_API] No payload received in request body');
                return res.status(400).json({ error: 'No payload received' });
            }

            // Handle batch of logs (array)
            if (Array.isArray(payload)) {
                payload.forEach(logEntry => {
                    if (!logEntry) return;
                    const { level, message, details, timestamp } = logEntry;
                    try {
                        logger.info(`[FRONTEND] ${message}`, {
                            ...details,
                            source: 'frontend',
                            originalTimestamp: timestamp,
                            level: level || 'info'
                        });
                    } catch (err) {
                        console.error('[LOGS_API] Error logging entry:', err);
                    }
                });
            } else {
                // Handle single log
                const { level, message, details, timestamp } = payload;
                try {
                    logger.info(`[FRONTEND] ${message}`, {
                        ...details,
                        source: 'frontend',
                        originalTimestamp: timestamp,
                        level: level || 'info'
                    });
                } catch (err) {
                    console.error('[LOGS_API] Error logging single entry:', err);
                }
            }

            res.status(200).json({ success: true });
        } catch (error) {
            console.error('[LOGS_API] Failed to process frontend log:', error);
            res.status(500).json({ error: 'Failed to process log: ' + error.message });
        }
    });

    /**
     * GET /api/logs
     * Retrieve logs with filtering (admin only)
     * Query params: level, source, category, startDate, endDate, userId, search, page, limit
     */
    router.get('/', verifyToken, requireAdmin, async (req, res) => {
        try {
            const filters = {
                level: req.query.level,
                source: req.query.source,
                category: req.query.category,
                startDate: req.query.startDate,
                endDate: req.query.endDate,
                userId: req.query.userId,
                search: req.query.search,
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 50
            };

            const result = await loggingService.getLogs(filters);

            logger.info('Retrieved logs', {
                category: 'logs_api',
                filters,
                resultCount: result.logs.length,
                adminUserId: req.user?.userId
            });

            res.json(result);
        } catch (error) {
            logger.error('Failed to retrieve logs', {
                error: error.message,
                stack: error.stack,
                category: 'logs_api'
            });
            res.status(500).json({ error: 'Failed to retrieve logs' });
        }
    });

    /**
     * GET /api/logs/stats
     * Get log statistics (admin only)
     */
    router.get('/stats', verifyToken, requireAdmin, async (req, res) => {
        try {
            const stats = await loggingService.getLogStats();

            logger.info('Retrieved log statistics', {
                category: 'logs_api',
                adminUserId: req.user?.userId
            });

            res.json(stats);
        } catch (error) {
            logger.error('Failed to retrieve log statistics', {
                error: error.message,
                stack: error.stack,
                category: 'logs_api'
            });
            res.status(500).json({ error: 'Failed to retrieve log statistics' });
        }
    });

    /**
     * GET /api/logs/:id
     * Get single log entry by ID (admin only)
     */
    router.get('/:id', verifyToken, requireAdmin, async (req, res) => {
        try {
            const logId = parseInt(req.params.id);
            const log = await loggingService.getLogById(logId);

            if (!log) {
                return res.status(404).json({ error: 'Log not found' });
            }

            logger.info('Retrieved log by ID', {
                category: 'logs_api',
                logId,
                adminUserId: req.user?.userId
            });

            res.json(log);
        } catch (error) {
            logger.error('Failed to retrieve log by ID', {
                error: error.message,
                stack: error.stack,
                category: 'logs_api',
                logId: req.params.id
            });
            res.status(500).json({ error: 'Failed to retrieve log' });
        }
    });

    /**
     * DELETE /api/logs/cleanup
     * Manual cleanup of old logs (admin only)
     */
    router.delete('/cleanup', verifyToken, requireAdmin, async (req, res) => {
        try {
            const deletedCount = await loggingService.cleanupOldLogs();

            logger.info('Manual log cleanup completed', {
                category: 'logs_api',
                deletedCount,
                adminUserId: req.user?.userId
            });

            res.json({
                message: 'Log cleanup completed',
                deletedCount
            });
        } catch (error) {
            logger.error('Failed to cleanup logs', {
                error: error.message,
                stack: error.stack,
                category: 'logs_api'
            });
            res.status(500).json({ error: 'Failed to cleanup logs' });
        }
    });

    return router;
};
