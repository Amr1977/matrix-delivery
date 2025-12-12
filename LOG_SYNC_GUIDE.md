# Production Log Sync Guide

A professional system for syncing and analyzing production logs from your VPS (`oldantique50.com`) to your local workspace.

## Quick Start

### 1. Sync Logs Once

```bash
npm run logs:sync
```

This fetches the latest logs from production and saves them to `vps-logs/`.

### 2. Analyze Logs

```bash
npm run logs:analyze
```

Analyzes synced logs and generates a detailed report with:
- CORS errors and fixes
- JWT/authentication issues
- Database problems
- Performance bottlenecks
- Actionable recommendations

### 3. Continuous Monitoring

```bash
# Run in foreground (see live output)
npm run logs:watch

# Or run as background service
npm run logs:watch:start
npm run logs:watch:status
npm run logs:watch:stop
```

## Features

### 🔄 Multi-Source Log Fetching

Automatically fetches logs from:
- **PM2**: Backend and frontend process logs
- **Winston**: Structured application logs (error, combined, security, performance)
- **PostgreSQL**: Database logs via journalctl
- **Apache**: Access and error logs, plus configuration

### 🔍 Intelligent Analysis

Detects and reports:
- **CORS errors** with specific blocked origins and fix suggestions
- **JWT issues** (expired, malformed, invalid tokens)
- **Authentication failures**
- **Database errors** (connection, query failures)
- **Timeouts and performance issues**
- **Memory leaks and crashes**

### 📊 Detailed Reports

Generates markdown reports with:
- Error frequency charts
- Top error types
- Affected API endpoints
- Code snippets with line numbers
- Actionable fix recommendations

### ⚡ Incremental Sync

Only fetches new logs since last sync, saving time and bandwidth.

### 🔔 Desktop Notifications

Get notified when critical issues are detected (requires `node-notifier`).

## Configuration

Edit `scripts/log-sync.config.js` to customize:

```javascript
module.exports = {
  vps: {
    host: 'vps283058.vps.ovh.ca',  // Your VPS hostname
    user: 'root',                   // SSH user
  },
  sync: {
    interval: 5 * 60 * 1000,       // Sync every 5 minutes
    maxLines: 1000,                 // Lines per log file
    incremental: true,              // Only fetch new logs
  },
  analysis: {
    autoAnalyze: true,              // Auto-analyze after sync
    notifications: {
      enabled: true,                // Desktop notifications
      criticalOnly: true,           // Only for critical errors
    },
  },
  storage: {
    retention: 14,                  // Keep logs for 14 days
  },
};
```

## Advanced Usage

### Filter Logs

```bash
# Sync only CORS-related logs
npm run logs:sync -- --filter "CORS"

# Sync only authentication errors
npm run logs:sync -- --filter "jwt"
```

### Fetch More Lines

```bash
# Fetch last 2000 lines instead of default 1000
npm run logs:sync -- --lines 2000
```

### Specific Sources

```bash
# Only fetch PM2 and Apache logs
npm run logs:sync -- --sources pm2,apache
```

### Disable Incremental Sync

```bash
# Fetch all logs (ignore last sync timestamp)
npm run logs:sync -- --no-incremental
```

### Test Watcher

```bash
# Run watcher once and exit (for testing)
node scripts/log-watcher.js --test
```

## Log Organization

Logs are organized in `vps-logs/` directory:

```
vps-logs/
├── pm2/
│   ├── backend-2025-12-12_15-30-00.log
│   └── frontend-2025-12-12_15-30-00.log
├── winston/
│   ├── error-2025-12-12-2025-12-12_15-30-00.log
│   ├── combined-2025-12-12-2025-12-12_15-30-00.log
│   └── security-2025-12-12-2025-12-12_15-30-00.log
├── postgresql/
│   └── postgresql-2025-12-12_15-30-00.log
├── apache/
│   ├── access-2025-12-12_15-30-00.log
│   ├── error-2025-12-12_15-30-00.log
│   └── config-2025-12-12_15-30-00.conf
├── analysis/
│   └── analysis-2025-12-12_15-30-00.md
└── system-info-2025-12-12_15-30-00.txt
```

## Troubleshooting

### SSH Connection Issues

If you get SSH connection errors:

1. **Check SSH key**: Ensure your SSH key is configured for the VPS
   ```bash
   ssh root@vps283058.vps.ovh.ca
   ```

2. **Specify SSH key**: Edit `log-sync.config.js`:
   ```javascript
   vps: {
     sshKeyPath: '~/.ssh/id_rsa'  // Your SSH key path
   }
   ```

### No Logs Found

If sync completes but no logs appear:

1. **Check VPS paths**: Verify log paths in `log-sync.config.js` match your VPS
2. **Check permissions**: Ensure SSH user has read access to log directories
3. **Check PM2 app names**: Verify `matrix-delivery-backend` matches your PM2 process name

### Analysis Not Running

If analysis doesn't run automatically:

1. **Check config**: Ensure `autoAnalyze: true` in `log-sync.config.js`
2. **Run manually**: `npm run logs:analyze`
3. **Check logs exist**: Ensure `vps-logs/` has log files

### Watcher Not Starting

If background watcher fails to start:

1. **Check PM2**: Ensure PM2 is installed globally
   ```bash
   npm install -g pm2
   ```

2. **Check logs**: View PM2 logs
   ```bash
   pm2 logs log-watcher
   ```

3. **Run in foreground**: Test without PM2
   ```bash
   npm run logs:watch
   ```

## Current Production Issue

Your production logs show CORS errors blocking `localhost:3001`:

```
CORS blocked origin: http://localhost:3001. Allowed: https://matrix-delivery.web.app, https://matrix-delivery.firebaseapp.com
```

**Fix**: Add `localhost:3001` to your production `CORS_ORIGIN` environment variable:

```bash
# On VPS
CORS_ORIGIN="https://matrix-delivery.web.app,https://matrix-delivery.firebaseapp.com,http://localhost:3001"
```

Or remove `localhost:3001` from your local frontend if it shouldn't access production.

## Integration with VS Code

The log sync system automatically opens logs in VS Code when available. You can also:

1. **Open log directory**:
   ```bash
   code vps-logs/
   ```

2. **Search across all logs**:
   - Press `Ctrl+Shift+F` in VS Code
   - Set search scope to `vps-logs/`

3. **Install extensions**:
   - **Log File Highlighter**: Syntax highlighting for logs
   - **Error Lens**: Inline error highlighting

## Best Practices

1. **Run sync before debugging**: Always sync latest logs when investigating issues
2. **Check analysis reports**: Review generated reports for patterns
3. **Monitor watcher**: Use background watcher during active development
4. **Clean old logs**: Logs older than retention period are auto-cleaned
5. **Filter when possible**: Use `--filter` to reduce noise

## Security Notes

- Logs are stored locally and **not committed to git** (in `.gitignore`)
- SSH keys are never stored in logs
- Sensitive data (passwords, tokens) should be filtered by backend logger
- Analysis reports may contain error messages - review before sharing

## Support

For issues or questions:
1. Check this guide's troubleshooting section
2. Review `log-sync.config.js` configuration
3. Run sync with `--no-incremental` to force full sync
4. Check VPS connectivity: `ssh root@vps283058.vps.ovh.ca`
