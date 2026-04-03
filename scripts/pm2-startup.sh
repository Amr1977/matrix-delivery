#!/bin/bash

# PM2 Startup Setup Script
# This script configures PM2 to auto-start on server reboot
# Run this once on each server

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() { echo -e "${GREEN}[INFO]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }

echo "🔧 PM2 Startup Configuration"
echo "============================="
echo ""

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "PM2 is not installed. Install it with: npm install -g pm2"
    exit 1
fi

print_status "PM2 version: $(pm2 --version)"

# Save current PM2 state
print_status "Saving current PM2 processes..."
pm2 save

# Generate startup command
print_status "Generating startup script..."
STARTUP_CMD=$(pm2 startup 2>/dev/null | tail -1)

if [[ -z "$STARTUP_CMD" ]]; then
    print_warning "Could not auto-detect startup command"
    echo ""
    echo "For systemd (most common), run manually:"
    echo "  sudo env PATH=\$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $(whoami) --hp \$HOME"
    echo ""
    echo "Or check: pm2 startup"
else
    echo ""
    print_warning "Copy and run this command as root:"
    echo ""
    echo "$STARTUP_CMD"
    echo ""
    read -p "Run it now? (y/N): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        eval "$STARTUP_CMD"
        print_status "Startup configured!"
    fi
fi

# Verify startup is enabled
print_status "Checking systemd service..."
if systemctl is-enabled pm2-$(whoami) &> /dev/null; then
    print_status "✅ PM2 will auto-start on reboot"
    systemctl status pm2-$(whoami) --no-pager | head -5
else
    print_warning "PM2 startup not enabled. Run the startup command above."
fi

echo ""
print_status "Done! PM2 state will persist across reboots."