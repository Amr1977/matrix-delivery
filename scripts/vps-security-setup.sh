#!/bin/bash

##############################################################################
# VPS Security Hardening Script for Matrix Delivery Backend
# This script performs comprehensive security setup on the production VPS
#
# Usage: bash vps-security-setup.sh
# Run as: root or with sudo privileges
##############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_PATH="/var/www/matrix-delivery"
BACKEND_PATH="$PROJECT_PATH/backend"
APP_USER="matrix-app"
APP_GROUP="matrix-app"
NODE_VERSION="18"

# Function to print colored output
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[→]${NC} $1"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "This script must be run as root or with sudo"
        exit 1
    fi
    print_status "Running with root privileges"
}

# Update system packages
update_system() {
    print_step "Updating system packages..."
    apt-get update -qq
    apt-get upgrade -y -qq
    print_status "System packages updated"
}

# Install required packages
install_dependencies() {
    print_step "Installing required packages..."
    apt-get install -y -qq \
        ufw \
        fail2ban \
        apache2 \
        certbot \
        python3-certbot-apache \
        postgresql \
        postgresql-contrib \
        nodejs \
        npm \
        git \
        curl \
        wget \
        unzip
    
    print_status "Dependencies installed"
}

# Create non-root application user
create_app_user() {
    print_step "Creating application user..."
    
    if id "$APP_USER" &>/dev/null; then
        print_warning "User $APP_USER already exists"
    else
        useradd -r -s /bin/bash -d "$PROJECT_PATH" -m "$APP_USER"
        print_status "User $APP_USER created"
    fi
}

# Configure firewall
configure_firewall() {
    print_step "Configuring UFW firewall..."
    
    # Reset UFW to default
    ufw --force reset
    
    # Default policies
    ufw default deny incoming
    ufw default allow outgoing
    
    # Allow SSH (change port if you use non-standard)
    ufw allow 2222/tcp comment 'SSH'
    
    # Allow HTTP and HTTPS
    ufw allow 80/tcp comment 'HTTP'
    ufw allow 443/tcp comment 'HTTPS'
    
    # Allow PostgreSQL only from localhost
    ufw allow from 127.0.0.1 to any port 5432 comment 'PostgreSQL localhost'
    
    # Enable firewall
    ufw --force enable
    
    print_status "Firewall configured and enabled"
}

# Configure Fail2Ban
configure_fail2ban() {
    print_step "Configuring Fail2Ban..."
    
    # Create jail.local configuration
    cat > /etc/fail2ban/jail.local <<EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5
destemail = amr.lotfy.othman@gmail.com
sendername = Fail2Ban

[sshd]
enabled = true
port = 2222
logpath = /var/log/auth.log

[apache-auth]
enabled = true
port = http,https
logpath = /var/log/apache2/error.log

[apache-badbots]
enabled = true
port = http,https
logpath = /var/log/apache2/access.log

[apache-noscript]
enabled = true
port = http,https
logpath = /var/log/apache2/error.log
EOF

    # Restart Fail2Ban
    systemctl restart fail2ban
    systemctl enable fail2ban
    
    print_status "Fail2Ban configured and started"
}

# Secure PostgreSQL
secure_postgresql() {
    print_step "Securing PostgreSQL..."
    
    # Update PostgreSQL configuration
    PG_VERSION=$(ls /etc/postgresql/)
    PG_CONF="/etc/postgresql/$PG_VERSION/main/postgresql.conf"
    PG_HBA="/etc/postgresql/$PG_VERSION/main/pg_hba.conf"
    
    # Listen only on localhost
    sed -i "s/#listen_addresses = 'localhost'/listen_addresses = 'localhost'/" "$PG_CONF"
    
    # Require SSL connections
    sed -i "s/#ssl = off/ssl = on/" "$PG_CONF"
    
    # Update pg_hba.conf to require password authentication
    cat > "$PG_HBA" <<EOF
# TYPE  DATABASE        USER            ADDRESS                 METHOD
local   all             postgres                                peer
local   all             all                                     md5
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5
EOF

    # Restart PostgreSQL
    systemctl restart postgresql
    
    print_status "PostgreSQL secured"
}

# Setup PM2 as non-root user
setup_pm2() {
    print_step "Setting up PM2 for $APP_USER..."
    
    # Install PM2 globally
    npm install -g pm2
    
    # Setup PM2 startup script for the app user
    sudo -u "$APP_USER" bash <<EOF
pm2 startup systemd -u $APP_USER --hp $PROJECT_PATH
EOF

    # Save PM2 configuration
    env PATH=$PATH:/usr/bin pm2 startup systemd -u "$APP_USER" --hp "$PROJECT_PATH"
    
    print_status "PM2 configured"
}

