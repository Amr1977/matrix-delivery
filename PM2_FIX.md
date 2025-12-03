# Quick Fix for PM2 Crash

## Problem
PM2 was looking for `.env.production` but the file is named `.env`

## Solution Applied
✅ Fixed `ecosystem.config.js` to use `.env` instead of `.env.production`
✅ Committed and pushed to git

## Run These Commands on VPS:

```bash
# 1. Stop PM2
pm2 delete all

# 2. Pull the fix
cd /root/matrix-delivery
git pull origin security-enforcement

# 3. Go to backend
cd backend

# 4. Start PM2 with the fixed config
pm2 start ecosystem.config.js --env production

# 5. Save PM2 configuration
pm2 save

# 6. Setup PM2 to start on boot
pm2 startup
# Run the command it gives you

# 7. Check status
pm2 status

# 8. View logs
pm2 logs --lines 20
```

## Expected Result

You should see:
```
┌────┬─────────────────────────┬─────────┬─────────┬──────────┬────────┬──────┬───────────┐
│ id │ name                    │ mode    │ pid     │ uptime   │ ↺      │ status│ cpu      │
├────┼─────────────────────────┼─────────┼─────────┼──────────┼────────┼──────┼──────────┤
│ 0  │ matrix-delivery-backend │ cluster │ 123456  │ 0s       │ 0      │ online│ 0%       │
│ 1  │ matrix-delivery-backend │ cluster │ 123457  │ 0s       │ 0      │ online│ 0%       │
└────┴─────────────────────────┴─────────┴─────────┴──────────┴────────┴──────┴──────────┘
```

Status should be **online** (not errored)!

## Verify Deployment

```bash
# Test health endpoint
curl http://localhost:5000/api/health

# Test security headers
curl -I https://matrix-api.oldantique50.com/api/health
```

## If Still Failing

Check the actual error:
```bash
pm2 logs --err --lines 50
```

And send me the error message!
