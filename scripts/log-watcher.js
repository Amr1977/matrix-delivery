#!/usr/bin/env node

/**
 * Log Watcher Service
 * 
 * Continuously monitors production logs by syncing at regular intervals
 * and running automated analysis. Can run in foreground or background.
 * 
 * Usage:
 *   npm run logs:watch                    # Run in foreground
 *   npm run logs:watch:start              # Start as PM2 service
 *   npm run logs:watch:stop               # Stop PM2 service
 *   npm run logs:watch:status             # Check PM2 status
 *   node scripts/log-watcher.js --test    # Test mode (single run)
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');

const execAsync = promisify(exec);
const config = require('./log-sync.config.js');

// Parse arguments
const args = process.argv.slice(2);
const testMode = args.includes('--test');
const interval = config.sync.interval;

// Color codes
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m',
};

function log(message, color = 'white') {
    const timestamp = new Date().toISOString();
    console.log(`${colors[color] || colors.reset}[${timestamp}] ${message}${colors.reset}`);
}

// Watcher state
const state = {
    running: true,
    syncCount: 0,
    errorCount: 0,
    lastSync: null,
    lastError: null,
};

// Sync logs
async function syncLogs() {
    try {
        log('🔄 Starting log sync...', 'cyan');

        const syncScript = path.join(__dirname, 'sync-production-logs.js');
        const { stdout, stderr } = await execAsync(`node "${syncScript}"`);

        if (stderr && !stderr.includes('Warning')) {
            log(`⚠️  Sync warnings: ${stderr}`, 'yellow');
        }

        state.syncCount++;
        state.lastSync = new Date();

        log(`✅ Sync completed (#${state.syncCount})`, 'green');

        return true;
    } catch (error) {
        state.errorCount++;
        state.lastError = error.message;
        log(`❌ Sync failed: ${error.message}`, 'red');
        return false;
    }
}

// Run analysis
async function runAnalysis() {
    try {
        log('🔍 Running log analysis...', 'cyan');

        const analyzerScript = path.join(__dirname, 'log-analyzer.js');
        const { stdout } = await execAsync(`node "${analyzerScript}"`);

        // Check for critical issues in output
        if (stdout.includes('CORS ERRORS DETECTED') ||
            stdout.includes('critical issues')) {
            log('⚠️  Critical issues detected!', 'yellow');
        }

        log('✅ Analysis completed', 'green');

        return true;
    } catch (error) {
        log(`❌ Analysis failed: ${error.message}`, 'red');
        return false;
    }
}

// Check VPS connectivity
async function checkConnectivity() {
    try {
        const sshHost = `${config.vps.user}@${config.vps.host}`;
        const sshPort = config.vps.port ? `-p ${config.vps.port}` : '';
        const sshKey = config.vps.sshKeyPath ? `-i ${config.vps.sshKeyPath}` : '';
        await execAsync(`ssh ${sshPort} ${sshKey} ${sshHost} "echo ok"`, { timeout: 10000 });
        return true;
    } catch (error) {
        log(`⚠️  VPS connectivity issue: ${error.message}`, 'yellow');
        return false;
    }
}

// Print status
function printStatus() {
    log('\n' + '='.repeat(60), 'cyan');
    log('  Log Watcher Status', 'bright');
    log('='.repeat(60), 'cyan');
    log(`VPS Host: ${config.vps.host}`, 'gray');
    log(`Interval: ${interval / 1000 / 60} minutes`, 'gray');
    log(`Sync Count: ${state.syncCount}`, 'gray');
    log(`Error Count: ${state.errorCount}`, state.errorCount > 0 ? 'yellow' : 'gray');

    if (state.lastSync) {
        const timeSince = Math.floor((Date.now() - state.lastSync) / 1000 / 60);
        log(`Last Sync: ${timeSince} minutes ago`, 'gray');
    } else {
        log(`Last Sync: Never`, 'gray');
    }

    if (state.lastError) {
        log(`Last Error: ${state.lastError}`, 'red');
    }

    log('='.repeat(60), 'cyan');
    log('', 'reset');
}

// Main watch loop
async function watch() {
    log('🚀 Log Watcher started', 'green');
    log(`📊 Syncing every ${interval / 1000 / 60} minutes`, 'cyan');
    log(`🔗 Monitoring: ${config.vps.host}`, 'cyan');

    if (testMode) {
        log('🧪 Test mode: Running single sync cycle', 'yellow');
    }

    // Initial connectivity check
    const connected = await checkConnectivity();
    if (!connected) {
        log('❌ Cannot connect to VPS. Check SSH configuration.', 'red');
        if (testMode) {
            process.exit(1);
        }
    }

    // Main loop
    while (state.running) {
        try {
            // Sync logs
            const syncSuccess = await syncLogs();

            // Run analysis if sync succeeded
            if (syncSuccess && config.analysis.autoAnalyze) {
                await runAnalysis();
            }

            // Print status
            printStatus();

            // Test mode: exit after one cycle
            if (testMode) {
                log('✅ Test mode complete', 'green');
                process.exit(0);
            }

            // Wait for next interval
            const nextSync = new Date(Date.now() + interval);
            log(`⏰ Next sync at: ${nextSync.toLocaleTimeString()}`, 'cyan');
            log(`💤 Sleeping for ${interval / 1000 / 60} minutes...`, 'gray');

            await new Promise(resolve => setTimeout(resolve, interval));

        } catch (error) {
            log(`❌ Watcher error: ${error.message}`, 'red');

            // Wait a bit before retrying
            await new Promise(resolve => setTimeout(resolve, 60000)); // 1 minute
        }
    }
}

// Graceful shutdown
function shutdown(signal) {
    log(`\n📴 Received ${signal}, shutting down gracefully...`, 'yellow');
    state.running = false;

    // Print final status
    printStatus();

    log('👋 Log Watcher stopped', 'cyan');
    process.exit(0);
}

// Handle signals
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    log(`💥 Uncaught exception: ${error.message}`, 'red');
    log(error.stack, 'gray');
});

process.on('unhandledRejection', (reason, promise) => {
    log(`💥 Unhandled rejection: ${reason}`, 'red');
});

// Start watching
watch().catch(error => {
    log(`❌ Fatal error: ${error.message}`, 'red');
    process.exit(1);
});
