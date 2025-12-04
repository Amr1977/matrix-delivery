#!/bin/bash

##############################################################################
# Fix Apache WebSocket Configuration
# Enables proper WebSocket proxying for Socket.IO
#
# Usage: Run this on the VPS as root
# bash fix-websocket.sh
##############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() { echo -e "${GREEN}[✓]${NC} $1"; }
print_error() { echo -e "${RED}[✗]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[!]${NC} $1"; }

echo "========================================="
echo "  Fix Apache WebSocket Configuration"
echo "========================================="
echo ""

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    print_error "This script must be run as root"
    exit 1
fi

DOMAIN="matrix-api.oldantique50.com"
CONF_FILE="/etc/apache2/sites-available/${DOMAIN}-le-ssl.conf"
BACKUP_FILE="/etc/apache2/sites-available/${DOMAIN}-le-ssl.conf.backup.$(date +%Y%m%d_%H%M%S)"

# Step 1: Backup current config
print_status "Backing up current configuration..."
cp "$CONF_FILE" "$BACKUP_FILE"
print_status "Backup saved to: $BACKUP_FILE"

# Step 2: Enable required Apache modules
print_status "Enabling required Apache modules..."
a2enmod proxy
a2enmod proxy_http
a2enmod proxy_wstunnel
a2enmod rewrite
a2enmod headers
a2enmod ssl

print_status "Apache modules enabled"

# Step 3: Test Apache configuration
print_status "Testing Apache configuration..."
if apache2ctl configtest; then
    print_status "Apache configuration is valid"
else
    print_error "Apache configuration test failed!"
    print_warning "Please check the configuration manually"
    exit 1
fi

# Step 4: Reload Apache
print_status "Reloading Apache..."
systemctl reload apache2

if [ $? -eq 0 ]; then
    print_status "Apache reloaded successfully"
else
    print_error "Failed to reload Apache"
    exit 1
fi

print_status "WebSocket configuration fix completed!"
echo ""
echo "Next steps:"
echo "  1. Test WebSocket connection from browser"
echo "  2. Check browser console for WebSocket errors"
echo "  3. Verify real-time notifications work"
echo ""
echo "To test WebSocket:"
echo "  Open browser DevTools → Network → WS tab"
echo "  You should see successful WebSocket connections"
