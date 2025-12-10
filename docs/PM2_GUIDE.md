# PM2 Process Management Guide

## Overview

PM2 is used to manage the **backend only** in both development and production. The frontend is:
- **Development**: Run with `npm start` (not PM2)
- **Production**: Deployed to Firebase Hosting (not PM2)

## Quick Start

### Development (Windows/Local)

```bash
# Start backend with watch mode (auto-restart on file changes)
cd backend
pm2 start ecosystem.config.js --env development --watch

# Or without watch mode
pm2 start ecosystem.config.js --env development

# View logs
pm2 logs matrix-delivery-backend

# Restart
pm2 restart matrix-delivery-backend

# Stop
pm2 stop matrix-delivery-backend
```

### Production (Linux/VPS)

```bash
# Start backend in production mode (cluster mode, no watch)
cd /root/matrix-delivery/backend
pm2 start ecosystem.config.js --env production

# Save PM2 configuration to restart on reboot
pm2 save

# Setup PM2 to start on system boot
pm2 startup

# View status
pm2 status

# View logs
pm2 logs matrix-delivery-backend --lines 100
```

## PM2 Commands Reference

### Process Management
```bash
pm2 start ecosystem.config.js --env <environment>  # Start app
pm2 restart <app-name>                             # Restart app
pm2 reload <app-name>                              # Zero-downtime restart (cluster mode)
pm2 stop <app-name>                                # Stop app
pm2 delete <app-name>                              # Remove app from PM2
pm2 list                                           # List all apps
pm2 status                                         # Show status
```

### Logs
```bash
pm2 logs                                           # View all logs
pm2 logs <app-name>                                # View specific app logs
pm2 logs --lines 100                               # View last 100 lines
pm2 flush                                          # Clear all logs
```

### Monitoring
```bash
pm2 monit                                          # Monitor CPU/Memory
pm2 show <app-name>                                # Show detailed info
```

### Configuration
```bash
pm2 save                                           # Save current process list
pm2 resurrect                                      # Restore saved process list
pm2 startup                                        # Generate startup script
pm2 unstartup                                      # Remove startup script
```

## Environment-Specific Configuration

### Development
- **Mode**: Fork (Windows) or Cluster with 2 instances (Linux)
- **Watch**: Can be enabled with `--watch` flag
- **Auto-restart**: Yes
- **Env file**: `.env`

### Staging
- **Mode**: Cluster with 2 instances
- **Watch**: No
- **Auto-restart**: Yes
- **Env file**: `.env.staging`

### Production
- **Mode**: Cluster with 2 instances
- **Watch**: No (for stability)
- **Auto-restart**: Yes
- **Env file**: `.env`

## Common Issues

### Frontend showing in PM2
**Problem**: Frontend appears in `pm2 list` on production server

**Solution**:
```bash
# Delete frontend from PM2
pm2 delete matrix-delivery-frontend
pm2 save
```

The frontend should NOT be managed by PM2. It's deployed to Firebase Hosting.

### Watch mode not working
**Problem**: Backend doesn't restart on file changes

**Solution**:
```bash
# Make sure to use --watch flag
pm2 restart matrix-delivery-backend --watch

# Or delete and start fresh
pm2 delete matrix-delivery-backend
pm2 start ecosystem.config.js --env development --watch
```

### Too many restarts
**Problem**: PM2 keeps restarting the app

**Solution**:
```bash
# Check logs for errors
pm2 logs matrix-delivery-backend --lines 50

# The app has max_restarts: 10 and min_uptime: 30s
# If it crashes 10 times within 30s, PM2 will stop trying
```

### Memory issues
**Problem**: App using too much memory

**Solution**:
- Backend has `max_memory_restart: '500M'`
- PM2 will automatically restart if memory exceeds 500MB
- Check for memory leaks in your code

## Deployment Workflow

### Manual Deployment
```bash
# SSH to server
ssh root@vps283058.vps.ovh.ca

# Navigate to project
cd /root/matrix-delivery/backend

# Pull latest code
git pull origin master

# Install dependencies
npm install --production

# Restart PM2
pm2 restart matrix-delivery-backend

# Check status
pm2 status
pm2 logs matrix-delivery-backend --lines 20
```

### Automated Deployment
See [AUTOMATED_DEPLOYMENT.md](./AUTOMATED_DEPLOYMENT.md) for GitHub webhook setup.

## Best Practices

1. **Development**: Use `--watch` flag for auto-restart on code changes
2. **Production**: Never use watch mode (disabled by default)
3. **Logs**: Regularly check logs with `pm2 logs`
4. **Monitoring**: Use `pm2 monit` to monitor resource usage
5. **Updates**: Always run `pm2 save` after making changes
6. **Cleanup**: Remove old/stopped processes with `pm2 delete`

## Troubleshooting

### Check if PM2 is running
```bash
pm2 list
```

### Check backend logs
```bash
pm2 logs matrix-delivery-backend --lines 100
```

### Restart everything
```bash
pm2 restart all
```

### Nuclear option (start fresh)
```bash
pm2 delete all
pm2 start ecosystem.config.js --env production
pm2 save
```

## Additional Resources

- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [PM2 Cluster Mode](https://pm2.keymetrics.io/docs/usage/cluster-mode/)
- [PM2 Process Management](https://pm2.keymetrics.io/docs/usage/process-management/)
