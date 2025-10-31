#!/bin/bash

# Environment Sync Script
# Syncs .env files to production server
# Usage: ./scripts/sync-env.sh [environment]

set -e

ENVIRONMENT=${1:-production}
SERVER_HOST="matrix-api.oldantique50.com"
SERVER_USER="root"  # Update this with your actual server username
PROJECT_PATH="/var/www/matrix-delivery/backend"  # Update this with your actual project path

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🔄 Syncing environment variables to $ENVIRONMENT...${NC}"

# Check if environment file exists
if [ -f "backend/.env.$ENVIRONMENT" ]; then
    ENV_FILE="backend/.env.$ENVIRONMENT"
    echo -e "${GREEN}📄 Using environment file: $ENV_FILE${NC}"
elif [ -f "backend/.env" ]; then
    ENV_FILE="backend/.env"
    echo -e "${YELLOW}⚠️  Environment-specific file not found, using default .env${NC}"
else
    echo -e "${RED}❌ No .env file found!${NC}"
    exit 1
fi

# Backup current .env on server
echo -e "${GREEN}💾 Creating backup on server...${NC}"
ssh $SERVER_USER@$SERVER_HOST "cd $PROJECT_PATH && cp .env .env.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true"

# Upload new .env file
echo -e "${GREEN}📤 Uploading new environment file...${NC}"
scp $ENV_FILE $SERVER_USER@$SERVER_HOST:$PROJECT_PATH/.env

# Verify upload
echo -e "${GREEN}✅ Verifying upload...${NC}"
ssh $SERVER_USER@$SERVER_HOST "cd $PROJECT_PATH && ls -la .env"

# Show diff (optional)
echo -e "${GREEN}📊 Environment variables updated:${NC}"
grep -E "^[A-Z_]+" $ENV_FILE | cut -d'=' -f1 | while read var; do
    echo "  - $var"
done

echo -e "${GREEN}🔄 Restarting service to apply changes...${NC}"
ssh $SERVER_USER@$SERVER_HOST "cd $PROJECT_PATH && pm2 restart ecosystem.config.js && pm2 save"

echo -e "${GREEN}⏳ Waiting for service to restart...${NC}"
sleep 5

echo -e "${GREEN}🏥 Running health check...${NC}"
if ssh $SERVER_USER@$SERVER_HOST "curl -f -s https://$SERVER_HOST/api/health > /dev/null"; then
    echo -e "${GREEN}✅ Environment sync completed successfully!${NC}"
else
    echo -e "${RED}❌ Health check failed! Please check server logs.${NC}"
    exit 1
fi
