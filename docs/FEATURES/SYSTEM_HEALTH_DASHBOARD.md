# System Health Dashboard

A real-time system monitoring dashboard in the admin panel showing memory, PM2, and uptime metrics with time-series charts.

## Features

- **Memory Usage Chart** - Line chart showing system RAM % over time
- **PM2 Memory Chart** - Line chart showing Node.js process memory
- **PM2 Processes Table** - Status, memory, and restart count per process
- **Time Range Toggle** - View 24 hours or 3 days of history
- **Auto-Refresh** - Updates every 60 seconds

## Architecture

```
Frontend (React + Recharts)
         │
  GET /api/admin/health/current
  GET /api/admin/health/history
         │
Backend (systemHealth.js)
         │
    ┌────┴────┐
    │         │
Collector   Database
(60s)       system_health_logs
```

## API Endpoints

### GET /api/admin/health/current

Returns live system metrics.

**Response:**
```json
{
  "memoryPercent": 45.5,
  "memoryUsedMb": 512,
  "memoryAvailableMb": 480,
  "pm2TotalMemoryMb": 350,
  "pm2Processes": [
    {"name": "backend", "status": "online", "memory_mb": 200, "restarts": 5}
  ],
  "uptime": "3 days, 5 hours"
}
```

### GET /api/admin/health/history?hours=24

Returns time-series data for charts.

**Query params:**
- `hours` - Time window (default: 24, max: 72)

## Database

**Table:** `system_health_logs`

| Column | Type | Description |
|--------|------|-------------|
| timestamp | TIMESTAMPTZ | When metric was captured |
| memory_percent | DECIMAL | System RAM usage % |
| memory_used_mb | INTEGER | Used RAM in MB |
| memory_available_mb | INTEGER | Available RAM in MB |
| pm2_total_memory_mb | INTEGER | Total PM2 process memory |
| pm2_processes | JSONB | Array of process details |

**Retention:** 3 days (auto-cleanup)

## Access

Admin Panel → System Health (in sidebar)

Requires admin role to access.
