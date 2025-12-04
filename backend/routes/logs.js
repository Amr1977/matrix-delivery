const express = require('express');
const router = express.Router();
const logger = require('../logger');

/**
 * Logs API Routes
 * Handles log retrieval and frontend log submission
 */

module.exports = (pool, verifyToken, isAdmin) => {
    const LoggingService = require('../services/loggingService');
    const loggingService = new LoggingService(pool);

    /**
     * POST /api/logs/frontend
     * Receive logs from frontend (authenticated users only)
     */
    router.post('/frontend', verifyToken, async (req, res) => {
        try {
            const logData = req.body;

            // Support both single log and batch logs
            const logs = Array.isArray(logData) ? logData : [logData];

            // Process logs in parallel for better performance
            const results = await Promise.allSettled(
                logs.map(log => loggingService.logFrontendEvent({
                    ...log,
                    userId: req.user?.userId || log.userId,
                    ipAddress: req.ip,
                    userAgent: req.get('User-Agent')
                }))
            );

            const successCount = results.filter(r => r.status === 'fulfilled').length;
            const failureCount = results.filter(r => r.status === 'rejected').length;

            logger.info(`Received ${logs.length} frontend logs`, {
                category: 'logs_api',
                successCount,
                failureCount,
                userId: req.user?.userId
            });

            res.status(201).json({
                message: 'Logs received',
                received: logs.length,
                success: successCount,
                failed: failureCount
            });
        } catch (error) {
            logger.error('Failed to process frontend logs', {
                error: error.message,
                stack: error.stack,
                category: 'logs_api'
            });
            res.status(500).json({ error: 'Failed to process logs' });
        }
    });

    /**
     * GET /api/logs
     * Retrieve logs with filtering (admin only)
     * Query params: level, source, category, startDate, endDate, userId, search, page, limit
     */
    router.get('/', verifyToken, isAdmin, async (req, res) => {
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
    router.get('/stats', verifyToken, isAdmin, async (req, res) => {
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
    router.get('/:id', verifyToken, isAdmin, async (req, res) => {
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
    router.delete('/cleanup', verifyToken, isAdmin, async (req, res) => {
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