# Set proper file permissions
set_permissions() {
    print_step "Setting file permissions..."
    
    # Create project directory if it doesn't exist
    mkdir -p "$PROJECT_PATH"
    mkdir -p "$BACKEND_PATH"
    mkdir -p "$BACKEND_PATH/logs"
    
    # Set ownership
    chown -R "$APP_USER:$APP_GROUP" "$PROJECT_PATH"
    
    # Set directory permissions (755)
    find "$PROJECT_PATH" -type d -exec chmod 755 {} \;
    
    # Set file permissions (644)
    find "$PROJECT_PATH" -type f -exec chmod 644 {} \;
    
    # Make scripts executable
    find "$PROJECT_PATH" -type f -name "*.sh" -exec chmod 755 {} \;
    
    # Protect .env files (600 - owner read/write only)
    find "$BACKEND_PATH" -type f -name ".env*" -exec chmod 600 {} \;
    
    # Protect logs directory
    chmod 750 "$BACKEND_PATH/logs"
    
    print_status "File permissions set"
}

# Configure Apache security
configure_apache() {
    print_step "Configuring Apache security..."
    
    # Enable required modules
    a2enmod ssl
    a2enmod headers
    a2enmod rewrite
    a2enmod proxy
    a2enmod proxy_http
    a2enmod proxy_wstunnel
    
    # Disable server signature
    sed -i 's/ServerTokens OS/ServerTokens Prod/' /etc/apache2/conf-available/security.conf
    sed -i 's/ServerSignature On/ServerSignature Off/' /etc/apache2/conf-available/security.conf
    
    # Enable security configuration
    a2enconf security
    
    # Restart Apache
    systemctl restart apache2
    
    print_status "Apache security configured"
}

# Setup log rotation
setup_log_rotation() {
    print_step "Setting up log rotation..."
    
    cat > /etc/logrotate.d/matrix-delivery <<EOF
$BACKEND_PATH/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 $APP_USER $APP_GROUP
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
EOF

    print_status "Log rotation configured"
}

# Install Node.js security updates
setup_node_security() {
    print_step "Setting up Node.js security..."
    
    # Install npm-check-updates globally
    npm install -g npm-check-updates
    
    # Install snyk for vulnerability scanning
    npm install -g snyk
    
    print_status "Node.js security tools installed"
}

# Create security monitoring script
create_monitoring_script() {
    print_step "Creating security monitoring script..."
    
    cat > /usr/local/bin/matrix-security-check.sh <<'EOF'
#!/bin/bash

# Security monitoring script for Matrix Delivery
LOG_FILE="/var/log/matrix-security-check.log"

echo "=== Security Check $(date) ===" >> "$LOG_FILE"

# Check for failed login attempts
echo "Failed SSH attempts:" >> "$LOG_FILE"
grep "Failed password" /var/log/auth.log | tail -10 >> "$LOG_FILE"

# Check UFW status
echo "Firewall status:" >> "$LOG_FILE"
ufw status >> "$LOG_FILE"

# Check for suspicious processes
echo "Processes on port 5000:" >> "$LOG_FILE"
lsof -i :5000 >> "$LOG_FILE"

# Check disk usage
echo "Disk usage:" >> "$LOG_FILE"
df -h >> "$LOG_FILE"

# Check for updates
echo "Available updates:" >> "$LOG_FILE"
apt list --upgradable 2>/dev/null >> "$LOG_FILE"

echo "=== End Check ===" >> "$LOG_FILE"
EOF

    chmod +x /usr/local/bin/matrix-security-check.sh
    
    # Add to crontab (run daily at 2 AM)
    (crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/matrix-security-check.sh") | crontab -
    
    print_status "Security monitoring script created"
}

# Generate secure secrets
generate_secrets() {
    print_step "Generating secure secrets..."
    
    echo ""
    echo "=== SAVE THESE SECRETS SECURELY ==="
    echo ""
    echo "JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
    echo "JWT_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
    echo "ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
    echo ""
    echo "=== Add these to $BACKEND_PATH/.env.production ==="
    echo ""
    
    print_warning "Secrets generated - save them securely!"
}

# Main execution
main() {
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║  Matrix Delivery VPS Security Hardening Script            ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    
    check_root
    update_system
    install_dependencies
    create_app_user
    configure_firewall
    configure_fail2ban
    secure_postgresql
    setup_pm2
    set_permissions
    configure_apache
    setup_log_rotation
    setup_node_security
    create_monitoring_script
    generate_secrets
    
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║  Security Hardening Complete!                              ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    print_status "VPS is now hardened and ready for deployment"
    echo ""
    echo "Next steps:"
    echo "1. Update $BACKEND_PATH/.env.production with the generated secrets"
    echo "2. Deploy your application code"
    echo "3. Run: sudo -u $APP_USER pm2 start $BACKEND_PATH/ecosystem.config.js --env production"
    echo "4. Configure SSL certificate: certbot --apache -d matrix-api.oldantique50.com"
    echo ""
}

# Run main function
main "$@"
