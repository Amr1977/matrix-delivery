#!/usr/bin/env node

/**
 * Production Log Sync Script
 * 
 * Fetches logs from production VPS to local workspace for debugging.
 * Supports multiple log sources, incremental sync, and automatic categorization.
 * 
 * Usage:
 *   npm run logs:sync
 *   node scripts/sync-production-logs.js
 *   node scripts/sync-production-logs.js --filter "CORS"
 *   node scripts/sync-production-logs.js --sources pm2,winston
 *   node scripts/sync-production-logs.js --lines 500
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const execAsync = promisify(exec);
const config = require('./log-sync.config.js');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
    filter: '',
    lines: config.sync.maxLines,
    sources: Object.keys(config.sync.sources).filter(s => config.sync.sources[s]),
    incremental: config.sync.incremental,
};

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--filter' && args[i + 1]) {
        options.filter = args[i + 1];
        i++;
    } else if (args[i] === '--lines' && args[i + 1]) {
        options.lines = parseInt(args[i + 1]);
        i++;
    } else if (args[i] === '--sources' && args[i + 1]) {
        options.sources = args[i + 1].split(',').map(s => s.trim());
        i++;
    } else if (args[i] === '--no-incremental') {
        options.incremental = false;
    }
}

// Setup paths
const localLogDir = path.join(__dirname, '..', config.storage.directory);
const stateFile = path.join(__dirname, '..', config.storage.stateFile);
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

// Color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    gray: '\x1b[90m',
};

// Helper functions
function log(message, color = 'white') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(emoji, message, color = 'cyan') {
    console.log(`\n${colors[color]}${emoji} ${message}${colors.reset}`);
}

function logSuccess(message) {
    log(`   ✅ ${message}`, 'green');
}

function logError(message) {
    log(`   ❌ ${message}`, 'red');
}

function logInfo(message) {
    log(`   ${message}`, 'gray');
}

// Create local log directory
function ensureLogDirectory() {
    if (!fs.existsSync(localLogDir)) {
        fs.mkdirSync(localLogDir, { recursive: true });
    }

    // Create subdirectories for organization
    const subdirs = ['pm2', 'winston', 'postgresql', 'apache', 'analysis'];
    subdirs.forEach(dir => {
        const dirPath = path.join(localLogDir, dir);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    });
}

// Load sync state
function loadSyncState() {
    if (!options.incremental) {
        return {};
    }

    try {
        if (fs.existsSync(stateFile)) {
            return JSON.parse(fs.readFileSync(stateFile, 'utf8'));
        }
    } catch (error) {
        logError(`Failed to load sync state: ${error.message}`);
    }
    return {};
}

// Save sync state
function saveSyncState(state) {
    try {
        fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
    } catch (error) {
        logError(`Failed to save sync state: ${error.message}`);
    }
}

// Execute SSH command with retry logic
async function sshExec(command, retries = 3) {
    const sshHost = `${config.vps.user}@${config.vps.host}`;
    const sshPort = config.vps.port ? `-p ${config.vps.port}` : '';
    const sshKey = config.vps.sshKeyPath ? `-i ${config.vps.sshKeyPath}` : '';
    const fullCommand = `ssh ${sshPort} ${sshKey} ${sshHost} "${command}"`;

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const { stdout, stderr } = await execAsync(fullCommand);
            if (stderr && !stderr.includes('Warning')) {
                logInfo(`SSH warning: ${stderr}`);
            }
            return stdout;
        } catch (error) {
            if (attempt === retries) {
                throw error;
            }
            logInfo(`Retry ${attempt}/${retries} after error: ${error.message}`);
            await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
        }
    }
}

// Fetch PM2 logs
async function fetchPM2Logs(state) {
    if (!options.sources.includes('pm2')) {
        return;
    }

    logSection('📋', 'Fetching PM2 logs...', 'yellow');

    try {
        // Backend logs
        const backendLogFile = path.join(localLogDir, 'pm2', `backend-${timestamp}.log`);
        const backendCmd = options.filter
            ? `pm2 logs matrix-delivery-backend --lines ${options.lines} --nostream | grep -i '${options.filter}'`
            : `pm2 logs matrix-delivery-backend --lines ${options.lines} --nostream`;

        const backendLogs = await sshExec(backendCmd);
        fs.writeFileSync(backendLogFile, backendLogs);
        logSuccess(`Backend logs: ${backendLogFile}`);

        // Frontend logs (if exists)
        try {
            const frontendLogFile = path.join(localLogDir, 'pm2', `frontend-${timestamp}.log`);
            const frontendCmd = options.filter
                ? `pm2 logs matrix-delivery-frontend --lines ${options.lines} --nostream 2>/dev/null | grep -i '${options.filter}'`
                : `pm2 logs matrix-delivery-frontend --lines ${options.lines} --nostream 2>/dev/null`;

            const frontendLogs = await sshExec(frontendCmd);
            if (frontendLogs.trim()) {
                fs.writeFileSync(frontendLogFile, frontendLogs);
                logSuccess(`Frontend logs: ${frontendLogFile}`);
            }
        } catch (error) {
            logInfo('Frontend logs not available (expected if not using PM2 for frontend)');
        }

        state.pm2 = { lastSync: new Date().toISOString() };
    } catch (error) {
        logError(`PM2 logs failed: ${error.message}`);
    }
}

// Fetch Winston file logs
async function fetchWinstonLogs(state) {
    if (!options.sources.includes('winston')) {
        return;
    }

    logSection('📝', 'Fetching Winston file logs...', 'yellow');

    try {
        const winstonDir = config.remotePaths.winstonLogs;

        // Get list of log files
        const logFiles = await sshExec(`ls -1 ${winstonDir}/*.log 2>/dev/null || echo ""`);

        if (!logFiles.trim()) {
            logInfo('No Winston log files found');
            return;
        }

        const files = logFiles.trim().split('\n').filter(f => f);

        for (const remoteFile of files) {
            const fileName = path.basename(remoteFile);
            const localFile = path.join(localLogDir, 'winston', `${fileName.replace('.log', '')}-${timestamp}.log`);

            // Use scp to copy file
            const sshHost = `${config.vps.user}@${config.vps.host}`;
            const sshPort = config.vps.port ? `-P ${config.vps.port}` : '';
            const sshKey = config.vps.sshKeyPath ? `-i ${config.vps.sshKeyPath}` : '';
            const scpCmd = `scp ${sshPort} ${sshKey} ${sshHost}:${remoteFile} "${localFile}"`;

            await execAsync(scpCmd);
            logSuccess(`${fileName}`);
        }

        state.winston = { lastSync: new Date().toISOString() };
    } catch (error) {
        logError(`Winston logs failed: ${error.message}`);
    }
}

// Fetch PostgreSQL logs
async function fetchPostgreSQLLogs(state) {
    if (!options.sources.includes('postgresql')) {
        return;
    }

    logSection('🐘', 'Fetching PostgreSQL logs...', 'yellow');

    try {
        const pgLogFile = path.join(localLogDir, 'postgresql', `postgresql-${timestamp}.log`);
        const pgCmd = `journalctl -u postgresql@14-main -n ${options.lines} --no-pager`;

        const pgLogs = await sshExec(pgCmd);
        fs.writeFileSync(pgLogFile, pgLogs);
        logSuccess(`PostgreSQL logs: ${pgLogFile}`);

        state.postgresql = { lastSync: new Date().toISOString() };
    } catch (error) {
        logError(`PostgreSQL logs failed: ${error.message}`);
    }
}

// Fetch Apache logs
async function fetchApacheLogs(state) {
    if (!options.sources.includes('apache')) {
        return;
    }

    logSection('🌐', 'Fetching Apache logs...', 'yellow');

    try {
        // Access log
        const accessLogFile = path.join(localLogDir, 'apache', `access-${timestamp}.log`);
        const accessCmd = `tail -n ${options.lines} /var/log/apache2/matrix-api-access.log`;
        const accessLogs = await sshExec(accessCmd);
        fs.writeFileSync(accessLogFile, accessLogs);
        logSuccess(`Access log: ${accessLogFile}`);

        // Error log
        const errorLogFile = path.join(localLogDir, 'apache', `error-${timestamp}.log`);
        const errorCmd = `tail -n ${options.lines} /var/log/apache2/matrix-api-error.log`;
        const errorLogs = await sshExec(errorCmd);
        fs.writeFileSync(errorLogFile, errorLogs);
        logSuccess(`Error log: ${errorLogFile}`);

        // Apache config (for reference)
        const configFile = path.join(localLogDir, 'apache', `config-${timestamp}.conf`);
        const configCmd = `cat ${config.remotePaths.apacheConfig}`;
        const configContent = await sshExec(configCmd);
        fs.writeFileSync(configFile, configContent);
        logSuccess(`Config: ${configFile}`);

        state.apache = { lastSync: new Date().toISOString() };
    } catch (error) {
        logError(`Apache logs failed: ${error.message}`);
    }
}

// Fetch system info
async function fetchSystemInfo() {
    logSection('💾', 'Fetching system info...', 'yellow');

    try {
        const infoFile = path.join(localLogDir, `system-info-${timestamp}.txt`);

        const commands = [
            'echo "=== Disk Usage ==="',
            'df -h',
            'echo ""',
            'echo "=== PM2 Status ==="',
            'pm2 status',
            'echo ""',
            'echo "=== Memory Usage ==="',
            'free -h',
            'echo ""',
            'echo "=== Log Directory Sizes ==="',
            'du -sh /var/log /root/.pm2 /root/matrix-delivery/backend/logs 2>/dev/null || true',
        ];

        const systemInfo = await sshExec(commands.join(' && '));
        fs.writeFileSync(infoFile, systemInfo);
        logSuccess(`System info: ${infoFile}`);
    } catch (error) {
        logError(`System info failed: ${error.message}`);
    }
}

// Main sync function
async function syncLogs() {
    const startTime = Date.now();

    log('\n' + '='.repeat(60), 'cyan');
    log('  Production Log Sync', 'bright');
    log('='.repeat(60), 'cyan');

    logInfo(`Host: ${config.vps.host}`);
    logInfo(`Lines: ${options.lines}`);
    logInfo(`Sources: ${options.sources.join(', ')}`);
    if (options.filter) {
        logInfo(`Filter: ${options.filter}`);
    }
    logInfo(`Incremental: ${options.incremental ? 'Yes' : 'No'}`);

    ensureLogDirectory();
    const state = loadSyncState();

    try {
        // Fetch logs from all sources
        await fetchPM2Logs(state);
        await fetchWinstonLogs(state);
        await fetchPostgreSQLLogs(state);
        await fetchApacheLogs(state);
        await fetchSystemInfo();

        // Save state
        state.lastSync = new Date().toISOString();
        saveSyncState(state);

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        logSection('✅', `Sync completed in ${duration}s`, 'green');
        log(`\n📁 Logs saved to: ${localLogDir}`, 'cyan');

        // Try to open in VS Code
        try {
            const latestPM2Log = path.join(localLogDir, 'pm2', `backend-${timestamp}.log`);
            if (fs.existsSync(latestPM2Log)) {
                await execAsync(`code "${latestPM2Log}"`);
                logInfo('Opened in VS Code');
            }
        } catch (error) {
            // VS Code not available, skip
        }

        // Run analysis if enabled
        if (config.analysis.autoAnalyze) {
            log('\n🔍 Running log analysis...', 'cyan');
            try {
                const analyzerPath = path.join(__dirname, 'log-analyzer.js');
                if (fs.existsSync(analyzerPath)) {
                    await execAsync(`node "${analyzerPath}"`);
                } else {
                    logInfo('Log analyzer not yet implemented');
                }
            } catch (error) {
                logError(`Analysis failed: ${error.message}`);
            }
        }

        log('\n💡 Usage examples:', 'yellow');
        logInfo('npm run logs:sync');
        logInfo('npm run logs:sync -- --filter "CORS"');
        logInfo('npm run logs:sync -- --sources pm2,apache');
        logInfo('npm run logs:analyze');

    } catch (error) {
        logError(`\nSync failed: ${error.message}`);
        if (error.stack) {
            logInfo(error.stack);
        }
        process.exit(1);
    }
}

// Run sync
syncLogs();
