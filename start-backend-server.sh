#!/bin/bash
# === Matrix Delivery Backend Server Startup Script ===
# Environment-based server startup for Ubuntu/VPS
# Supports: development, staging, production environments

set -e  # Exit on error

# Configuration
BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/backend"
ENVIRONMENT="${1:-development}"  # Default to development if no argument provided
LOG_FILE="$BACKEND_DIR/logs/startup-$(date +%Y%m%d-%H%M%S).log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $*" | tee -a "$LOG_FILE"
}

# Error function
error() {
    echo -e "${RED}ERROR: $*${NC}" >&2
    log "ERROR: $*"
    exit 1
}

# Success function
success() {
    echo -e "${GREEN}SUCCESS: $*${NC}"
    log "SUCCESS: $*"
}

# Info function
info() {
    echo -e "${BLUE}INFO: $*${NC}"
    log "INFO: $*"
}

# Warning function
warning() {
    echo -e "${YELLOW}WARNING: $*${NC}"
    log "WARNING: $*"
}

# Validate environment
validate_environment() {
    case "$ENVIRONMENT" in
        development|staging|production)
            info "Environment set to: $ENVIRONMENT"
            ;;
        *)
            error "Invalid environment: $ENVIRONMENT. Must be: development, staging, or production"
            ;;
    esac
}

# Check system requirements
check_requirements() {
    info "Checking system requirements..."

    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed. Please install Node.js 16+ first."
    fi

    # Check Node.js version
    NODE_VERSION=$(node --version | sed 's/v//' | cut -d. -f1)
    if [ "$NODE_VERSION" -lt 16 ]; then
        error "Node.js version 16+ required. Current version: $(node --version)"
    fi

    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        error "npm is not installed. Please install npm."
    fi

    # Check if PostgreSQL is running (optional - just warn)
    if ! pg_isready &> /dev/null 2>&1; then
        warning "PostgreSQL does not appear to be running. Please ensure it's started."
    fi

    success "System requirements check passed"
}

# Setup environment file
setup_environment() {
    info "Setting up environment configuration..."

    local env_file="$BACKEND_DIR/.env.$ENVIRONMENT"

    if [ ! -f "$env_file" ]; then
        error "Environment file not found: $env_file"
    fi

    # Copy the appropriate environment file
    cp "$env_file" "$BACKEND_DIR/.env"
    success "Environment configured for: $ENVIRONMENT"
}

# Install dependencies
install_dependencies() {
    info "Installing dependencies..."

    cd "$BACKEND_DIR"

    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        info "Installing npm dependencies..."
        npm ci --production=false
        success "Dependencies installed"
    else
        info "Dependencies already installed, checking for updates..."
        npm audit fix --audit-level=moderate || true
    fi
}

# Check database connectivity
check_database() {
    info "Checking database connectivity..."

    cd "$BACKEND_DIR"

    # Simple database connectivity test
    node -e "
    require('dotenv').config();
    const { Pool } = require('pg');
    const pool = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectionTimeoutMillis: 5000
    });

    pool.connect()
      .then(() => {
        console.log('Database connection successful');
        pool.end();
        process.exit(0);
      })
      .catch(err => {
        console.error('Database connection failed:', err.message);
        process.exit(1);
      });
    "

    if [ $? -eq 0 ]; then
        success "Database connectivity check passed"
    else
        error "Database connectivity check failed"
    fi
}

# Start server based on environment
start_server() {
    info "Starting Matrix Delivery Backend Server..."

    cd "$BACKEND_DIR"

    case "$ENVIRONMENT" in
        development)
            info "Starting in development mode (direct Node.js)..."
            # Start directly with Node.js for development
            nohup node server.js > logs/server.log 2>&1 &
            SERVER_PID=$!
            echo $SERVER_PID > server.pid
            success "Server started with PID: $SERVER_PID"
            info "Server logs: $BACKEND_DIR/logs/server.log"
            info "To stop: kill $SERVER_PID or kill \$(cat server.pid)"
            ;;

        staging|production)
            info "Starting in $ENVIRONMENT mode (PM2)..."

            # Check if PM2 is installed
            if ! command -v pm2 &> /dev/null; then
                info "Installing PM2..."
                npm install -g pm2
            fi

            # Start with PM2
            pm2 start ecosystem.config.js --env $ENVIRONMENT

            # Save PM2 process list
            pm2 save

            success "Server started with PM2"
            info "PM2 commands:"
            info "  Status: pm2 status"
            info "  Logs: pm2 logs matrix-delivery-backend"
            info "  Stop: pm2 stop matrix-delivery-backend"
            info "  Restart: pm2 restart matrix-delivery-backend"
            ;;
    esac
}

# Health check
health_check() {
    info "Performing health check..."

    local port=$(grep "PORT=" "$BACKEND_DIR/.env" | cut -d'=' -f2)
    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "http://localhost:$port/api/health" > /dev/null 2>&1; then
            success "Health check passed - Server is responding"
            return 0
        fi

        info "Waiting for server to be ready... (attempt $attempt/$max_attempts)"
        sleep 2
        ((attempt++))
    done

    warning "Health check failed - Server may not be fully ready yet"
    return 1
}

# Main execution
main() {
    echo "=================================================="
    echo "🚚 Matrix Delivery Backend Server Startup"
    echo "=================================================="
    log "Starting Matrix Delivery Backend Server - Environment: $ENVIRONMENT"

    validate_environment
    check_requirements
    setup_environment
    install_dependencies
    check_database
    start_server
    health_check

    echo "=================================================="
    success "Matrix Delivery Backend Server startup completed!"
    echo "Environment: $ENVIRONMENT"
    echo "Logs: $LOG_FILE"
    if [ "$ENVIRONMENT" = "development" ]; then
        echo "Server PID: $(cat $BACKEND_DIR/server.pid 2>/dev/null || echo 'Unknown')"
    fi
    echo "=================================================="
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [environment]"
        echo ""
        echo "Environments:"
        echo "  development  - Development mode (default)"
        echo "  staging      - Staging mode with PM2"
        echo "  production   - Production mode with PM2"
        echo ""
        echo "Examples:"
        echo "  $0                    # Start in development mode"
        echo "  $0 production        # Start in production mode"
        echo "  $0 staging           # Start in staging mode"
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac
