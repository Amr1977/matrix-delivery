# Matrix Delivery Backend Deployment Guide

## 🚀 Quick Start

### Prerequisites
- Ubuntu 20.04+ or similar Linux distribution
- Node.js 16+ and npm
- PostgreSQL 12+
- Git

### Basic Installation
```bash
# Clone repository
git clone https://github.com/your-repo/matrix-delivery.git
cd matrix-delivery

# Make startup script executable
chmod +x start-backend-server.sh

# Start server (defaults to development)
./start-backend-server.sh
```

## 📋 Environment Configuration

### Available Environments
- **development**: Local development with hot reload
- **staging**: Pre-production testing environment
- **production**: Live production environment

### Environment Files
- `.env.develop` - Development configuration
- `.env.staging` - Staging configuration
- `.env.production` - Production configuration

### Database Setup
Each environment uses a different database:
- Development: `matrix_delivery_develop`
- Staging: `matrix_delivery_staging`
- Production: `matrix_delivery_production`

## 🛠️ Manual Setup (Alternative)

If you prefer manual setup:

```bash
# Navigate to backend directory
cd backend

# Copy appropriate environment file
cp .env.production .env  # or .env.staging, .env.develop

# Install dependencies
npm install

# Start server
npm start  # development
# OR
pm2 start ecosystem.config.js  # production/staging
```

## 📊 Server Management

### Development Mode
```bash
# Start
./start-backend-server.sh development

# Check status
ps aux | grep node

# Stop
kill $(cat backend/server.pid)
```

### Production/Staging Mode (PM2)
```bash
# Start
./start-backend-server.sh production

# Check status
pm2 status

# View logs
pm2 logs matrix-delivery-backend

# Restart
pm2 restart matrix-delivery-backend

# Stop
pm2 stop matrix-delivery-backend
```

## 🔧 Configuration

### Environment Variables

#### Server Configuration
```bash
NODE_ENV=production          # development | staging | production
PORT=5000                    # Server port
HOST=0.0.0.0                # Bind address
```

#### Database Configuration
```bash
DB_HOST=localhost           # Database host
DB_PORT=5432                # Database port
DB_NAME=matrix_delivery     # Database name
DB_USER=postgres           # Database user
DB_PASSWORD=your_password   # Database password
```

#### Security Configuration
```bash
JWT_SECRET=your_jwt_secret_here  # Generate strong secret
CORS_ORIGIN=https://yourdomain.com  # Allowed origins
```

#### reCAPTCHA Configuration
```bash
RECAPTCHA_SECRET_KEY=your_secret_key
RECAPTCHA_SITE_KEY=your_site_key
```

## 🗄️ Database Setup

### PostgreSQL Installation (Ubuntu)
```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql
```

### Database Commands
```sql
-- Create databases
CREATE DATABASE matrix_delivery_develop;
CREATE DATABASE matrix_delivery_staging;
CREATE DATABASE matrix_delivery_production;

-- Create user
CREATE USER matrix_user WITH PASSWORD 'your_password';

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE matrix_delivery_develop TO matrix_user;
GRANT ALL PRIVILEGES ON DATABASE matrix_delivery_staging TO matrix_user;
GRANT ALL PRIVILEGES ON DATABASE matrix_delivery_production TO matrix_user;

-- Exit
\q
```

### Database Migration
The server automatically creates required tables on startup. No manual migration needed.

## 🔍 Monitoring & Troubleshooting

### Health Check
```bash
curl http://localhost:5000/api/health
```

### Logs
```bash
# Development
tail -f backend/logs/server.log

# Production
pm2 logs matrix-delivery-backend
```

### Common Issues

#### Port Already in Use
```bash
# Find process using port 5000
sudo lsof -i :5000

# Kill process
sudo kill -9 <PID>
```

#### Database Connection Failed
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check database exists
psql -U postgres -l
```

#### Permission Issues
```bash
# Fix permissions
sudo chown -R $USER:$USER /path/to/matrix-delivery
chmod +x start-backend-server.sh
```

## 🚀 Deployment Checklist

- [ ] Server prerequisites installed (Node.js, PostgreSQL)
- [ ] Database created and configured
- [ ] Environment variables set correctly
- [ ] SSL certificate configured (for production)
- [ ] Firewall configured (ports 80, 443, 5000)
- [ ] Domain DNS configured
- [ ] Backup strategy in place
- [ ] Monitoring tools configured

## 📞 Support

For issues:
1. Check server logs
2. Verify environment configuration
3. Test database connectivity
4. Check firewall and network settings

## 🔄 Updates

To update the server:
```bash
# Pull latest changes
git pull origin main

# Restart server
./start-backend-server.sh production
```

## 🛡️ Security Notes

- Change default database passwords
- Use strong JWT secrets
- Configure SSL/TLS in production
- Regularly update dependencies
- Monitor logs for suspicious activity
- Use fail2ban for SSH protection
