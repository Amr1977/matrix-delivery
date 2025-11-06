#!/bin/bash

# Backend Deployment Script with Environment Sync
# Usage: ./scripts/deploy-backend.sh [environment]

set -e

ENVIRONMENT=${1:-production}
SERVER_HOST="matrix-api.oldantique50.com"
SERVER_USER="root"
PROJECT_PATH="/root/matrix-delivery/backend"

echo "🚀 Deploying backend to $ENVIRONMENT environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    if ! command -v rsync &> /dev/null; then
        print_error "rsync is required but not installed. Please install rsync."
        exit 1
    fi

    if ! command -v ssh &> /dev/null; then
        print_error "ssh is required but not installed."
        exit 1
    fi
}

# Sync environment variables
sync_env() {
    print_status "Syncing environment variables for $ENVIRONMENT environment..."

    # Create .env file on server if it doesn't exist
    ssh $SERVER_USER@$SERVER_HOST "mkdir -p $PROJECT_PATH"

    # Upload environment-specific .env file
    if [ -f "backend/.env.$ENVIRONMENT" ]; then
        scp "backend/.env.$ENVIRONMENT" "$SERVER_USER@$SERVER_HOST:$PROJECT_PATH/.env"
        print_status "Environment file synced for $ENVIRONMENT"
    else
        print_error "Environment file backend/.env.$ENVIRONMENT not found!"
        print_error "Please create the environment file first."
        exit 1
    fi
}

# Deploy code
deploy_code() {
    print_status "Deploying code to server..."

    # Exclude sensitive files
    rsync -avz --exclude='.env*' --exclude='node_modules' --exclude='.git' --exclude='logs' \
        ./backend/ $SERVER_USER@$SERVER_HOST:$PROJECT_PATH/

    print_status "Code deployed successfully"
}

# Install dependencies and restart service
restart_service() {
    print_status "Installing dependencies and restarting service..."

    ssh $SERVER_USER@$SERVER_HOST "
        cd $PROJECT_PATH
        npm ci --production
        pm2 restart ecosystem.config.js --env $ENVIRONMENT
        pm2 save
    "

    print_status "Service restarted successfully"
}

# Health check
health_check() {
    print_status "Performing health check..."

    # Wait for service to start
    sleep 10

    if curl -f -s "https://$SERVER_HOST/api/health" > /dev/null; then
        print_status "✅ Health check passed!"
    else
        print_error "❌ Health check failed!"
        exit 1
    fi
}

# Main deployment process
main() {
    print_status "Starting backend deployment to $ENVIRONMENT"

    check_dependencies
    sync_env
    deploy_code
    restart_service
    health_check

    print_status "🎉 Backend deployment completed successfully!"
    print_status "Your API is now running at: https://$SERVER_HOST/api"
}

# Run main function
main "$@"
