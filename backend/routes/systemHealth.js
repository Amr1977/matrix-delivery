const express = require('express');
const os = require('os');
const router = express.Router();
const { execSync } = require('child_process');
const pool = require('../config/db');
const logger = require('../config/logger');
const { verifyToken } = require('../middleware/auth');

// ============================================
// HEALTH COLLECTOR SERVICE
// Runs every 60 seconds to capture system metrics
// ============================================

let collectorInterval = null;
const COLLECTION_INTERVAL_MS = 60 * 1000; // 1 minute

/**
 * Get current system health metrics
 */
const getSystemMetrics = () => {
    try {
        // Memory stats via /proc/meminfo (Linux)
        let memoryPercent = 0;
        let memoryUsedMb = 0;
        let memoryAvailableMb = 0;

        try {
            // Try free -m first (Linux)
            const memInfo = execSync('free -m', { encoding: 'utf8', timeout: 5000 });
            const lines = memInfo.split('\n');
            const memLine = lines.find(l => l.startsWith('Mem:'));
            if (memLine) {
                const parts = memLine.split(/\s+/);
                const total = parseInt(parts[1]) || 1;
                memoryUsedMb = parseInt(parts[2]) || 0;
                memoryAvailableMb = parseInt(parts[6]) || parseInt(parts[3]) || 0;
                memoryPercent = Math.round((memoryUsedMb / total) * 100 * 100) / 100;
            }
        } catch (e) {
            // Fallback to os module (Windows/Mac)
            const total = os.totalmem();
            const free = os.freemem();
            const used = total - free;

            memoryUsedMb = Math.round(used / 1024 / 1024);
            memoryAvailableMb = Math.round(free / 1024 / 1024);
            memoryPercent = Math.round((used / total) * 100 * 100) / 100;
        }

        // PM2 stats
        let pm2TotalMemoryMb = 0;
        let pm2Processes = [];

        try {
            // Check if pm2 is installed first to avoid ugly errors in dev
            try {
                execSync('pm2 -v', { stdio: 'ignore' });
            } catch (ignore) {
                // PM2 not installed, return empty
                return {
                    memoryPercent,
                    memoryUsedMb,
                    memoryAvailableMb,
                    pm2TotalMemoryMb: 0,
                    pm2Processes: []
                };
            }

            const pm2Output = execSync('pm2 jlist', { encoding: 'utf8', timeout: 5000 });
            const pm2Data = JSON.parse(pm2Output);
            pm2Processes = pm2Data.map(p => ({
                name: p.name,
                status: p.pm2_env?.status || 'unknown',
                memory_mb: Math.round((p.monit?.memory || 0) / 1024 / 1024),
                restarts: p.pm2_env?.restart_time || 0
            }));
            pm2TotalMemoryMb = pm2Processes.reduce((sum, p) => sum + p.memory_mb, 0);
        } catch (e) {
            // SIlent fail for PM2
        }

        // CPU Load (1 min average)
        const cpuLoad = os.loadavg()[0];

        return {
            memoryPercent,
            memoryUsedMb,
            memoryAvailableMb,
            pm2TotalMemoryMb,
            pm2Processes,
            cpuLoad
        };
    } catch (error) {
        logger.error('Error collecting system metrics:', error);
        return null;
    }
};

/**
 * Store health snapshot in database
 */
