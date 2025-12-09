#!/usr/bin/env node

/**
 * Fetch logs from VPS to local workspace for debugging
 * 
 * Usage:
 *   node scripts/fetch-vps-logs.js
 *   node scripts/fetch-vps-logs.js --lines 500
 *   node scripts/fetch-vps-logs.js --filter "profile picture"
 *   node scripts/fetch-vps-logs.js --filter "📸"
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Parse command line arguments
const args = process.argv.slice(2);
const config = {
    vpsHost: 'vps283058.vps.ovh.ca',
    vpsUser: 'root',
    lines: 200,
    filter: ''
};

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--lines' && args[i + 1]) {
        config.lines = parseInt(args[i + 1]);
        i++;
    } else if (args[i] === '--filter' && args[i + 1]) {
        config.filter = args[i + 1];
        i++;
    } else if (args[i] === '--host' && args[i + 1]) {
        config.vpsHost = args[i + 1];
        i++;
    }
}

const localLogDir = path.join(__dirname, '..', 'vps-logs');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

// Create local log directory
if (!fs.existsSync(localLogDir)) {
    fs.mkdirSync(localLogDir, { recursive: true });
}

console.log('\x1b[36m📥 Fetching logs from VPS...\x1b[0m');
console.log(`\x1b[90m   Host: ${config.vpsHost}\x1b[0m`);
console.log(`\x1b[90m   Lines: ${config.lines}\x1b[0m`);
if (config.filter) {
    console.log(`\x1b[90m   Filter: ${config.filter}\x1b[0m`);
}

async function fetchLogs() {
    try {
        // Fetch PM2 backend logs
        console.log('\n\x1b[33m📋 Fetching PM2 backend logs...\x1b[0m');
        const backendLogFile = path.join(localLogDir, `backend-${timestamp}.log`);

        const backendCmd = config.filter
            ? `ssh ${config.vpsUser}@${config.vpsHost} "pm2 logs matrix-delivery-backend --lines ${config.lines} --nostream | grep -i '${config.filter}'"`
            : `ssh ${config.vpsUser}@${config.vpsHost} "pm2 logs matrix-delivery-backend --lines ${config.lines} --nostream"`;

        const { stdout: backendLogs } = await execAsync(backendCmd);
        fs.writeFileSync(backendLogFile, backendLogs);
        console.log(`\x1b[32m   ✅ Saved to: ${backendLogFile}\x1b[0m`);

        // Fetch PM2 frontend logs
        console.log('\n\x1b[33m📋 Fetching PM2 frontend logs...\x1b[0m');
        const frontendLogFile = path.join(localLogDir, `frontend-${timestamp}.log`);

        const frontendCmd = config.filter
            ? `ssh ${config.vpsUser}@${config.vpsHost} "pm2 logs matrix-delivery-frontend --lines ${config.lines} --nostream | grep -i '${config.filter}'"`
            : `ssh ${config.vpsUser}@${config.vpsHost} "pm2 logs matrix-delivery-frontend --lines ${config.lines} --nostream"`;

        const { stdout: frontendLogs } = await execAsync(frontendCmd);
        fs.writeFileSync(frontendLogFile, frontendLogs);
        console.log(`\x1b[32m   ✅ Saved to: ${frontendLogFile}\x1b[0m`);

        // Fetch PostgreSQL system logs
        console.log('\n\x1b[33m📋 Fetching PostgreSQL logs...\x1b[0m');
        const systemLogFile = path.join(localLogDir, `postgresql-${timestamp}.log`);

        const { stdout: systemLogs } = await execAsync(
            `ssh ${config.vpsUser}@${config.vpsHost} "journalctl -u postgresql@14-main -n ${config.lines} --no-pager"`
        );
        fs.writeFileSync(systemLogFile, systemLogs);
        console.log(`\x1b[32m   ✅ Saved to: ${systemLogFile}\x1b[0m`);

        // Fetch disk usage
        console.log('\n\x1b[33m💾 Fetching disk usage...\x1b[0m');
        const diskUsageFile = path.join(localLogDir, `disk-usage-${timestamp}.txt`);

        const { stdout: diskUsage } = await execAsync(
            `ssh ${config.vpsUser}@${config.vpsHost} "df -h && echo && du -sh /var/log /root/.pm2 /var/lib/postgresql 2>/dev/null"`
        );
        fs.writeFileSync(diskUsageFile, diskUsage);
        console.log(`\x1b[32m   ✅ Saved to: ${diskUsageFile}\x1b[0m`);

        // Summary
        console.log('\n\x1b[32m✅ All logs fetched successfully!\x1b[0m');
        console.log(`\n\x1b[36m📁 Log files saved to: ${localLogDir}\x1b[0m`);

        // Try to open in VS Code
        console.log('\n\x1b[36m🔍 Opening logs in VS Code...\x1b[0m');
        try {
            await execAsync(`code "${backendLogFile}"`);
        } catch (err) {
            console.log('\x1b[90m   (VS Code not available, skipping auto-open)\x1b[0m');
        }

        console.log('\n\x1b[33m💡 Usage examples:\x1b[0m');
        console.log('\x1b[90m   node scripts/fetch-vps-logs.js\x1b[0m');
        console.log('\x1b[90m   node scripts/fetch-vps-logs.js --lines 500\x1b[0m');
        console.log('\x1b[90m   node scripts/fetch-vps-logs.js --filter "profile picture"\x1b[0m');
        console.log('\x1b[90m   node scripts/fetch-vps-logs.js --filter "📸"\x1b[0m');

    } catch (error) {
        console.error('\n\x1b[31m❌ Error fetching logs:\x1b[0m', error.message);
        process.exit(1);
    }
}

fetchLogs();
