# PostgreSQL Troubleshooting Guide

## Issue: PostgreSQL service shows "active (exited)" but not running

### Quick Fix:

```bash
# 1. Check PostgreSQL version installed
ls /etc/postgresql/

# 2. Start the specific version (replace 14 with your version)
sudo systemctl start postgresql@14-main
sudo systemctl status postgresql@14-main

# 3. Verify it's listening
sudo netstat -tlnp | grep 5432

# 4. Then retry database reset
cd /root/matrix-delivery/backend
node scripts/reset-production-db.js
```

### Common PostgreSQL versions:
- Ubuntu 20.04: PostgreSQL 12
- Ubuntu 22.04: PostgreSQL 14
- Ubuntu 24.04: PostgreSQL 15

### If you don't know the version:
```bash
psql --version
```
