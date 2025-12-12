#!/usr/bin/env node

/**
 * Apache WebSocket Configuration Deployment Script
 * 
 * This script runs on the VPS to:
 * 1. Enable mod_proxy_wstunnel module
 * 2. Reload Apache configuration
 * 
 * Usage: node scripts/deploy-apache-websocket.js
 * Or via PM2: pm2 start scripts/deploy-apache-websocket.js --name apache-deploy
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG_FILE = 'matrix-api.oldantique50.com-le-ssl.conf';
const APACHE_SITES_DIR = '/etc/apache2/sites-available';
const CONFIG_SOURCE = path.join(__dirname, '..', CONFIG_FILE);
const CONFIG_DEST = path.join(APACHE_SITES_DIR, CONFIG_FILE);

// Color output helpers
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function execCommand(command, description) {
    try {
        log(`\n▶ ${description}...`, 'yellow');
        const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
        log(`  ✅ ${description} completed`, 'green');
        return output;
    } catch (error) {
        log(`  ❌ ${description} failed: ${error.message}`, 'red');
        throw error;
    }
}

async function main() {
    try {
        log('\n╔════════════════════════════════════════╗', 'cyan');
        log('║  Apache WebSocket Configuration       ║', 'cyan');
        log('╚════════════════════════════════════════╝\n', 'cyan');

        // Step 1: Check if running as root
        if (process.getuid && process.getuid() !== 0) {
            log('⚠️  Warning: Not running as root. Some operations may fail.', 'yellow');
            log('   Run with: sudo node scripts/deploy-apache-websocket.js\n', 'yellow');
        }

        // Step 2: Enable mod_proxy_wstunnel
        try {
            execCommand('a2enmod proxy_wstunnel', 'Enabling mod_proxy_wstunnel');
        } catch (error) {
            // Module might already be enabled
            log('  ℹ️  Module may already be enabled', 'yellow');
        }

        // Step 3: Enable other required modules
        const requiredModules = ['proxy', 'proxy_http', 'rewrite', 'headers', 'ssl'];
        for (const module of requiredModules) {
            try {
                execCommand(`a2enmod ${module}`, `Enabling ${module}`);
            } catch (error) {
                log(`  ℹ️  ${module} may already be enabled`, 'yellow');
            }
        }

        // Step 4: Copy config file to Apache directory
        log('\n▶ Copying Apache config...', 'yellow');
        if (fs.existsSync(CONFIG_SOURCE)) {
            // Backup existing config
            if (fs.existsSync(CONFIG_DEST)) {
                const backupPath = `${CONFIG_DEST}.backup.${Date.now()}`;
                fs.copyFileSync(CONFIG_DEST, backupPath);
                log(`  ✅ Backed up existing config to ${backupPath}`, 'green');
            }

            // Copy new config
            fs.copyFileSync(CONFIG_SOURCE, CONFIG_DEST);
            log(`  ✅ Config copied to ${CONFIG_DEST}`, 'green');
        } else {
            log(`  ⚠️  Config file not found at ${CONFIG_SOURCE}`, 'yellow');
            log('     Skipping config copy - using existing config', 'yellow');
        }

        // Step 5: Test Apache configuration
        log('\n▶ Testing Apache configuration...', 'yellow');
        try {
            const testOutput = execSync('apache2ctl configtest', {
                encoding: 'utf8',
                stdio: 'pipe'
            });

            if (testOutput.includes('Syntax OK')) {
                log('  ✅ Apache configuration is valid', 'green');
            } else {
                log('  ⚠️  Apache configuration test output:', 'yellow');
                console.log(testOutput);
            }
        } catch (error) {
            // apache2ctl configtest returns exit code 0 even with warnings
            if (error.stdout && error.stdout.includes('Syntax OK')) {
                log('  ✅ Apache configuration is valid', 'green');
            } else {
                throw error;
            }
        }

        // Step 6: Reload Apache
        execCommand('systemctl reload apache2', 'Reloading Apache');

        // Step 7: Verify Apache is running
        const status = execCommand('systemctl is-active apache2', 'Checking Apache status');
        if (status.trim() === 'active') {
            log('  ✅ Apache is running', 'green');
        }

        // Step 8: Show enabled modules
        log('\n▶ Verifying enabled modules...', 'yellow');
        const modules = execSync('apache2ctl -M 2>&1 | grep -E "proxy|rewrite|ssl"', {
            encoding: 'utf8',
            stdio: 'pipe'
        });
        console.log(modules);

        log('\n╔════════════════════════════════════════╗', 'green');
        log('║  WebSocket Fix Deployed Successfully!  ║', 'green');
        log('╚════════════════════════════════════════╝\n', 'green');

        log('✅ Next steps:', 'cyan');
        log('   1. Test WebSocket connection at https://matrix-delivery.web.app');
        log('   2. Check browser devtools - WebSocket 400 error should be gone');
        log('   3. Verify Socket.IO upgrades to WebSocket in Network tab\n');

        process.exit(0);
    } catch (error) {
        log(`\n❌ Deployment failed: ${error.message}`, 'red');
        log('\nRolling back...', 'yellow');

        try {
            // Attempt to restore from backup
            const backups = fs.readdirSync(APACHE_SITES_DIR)
                .filter(f => f.startsWith(`${CONFIG_FILE}.backup.`))
                .sort()
                .reverse();

            if (backups.length > 0) {
                const latestBackup = path.join(APACHE_SITES_DIR, backups[0]);
                fs.copyFileSync(latestBackup, CONFIG_DEST);
                execSync('systemctl reload apache2');
                log('✅ Rolled back to previous configuration', 'green');
            }
        } catch (rollbackError) {
            log(`❌ Rollback failed: ${rollbackError.message}`, 'red');
        }

        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = main;
