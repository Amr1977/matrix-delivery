# Deployment Guide

This guide explains how to automate .env file updates when deploying your Matrix Delivery application.

## 🚀 Automated Deployment Options

### Option 1: GitHub Actions (Recommended)

#### Setup GitHub Secrets
In your GitHub repository, add these secrets:
- `SERVER_HOST`: Your server IP/domain (e.g., `matrix-api.oldantique50.com`)
- `SERVER_USER`: SSH username for server access
- `SERVER_SSH_KEY`: Private SSH key for authentication
- `SERVER_PORT`: SSH port (default: 22)
- `PROJECT_PATH`: Path to backend on server (e.g., `/var/www/matrix-delivery/backend`)
- `SLACK_WEBHOOK_URL`: Optional, for deployment notifications

#### Automatic Deployment
The `.github/workflows/deploy-backend.yml` workflow automatically:
- Deploys when you push to `main`/`master` branch
- Only triggers when backend files change
- Runs tests before deployment
- Restarts PM2 service
- Performs health checks

### Option 2: Manual Deployment Scripts

#### Environment Sync Script
```bash
# Sync environment variables to production
./scripts/sync-env.sh production

# Or for staging
./scripts/sync-env.sh staging
```

#### Full Deployment Script
```bash
# Deploy everything to production
./scripts/deploy-backend.sh production
```

## 📁 Environment File Management

### File Structure
```
backend/
├── .env                    # Local development (ignored by git)
├── .env.example           # Template with placeholder values
├── .env.production        # Production environment variables
└── .env.staging          # Staging environment variables
```

### Creating Environment Files

1. **Copy the template:**
   ```bash
   cp backend/.env.example backend/.env.production
   ```

2. **Edit with real values:**
   ```bash
   nano backend/.env.production
   ```

3. **Critical variables to update:**
   ```bash
   # Database
   DB_PASSWORD=your_real_db_password
   JWT_SECRET=your_secure_jwt_secret

   # CORS (include all your domains)
   CORS_ORIGIN=https://matrix-delivery.oldantique50.com,https://matrix-delivery.web.app,http://localhost:3000

   # reCAPTCHA
   RECAPTCHA_SECRET_KEY=your_recaptcha_secret
   ```

## 🔧 Manual Environment Updates

### Quick Environment Sync
When you update CORS_ORIGIN or other environment variables:

```bash
# Update the server's .env file
./scripts/sync-env.sh

# Or manually via SSH
scp backend/.env user@server:/path/to/backend/.env
ssh user@server "cd /path/to/backend && pm2 restart ecosystem.config.js"
```

### For Different Environments
```bash
# Production
./scripts/sync-env.sh production

# Staging
./scripts/sync-env.sh staging

# Custom environment
./scripts/sync-env.sh custom
```

## 🗄️ Production Database Configuration

### Common Issues
If deployment fails with database authentication errors, check these:

#### 1. Database Connection Issues
```
Error: password authentication failed for user "postgres"
```

**Solution:**
1. On your production server, check PostgreSQL authentication:
   ```bash
   sudo -u postgres psql -c "SELECT usename FROM pg_user;"
   sudo -u postgres psql -c "SELECT * FROM pg_hba_file_rules;"
   ```

2. Ensure your production `.env` file has correct database credentials:
   ```bash
   # Example production .env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=matrix_delivery
   DB_USER=postgres
   DB_PASSWORD=your_actual_production_password
   ```

3. For remote PostgreSQL (like AWS RDS):
   ```bash
   DB_HOST=your-database-host.rds.amazonaws.com
   DB_USER=matrix_delivery_user
   DB_PASSWORD=secure_production_password
   ```

#### 2. Port Conflicts (Port 5000 Already in Use)
If deployments fail because port 5000 is in use:

**Automated Fix (in workflow):**
The deployment script now automatically kills conflicting processes, but you can also manually:

```bash
# On server, check what's using port 5000
sudo lsof -i :5000
sudo netstat -tulpn | grep :5000

# Kill conflicting processes
sudo fuser -k 5000/tcp
sudo pkill -f "node.*5000"
```

#### 3. File Permission Issues with Migration Scripts
```
bash: line 28: ./scripts/migrate-map-location-picker.js: Permission denied
```

**Solution:**
The deployment script now includes `chmod +x`, but you can manually fix:
```bash
# On server
chmod +x scripts/migrate-map-location-picker.js
```

### Database Migration Troubleshooting
If migrations fail during deployment:

1. Check script permissions: `ls -la scripts/migrate-map-location-picker.js`
2. Verify Node.js is available: `which node`
3. Test migration manually:
   ```bash
   cd scripts
   node migrate-map-location-picker.js
   ```

## 🔒 Security Best Practices

### Never Commit Secrets
- `.env` files are in `.gitignore`
- Use `.env.example` as template
- Store secrets in GitHub Secrets or vault services

### Environment Variable Priority
1. System environment variables (highest priority)
2. `.env` file loaded by dotenv
3. Default values in code (lowest priority)

### SSH Key Setup
```bash
# Generate SSH key pair
ssh-keygen -t rsa -b 4096 -C "deployment@yourapp.com"

# Copy public key to server
ssh-copy-id user@matrix-api.oldantique50.com

# Add private key to GitHub Secrets as SERVER_SSH_KEY
```

## 📊 Monitoring Deployments

### Health Checks
The deployment scripts automatically check:
```bash
curl https://matrix-api.oldantique50.com/api/health
```

### Logs
Check PM2 logs on server:
```bash
pm2 logs matrix-delivery-backend
```

### Rollback
If deployment fails:
```bash
# Restore previous .env
ssh user@server "cd /path/to/backend && cp .env.backup.* .env && pm2 restart ecosystem.config.js"
```

## 🎯 Quick Start

1. **Setup environment files:**
   ```bash
   cp backend/.env.example backend/.env.production
   # Edit with real values
   ```

2. **Configure GitHub Secrets** for automated deployment

3. **Deploy:**
   ```bash
   git push origin main  # Triggers automatic deployment
   # OR
   ./scripts/deploy-backend.sh  # Manual deployment
   ```

4. **Verify:**
   ```bash
   curl https://matrix-api.oldantique50.com/api/health
   ```

## 🆘 Troubleshooting

### CORS Still Not Working
1. Check server's .env file: `ssh user@server "cat /path/to/backend/.env"`
2. Verify CORS_ORIGIN includes your domain
3. Restart service: `pm2 restart ecosystem.config.js`

### Deployment Fails
1. Check SSH access: `ssh user@server`
2. Verify file permissions
3. Check PM2 status: `pm2 status`

### Environment Variables Not Updating
1. Ensure .env file is uploaded to correct path
2. Check file permissions on server
3. Restart the application after .env changes
