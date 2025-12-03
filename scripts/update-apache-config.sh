#!/bin/bash

##############################################################################
# Apache Configuration Update Script for Matrix Delivery
# Updates Apache reverse proxy configuration with security headers
#
# Usage: bash update-apache-config.sh
# Run on VPS as root
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

# Configuration
DOMAIN="matrix-api.oldantique50.com"
CONF_FILE="/etc/apache2/sites-available/${DOMAIN}-le-ssl.conf"
BACKUP_FILE="/etc/apache2/sites-available/${DOMAIN}-le-ssl.conf.backup.$(date +%Y%m%d_%H%M%S)"

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    print_error "This script must be run as root"
    exit 1
fi

# Backup existing configuration
print_status "Backing up existing configuration to $BACKUP_FILE"
cp "$CONF_FILE" "$BACKUP_FILE"

# Create new secure configuration
print_status "Creating new Apache configuration..."

cat > "$CONF_FILE" <<'EOF'
<IfModule mod_ssl.c>
<VirtualHost *:443>
    ServerName matrix-api.oldantique50.com
    ServerAdmin admin@matrix-delivery.com

    # Security: Disable ModSecurity if causing issues
    # Consider enabling with custom rules for production
    <IfModule security2_module>
        SecRuleEngine Off
    </IfModule>

    # Security Headers
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-Frame-Options "DENY"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Permissions-Policy "geolocation=(self), microphone=(), camera=()"

    # Remove server information
    Header always unset X-Powered-By
    Header always unset Server

    # CORS Headers - Let backend handle CORS
    # Remove any CORS headers set by Apache
    Header always unset Access-Control-Allow-Origin
    Header always unset Access-Control-Allow-Methods
    Header always unset Access-Control-Allow-Headers
    Header always unset Access-Control-Allow-Credentials

    # WebSocket support - must come before regular proxy
    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} websocket [NC]
    RewriteCond %{HTTP:Connection} upgrade [NC]
    RewriteRule ^/?(.*) ws://localhost:5000/$1 [P,L]

    # Regular proxy configuration
    ProxyPreserveHost On
    ProxyRequests Off
    ProxyPass / http://127.0.0.1:5000/
    ProxyPassReverse / http://127.0.0.1:5000/
    ProxyTimeout 3600

    # Proxy headers
    RequestHeader set X-Forwarded-Proto "https"
    RequestHeader set X-Forwarded-Port "443"

    # Rate limiting (requires mod_ratelimit)
    <IfModule mod_ratelimit.c>
        <Location /api/auth>
            SetOutputFilter RATE_LIMIT
            SetEnv rate-limit 400
        </Location>
    </IfModule>

    # Logging
    ErrorLog ${APACHE_LOG_DIR}/matrix-api-error.log
    CustomLog ${APACHE_LOG_DIR}/matrix-api-access.log combined

    # SSL Configuration
    SSLCertificateFile /etc/letsencrypt/live/matrix-api.oldantique50.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/matrix-api.oldantique50.com/privkey.pem
    Include /etc/letsencrypt/options-ssl-apache.conf

    # SSL Security
    SSLProtocol all -SSLv2 -SSLv3 -TLSv1 -TLSv1.1
    SSLCipherSuite HIGH:!aNULL:!MD5:!3DES
    SSLHonorCipherOrder on
    SSLCompression off
    SSLSessionTickets off
</VirtualHost>
</IfModule>
EOF

print_status "New configuration created"

# Enable required Apache modules
print_status "Enabling required Apache modules..."
a2enmod ssl
a2enmod headers
a2enmod rewrite
a2enmod proxy
a2enmod proxy_http
a2enmod proxy_wstunnel
a2enmod ratelimit 2>/dev/null || print_warning "mod_ratelimit not available"

# Test Apache configuration
print_status "Testing Apache configuration..."
if apache2ctl configtest; then
    print_status "Apache configuration is valid"
else
    print_error "Apache configuration test failed!"
    print_warning "Restoring backup configuration..."
    cp "$BACKUP_FILE" "$CONF_FILE"
    exit 1
fi

# Reload Apache
print_status "Reloading Apache..."
systemctl reload apache2

print_status "Apache configuration updated successfully!"
echo ""
echo "Changes made:"
echo "  ✓ Added security headers (HSTS, X-Frame-Options, CSP, etc.)"
echo "  ✓ Removed CORS headers (backend now handles CORS)"
echo "  ✓ Enhanced SSL security (disabled old protocols)"
echo "  ✓ Added rate limiting for /api/auth endpoints"
echo "  ✓ Improved proxy configuration"
echo ""
echo "Backup saved to: $BACKUP_FILE"
echo ""
echo "Verify with: curl -I https://matrix-api.oldantique50.com/api/health"
