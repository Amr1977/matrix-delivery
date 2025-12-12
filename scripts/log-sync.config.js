/**
 * Production Log Sync Configuration
 * 
 * This configuration file controls how logs are synced from production VPS
 * to your local workspace for debugging and analysis.
 */

module.exports = {
    // VPS Connection Settings
    vps: {
        // SSH hostname for server management (NOT the public domain)
        // Public API: https://matrix-api.oldantique50.com
        // VPS SSH: vps283058.vps.ovh.ca
        host: 'oldantique50.com',
        user: 'root',
        port: 2222, // SSH port (default: 22)
        sshKeyPath: null, // null = use default SSH key, or specify path like '~/.ssh/id_rsa'
    },

    // Sync Settings
    sync: {
        // How often to sync logs (in milliseconds) when watching
        interval: 5 * 60 * 1000, // 5 minutes

        // Which log sources to fetch
        sources: {
            pm2: true,              // PM2 process logs
            winston: true,          // Winston file logs from backend/logs/
            postgresql: true,       // PostgreSQL database logs
            apache: true,           // Apache access and error logs
        },

        // Maximum lines to fetch per log file
        maxLines: 1000,

        // Use incremental sync (only fetch new logs since last sync)
        incremental: true,

        // Compress old logs after syncing
        compressOld: true,
    },

    // Analysis Settings
    analysis: {
        // Automatically analyze logs after each sync
        autoAnalyze: true,

        // Error patterns to detect
        patterns: {
            cors: /Not allowed by CORS/i,
            jwt: /jwt (malformed|expired)/i,
            auth: /authentication failed|unauthorized|forbidden/i,
            database: /database error|query failed|connection refused/i,
            timeout: /timeout|timed out/i,
            memory: /out of memory|heap|memory leak/i,
            crash: /uncaught exception|unhandled rejection/i,
        },

        // Notification Settings
        notifications: {
            enabled: true,
            criticalOnly: true,  // Only notify for critical errors
            sound: false,        // Play sound with notification
        },

        // Generate summary report
        generateReport: true,
    },

    // Storage Settings
    storage: {
        // Local directory for synced logs
        directory: 'vps-logs',

        // How many days to keep logs
        retention: 14,

        // Organize logs by date
        organizeByDate: true,

        // State file to track last sync
        stateFile: '.log-sync-state.json',
    },

    // Remote Paths (on VPS)
    remotePaths: {
        pm2Logs: '/root/.pm2/logs',
        winstonLogs: '/root/matrix-delivery/backend/logs',
        postgresqlLogs: '/var/log/postgresql',
        apacheLogs: '/var/log/apache2',
        apacheConfig: '/etc/apache2/sites-available/matrix-api.oldantique50.com-le-ssl.conf',
    },
};
