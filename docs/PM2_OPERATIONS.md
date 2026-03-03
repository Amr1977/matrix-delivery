# PM2 Operations Quick Reference

> Matrix Delivery Backend Process Manager - Quick Reference Guide

## What is PM2?

PM2 is a production-grade process manager for Node.js applications. It keeps your backend running 24/7, handles automatic restarts on crashes, and enables zero-downtime deployments.

---

## Quick Commands

### Start/Stop/Restart

| Command | Description |
|---------|-------------|
| `pm2 start ecosystem.config.js --env development` | Start backend in development mode |
| `pm2 start ecosystem.config.js --env production` | Start backend in production mode |
| `pm2 start ecosystem.config.js --env development --watch` | Start with file watching (dev only) |
| `pm2 restart matrix-delivery-backend` | Restart the backend |
| `pm2 stop matrix-delivery-backend` | Stop the backend |
| `pm2 delete matrix-delivery-backend` | Remove from PM2 entirely |

### Monitoring

| Command | Description |
|---------|-------------|
| `pm2 list` or `pm2 status` | List all processes |
| `pm2 monit` | Real-time CPU/Memory monitor |
| `pm2 show matrix-delivery-backend` | Detailed process info |

### Logs

| Command | Description |
|---------|-------------|
| `pm2 logs` | View all logs |
| `pm2 logs matrix-delivery-backend` | Backend logs only |
| `pm2 logs --lines 100` | Last 100 lines |
| `pm2 flush` | Clear all logs |

### Persistence

| Command | Description |
|---------|-------------|
| `pm2 save` | Save current process list |
| `pm2 resurrect` | Restore saved processes |
| `pm2 startup` | Generate startup script |
| `pm2 unstartup` | Remove startup script |

---

## Environment Modes

| Mode | Instances | Watch | Use Case |
|------|-----------|-------|----------|
| `development` | 1 (Fork) | Yes | Local development |
| `staging` | 2 (Cluster) | No | Testing |
| `production` | 2 (Cluster) | No | Live production |

**Usage:**
```bash
pm2 start ecosystem.config.js --env production
pm2 start ecosystem.config.js --env development
```

---

## Matrix Delivery-Specific Commands

### Development (Local)

```bash
cd backend
pm2 start ecosystem.config.js --env development --watch
pm2 logs matrix-delivery-backend
```

### Production (VPS)

```bash
cd /root/matrix-delivery/backend
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup  # Run once after initial setup
```

### Check Health

```bash
curl https://matrix-api.oldantique50.com/api/health
# or locally
curl http://localhost:5000/api/health
```

---

## Troubleshooting

### Service Won't Start

```bash
# Check logs for errors
pm2 logs matrix-delivery-backend --lines 50

# Try starting manually
cd backend && node server.js
```

### Too Many Restarts

```bash
# Check what's causing crashes
pm2 logs matrix-delivery-backend --err --lines 50

# The app has max_restart: 10, min_uptime: 30s
# If it crashes 10 times in 30s, PM2 gives up
```

### Memory Issues

```bash
# Backend has 500MB memory limit
# PM2 auto-restarts if exceeded
pm2 show matrix-delivery-backend
```

### Nuclear Option (Start Fresh)

```bash
pm2 delete all
pm2 start ecosystem.config.js --env production
pm2 save
```

---

## Files Reference

| File | Purpose |
|------|---------|
| `backend/ecosystem.config.js` | PM2 configuration |
| `.env` | Development variables |
| `.env.production` | Production variables |
| `.env.staging` | Staging variables |

---

## Automated Deployment

Once PM2 is set up, GitHub Actions handles deployment automatically:

1. Push code to `main` branch
2. GitHub Actions triggers
3. Backend stops → updates → restarts
4. Health check verifies success

**Manual test after deployment:**
```bash
pm2 status
pm2 logs matrix-delivery-backend --lines 20
curl https://matrix-api.oldantique50.com/api/health
```

---

## Ecosystem Config Structure

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'matrix-delivery-backend',
    script: 'server.js',
    cwd: './backend',
    instances: 1,          // 1 for dev, 2 for prod
    exec_mode: 'fork',     // 'fork' for dev, 'cluster' for prod
    watch: true,           // Enable only in development
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production'
    }
  }]
};
```

---

## Best Practices

1. ✅ Always use `--env production` in production
2. ✅ Never use `--watch` in production
3. ✅ Run `pm2 save` after startup
4. ✅ Run `pm2 startup` once after setup
5. ✅ Check logs regularly with `pm2 logs`
6. ✅ Use `pm2 monit` for resource monitoring

---

## Useful Links

- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [PM2 Cluster Mode](https://pm2.keymetrics.io/docs/usage/cluster-mode/)
- [PM2 Process Management](https://pm2.keymetrics.io/docs/usage/process-management/)

---

**Last Updated:** 2026-03-03
**Version:** 1.0
