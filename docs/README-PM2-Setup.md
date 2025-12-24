# PM2 Setup for Automated Backend Deployment

This guide explains how to set up PM2 on your VPS to enable automated backend deployments via GitHub Actions.

## 🚀 Quick Setup

### 1. Run PM2 Setup Script on Your VPS

SSH into your VPS and run:

```bash
# Download the setup script
wget https://raw.githubusercontent.com/Amr1977/matrix-delivery/main/scripts/setup-pm2.sh

# Make it executable
chmod +x setup-pm2.sh

# Run the setup
./setup-pm2.sh
```

Or if you have the repo cloned on your VPS:

```bash
cd /root/matrix-delivery
./scripts/setup-pm2.sh
```

### 2. What the Script Does

The setup script will:
- ✅ Install PM2 globally if not already installed
- ✅ Configure PM2 to auto-start on server reboot
- ✅ Stop any existing backend processes
- ✅ Start your backend under PM2 management
- ✅ Show PM2 status and useful commands

### 3. Verify Setup

After running the script, check that everything is working:

```bash
# Check PM2 processes
pm2 list

# Check backend logs
pm2 logs matrix-delivery-backend

# Test health endpoint
curl https://matrix-api.oldantique50.com/api/health
```

## 🔄 Automated Deployment

Once PM2 is set up, your GitHub Actions workflow will automatically:

1. **Trigger** on push to `main`/`master` branch (backend changes only)
2. **Stop** the current backend service
3. **Pull** latest code changes
4. **Install** updated dependencies
5. **Start** the new backend version
6. **Verify** deployment with health checks

## 📋 Useful PM2 Commands

```bash
# View all processes
pm2 list

# View logs for backend
pm2 logs matrix-delivery-backend

# Restart backend
pm2 restart matrix-delivery-backend

# Stop backend
pm2 stop matrix-delivery-backend

# Start backend
pm2 start matrix-delivery-backend

# Monitor resources
pm2 monit

# Save current process list
pm2 save

# Generate startup script (run once after setup)
pm2 startup
```

## 🔧 Manual Deployment

If you need to deploy manually:

```bash
# Via SSH
ssh root@matrix-api.oldantique50.com
cd /root/matrix-delivery/backend
git pull origin main
npm ci --production
pm2 restart ecosystem.config.js
```

Or use the existing deploy script:

```bash
./scripts/deploy-backend.sh production
```

## 🐛 Troubleshooting

### PM2 Not Found
```bash
npm install -g pm2
```

### Service Won't Start
```bash
# Check logs
pm2 logs matrix-delivery-backend

# Check ecosystem config
cat backend/ecosystem.config.js

# Try starting manually
cd backend && pm2 start ecosystem.config.js --env production
```

### Health Check Fails
```bash
# Check if service is running
pm2 list

# Check backend port
netstat -tlnp | grep :5000

# Test locally
curl http://localhost:5000/api/health
```

### GitHub Actions Deployment Fails
1. Check GitHub Secrets are set correctly
2. Verify SSH key has proper permissions
3. Check server firewall allows connections
4. Review deployment logs in GitHub Actions tab

## 🔒 Security Notes

- PM2 runs with the same user permissions as your app
- SSH keys should have restricted access (no password, specific commands only)
- Consider using deployment keys with read-only access to repo

## 📊 Monitoring

- Use `pm2 monit` for real-time monitoring
- Check logs with `pm2 logs`
- Set up PM2 monitoring: `pm2 link <secret> <public>` (optional)

---

**Next Steps:**
1. Run the PM2 setup script on your VPS
2. Push a backend change to test automated deployment
3. Monitor the GitHub Actions workflow for successful deployment
