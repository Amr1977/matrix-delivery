#!/bin/bash

# PM2 Setup Script for Matrix Delivery Backend
# This script installs and configures PM2 to manage the backend server
# Run this on your VPS server

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_PATH="/root/matrix-delivery/backend"
SERVICE_NAME="matrix-delivery-backend"

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

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if running as root or with sudo
check_permissions() {
    if [[ $EUID -eq 0 ]]; then
        print_status "Running with root privileges"
    else
        print_warning "Not running as root. Some operations may require sudo."
    fi
}

# Install PM2 globally
install_pm2() {
    print_step "Installing PM2 globally..."

    if command -v pm2 &> /dev/null; then
        print_status "PM2 is already installed"
        pm2 --version
        return
    fi

    if command -v npm &> /dev/null; then
        print_status "Installing PM2 via npm..."
        npm install -g pm2
        print_status "PM2 installed successfully"
        pm2 --version
    else
        print_error "npm not found. Please install Node.js and npm first."
        exit 1
    fi
}

# Setup PM2 startup script
setup_pm2_startup() {
    print_step "Setting up PM2 startup script..."

    # Save current PM2 processes
    pm2 save

    # Generate startup script
    pm2 startup

    print_status "PM2 startup script configured"
    print_warning "Note: You may need to run the generated startup command manually if prompted"
}

# Stop any existing backend processes
stop_existing_processes() {
    print_step "Stopping existing backend processes..."

    # Kill any processes on port 5000
    if command -v lsof &> /dev/null; then
        PIDS=$(lsof -ti:5000 2>/dev/null || true)
        if [[ -n "$PIDS" ]]; then
            print_warning "Found processes on port 5000: $PIDS"
            kill -9 $PIDS 2>/dev/null || true
            sleep 2
        fi
    fi

    # Stop PM2 processes if any
    pm2 delete all 2>/dev/null || true

    print_status "Existing processes stopped"
}

# Start backend with PM2
start_backend_with_pm2() {
    print_step "Starting backend with PM2..."

    if [[ ! -d "$PROJECT_PATH" ]]; then
        print_error "Project path $PROJECT_PATH does not exist"
        exit 1
    fi

    cd "$PROJECT_PATH"

    # Check if ecosystem.config.js exists
    if [[ ! -f "ecosystem.config.js" ]]; then
        print_error "ecosystem.config.js not found in $PROJECT_PATH"
        exit 1
    fi

    # Install dependencies if needed
    if [[ ! -d "node_modules" ]]; then
        print_status "Installing dependencies..."
        npm ci --production
    fi

    # Start with PM2
    print_status "Starting backend service with PM2..."
    pm2 start ecosystem.config.js --env production

    # Save PM2 configuration
    pm2 save

    print_status "Backend started successfully with PM2"
}

# Show PM2 status
show_status() {
    print_step "PM2 Status:"
    echo ""
    pm2 list
    echo ""
    pm2 show $SERVICE_NAME 2>/dev/null || print_warning "Service $SERVICE_NAME not found"
}

# Main setup function
main() {
    echo "🚀 Setting up PM2 for Matrix Delivery Backend"
    echo "=============================================="
    echo ""

    check_permissions
    install_pm2
    setup_pm2_startup
    stop_existing_processes
    start_backend_with_pm2
    show_status

    echo ""
    echo "✅ PM2 setup completed successfully!"
    echo ""
    echo "📋 Useful PM2 commands:"
    echo "   pm2 list                    # Show all processes"
    echo "   pm2 logs $SERVICE_NAME      # View logs"
    echo "   pm2 restart $SERVICE_NAME   # Restart service"
    echo "   pm2 stop $SERVICE_NAME      # Stop service"
    echo "   pm2 delete $SERVICE_NAME    # Remove from PM2"
    echo ""
    echo "🔄 Your backend will now auto-restart on server reboot"
    echo "🔧 GitHub Actions can now properly manage deployments"
}

# Run main function
main "$@"
