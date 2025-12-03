#!/bin/bash

##############################################################################
# Secret Rotation Script for Matrix Delivery
# Generates new secrets and updates environment files
#
# Usage: bash rotate-secrets.sh [environment]
# Example: bash rotate-secrets.sh production
##############################################################################

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() { echo -e "${GREEN}[✓]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[!]${NC} $1"; }
print_error() { echo -e "${RED}[✗]${NC} $1"; }

ENVIRONMENT=${1:-production}
ENV_FILE="backend/.env.$ENVIRONMENT"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  Matrix Delivery Secret Rotation                           ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    print_error "Node.js is required but not installed"
    exit 1
fi

# Generate new secrets
print_status "Generating new cryptographically secure secrets..."
echo ""

JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# Generate strong database password
DB_PASSWORD=$(node -e "const crypto = require('crypto'); const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'; let password = ''; for(let i=0; i<24; i++) { password += chars[crypto.randomInt(0, chars.length)]; } console.log(password);")

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  NEW SECRETS - SAVE THESE SECURELY                         ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "JWT_SECRET=$JWT_SECRET"
echo "JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET"
echo "ENCRYPTION_KEY=$ENCRYPTION_KEY"
echo "DB_PASSWORD=$DB_PASSWORD"
echo ""

# Save to file
SECRETS_FILE="secrets_${ENVIRONMENT}_$(date +%Y%m%d_%H%M%S).txt"
cat > "$SECRETS_FILE" <<EOF
# Matrix Delivery Secrets - $ENVIRONMENT
# Generated: $(date)
# KEEP THIS FILE SECURE - DO NOT COMMIT TO GIT

JWT_SECRET=$JWT_SECRET
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET
ENCRYPTION_KEY=$ENCRYPTION_KEY
DB_PASSWORD=$DB_PASSWORD

# Instructions:
# 1. Update $ENV_FILE with these values
# 2. Update database password: ALTER USER matrix_delivery_prod PASSWORD '$DB_PASSWORD';
# 3. Restart backend service: pm2 restart ecosystem.config.js --env $ENVIRONMENT
# 4. Store this file in a secure password manager
# 5. Delete this file after updating: shred -u $SECRETS_FILE
EOF

print_status "Secrets saved to: $SECRETS_FILE"
echo ""

# Offer to update .env file
read -p "Do you want to update $ENV_FILE automatically? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if [ -f "$ENV_FILE" ]; then
        # Backup existing file
        BACKUP_FILE="${ENV_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
        cp "$ENV_FILE" "$BACKUP_FILE"
        print_status "Backed up $ENV_FILE to $BACKUP_FILE"
        
        # Update secrets in .env file
        sed -i.bak "s/^JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" "$ENV_FILE"
        sed -i.bak "s/^JWT_REFRESH_SECRET=.*/JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET/" "$ENV_FILE"
        sed -i.bak "s/^ENCRYPTION_KEY=.*/ENCRYPTION_KEY=$ENCRYPTION_KEY/" "$ENV_FILE"
        sed -i.bak "s/^DB_PASSWORD=.*/DB_PASSWORD=$DB_PASSWORD/" "$ENV_FILE"
        
        # Remove backup file created by sed
        rm -f "${ENV_FILE}.bak"
        
        print_status "$ENV_FILE updated with new secrets"
    else
        print_error "$ENV_FILE not found"
    fi
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  NEXT STEPS                                                ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "1. Update database password:"
echo "   sudo -u postgres psql -d matrix_delivery_prod -c \"ALTER USER matrix_delivery_prod PASSWORD '$DB_PASSWORD';\""
echo ""
echo "2. If on VPS, sync .env file:"
echo "   scp $ENV_FILE root@matrix-api.oldantique50.com:/var/www/matrix-delivery/backend/.env"
echo ""
echo "3. Restart backend service:"
echo "   ssh root@matrix-api.oldantique50.com 'pm2 restart ecosystem.config.js --env $ENVIRONMENT'"
echo ""
echo "4. Verify health endpoint:"
echo "   curl https://matrix-api.oldantique50.com/api/health"
echo ""
echo "5. Securely store $SECRETS_FILE then delete it:"
echo "   shred -u $SECRETS_FILE"
echo ""

print_warning "IMPORTANT: All existing JWT tokens will be invalidated. Users will need to log in again."