const storeHealthSnapshot = async () => {
    const metrics = getSystemMetrics();
    if (!metrics) return;

    try {
        await pool.query(`
            INSERT INTO system_health_logs 
            (memory_percent, memory_used_mb, memory_available_mb, pm2_total_memory_mb, pm2_processes, cpu_load)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [
            metrics.memoryPercent,
            metrics.memoryUsedMb,
            metrics.memoryAvailableMb,
            metrics.pm2TotalMemoryMb,
            JSON.stringify(metrics.pm2Processes),
            metrics.cpuLoad
        ]);

        // Cleanup old data (older than 3 days)
        await pool.query(`DELETE FROM system_health_logs WHERE timestamp < NOW() - INTERVAL '3 days'`);

    } catch (error) {
        // Table might not exist yet - that's ok
        if (error.code !== '42P01') {
            logger.error('Error storing health snapshot:', error);
        }
    }
};

/**
 * Start the health collector
 */
const startCollector = () => {
    // Optimization: In PM2 Cluster Mode, only run on Instance 0
    // This prevents 4x DB writes and execSync calls every minute
    const instanceId = process.env.NODE_APP_INSTANCE;
    if (instanceId && instanceId !== '0') {
        // logger.info(`Health collector skipped on instance ${instanceId}`);
        return;
    }

    if (collectorInterval) return;

    // Collect immediately, then every minute
    storeHealthSnapshot();
    collectorInterval = setInterval(storeHealthSnapshot, COLLECTION_INTERVAL_MS);
    collectorInterval.unref();

    logger.info(`✅ System health collector started (Instance: ${instanceId || 'Single'})`);
};

/**
 * Stop the health collector
 */
const stopCollector = () => {
    if (collectorInterval) {
        clearInterval(collectorInterval);
        collectorInterval = null;
    }
};

// Start collector when this module is loaded
startCollector();

// ============================================
// API ROUTES
// ============================================

/**
 * GET /api/admin/health/current
 * Returns current system health metrics
 */
router.get('/current', verifyToken, async (req, res) => {
    try {
        // Check admin role
        if (req.user.role !== 'admin' && req.user.primary_role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const metrics = getSystemMetrics();
        if (!metrics) {
            return res.status(500).json({ error: 'Could not collect metrics' });
        }

        // Get uptime
        let uptimeStr = 'N/A';
        try {
            uptimeStr = execSync('uptime -p', { encoding: 'utf8', timeout: 5000 }).trim().replace('up ', '');
        } catch (e) { /* ignore */ }

        // Check DB Connectivity
        let dbStatus = 'unknown';
        let dbLatency = 0;
        try {
            const start = Date.now();
            await pool.query('SELECT 1');
            dbLatency = Date.now() - start;
            dbStatus = 'connected';
        } catch (dbErr) {
            logger.error('Health Check DB Error:', dbErr);
            dbStatus = 'disconnected';
        }

        res.json({
            ...metrics,
            uptime: uptimeStr,
            dbStatus,
            dbLatency,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Error getting current health:', error);
        res.status(500).json({ error: 'Failed to get health metrics' });
    }
});

/**
 * GET /api/admin/health/history
 * Returns health history for charts
 * Query params: hours (default: 24, max: 72)
 */
router.get('/history', verifyToken, async (req, res) => {
    try {
        // Check admin role
        if (req.user.role !== 'admin' && req.user.primary_role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const hours = Math.min(parseInt(req.query.hours) || 24, 72);

        const result = await pool.query(`
            SELECT 
                timestamp,
                memory_percent,
                memory_used_mb,
                memory_available_mb,
                pm2_total_memory_mb,
                pm2_processes,
                cpu_load
            FROM system_health_logs
            WHERE timestamp > NOW() - INTERVAL '${hours} hours'
            ORDER BY timestamp ASC
        `);

        res.json({
            hours,
            dataPoints: result.rows.length,
            history: result.rows.map(row => ({
                timestamp: row.timestamp,
                memoryPercent: parseFloat(row.memory_percent),
                memoryUsedMb: row.memory_used_mb,
                memoryAvailableMb: row.memory_available_mb,
                pm2TotalMemoryMb: row.pm2_total_memory_mb,
                pm2Processes: row.pm2_processes
            }))
        });
    } catch (error) {
        logger.error('Error getting health history:', error);
        res.status(500).json({ error: 'Failed to get health history' });
    }
});

module.exports = router;
module.exports.startCollector = startCollector;
module.exports.stopCollector = stopCollector;
