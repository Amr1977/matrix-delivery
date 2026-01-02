# Auto-Deploy Health Monitoring

The `scripts/auto-deploy.sh` service includes built-in system health monitoring that logs stats every minute.

## Heartbeat Output Format

```
[2026-01-02 09:55:19] ⏳ No changes | Mem: 45% (512MB avail) | Backend: online (128MB) | Up: 3 hours, 12 mins
```

## Metrics Tracked

| Metric | Description |
|--------|-------------|
| `Mem: XX%` | System memory usage percentage |
| `XXXmb avail` | Available memory in MB |
| `Backend: status` | PM2 process status (online/stopped/errored) |
| `(XXmb)` | Backend Node.js process memory |
| `Up: X hours` | System uptime |

## Monitoring Memory Leaks

Watch logs over time to verify memory is stable:
```bash
# Follow auto-deploy logs
pm2 logs auto-deploy --lines 100

# Or check log file
tail -f /root/.pm2/logs/auto-deploy-out.log
```

**Healthy pattern:** Memory % stays stable (±5%)  
**Leak pattern:** Memory % steadily increases over hours

## Requirements

- `jq` must be installed: `apt install jq`
- PM2 must be running the backend
