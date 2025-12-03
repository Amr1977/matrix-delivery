#!/bin/bash

##############################################################################
# Android Keystore Generation Script
# Generates a secure keystore for APK signing
#
# Usage: bash generate-keystore.sh
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

KEYSTORE_DIR="$HOME/.android-keystores"
KEYSTORE_FILE="$KEYSTORE_DIR/matrix-delivery-release.jks"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  Android Keystore Generation                                ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if keytool is available
if ! command -v keytool &> /dev/null; then
    print_error "keytool not found. Please install Java JDK."
    exit 1
fi

# Create keystore directory
mkdir -p "$KEYSTORE_DIR"
chmod 700 "$KEYSTORE_DIR"

# Check if keystore already exists
if [ -f "$KEYSTORE_FILE" ]; then
    print_warning "Keystore already exists: $KEYSTORE_FILE"
    read -p "Do you want to overwrite it? (yes/NO) " -r
    echo
    if [[ ! $REPLY =~ ^yes$ ]]; then
        print_status "Aborted"
        exit 0
    fi
    rm -f "$KEYSTORE_FILE"
fi

# Generate keystore
print_status "Generating keystore..."
echo ""
print_warning "You will be prompted for keystore information."
print_warning "IMPORTANT: Save the passwords securely!"
echo ""

keytool -genkeypair \
    -v \
    -keystore "$KEYSTORE_FILE" \
    -alias matrix-delivery-key \
    -keyalg RSA \
    -keysize 4096 \
    -validity 10000 \
    -storetype JKS

print_status "Keystore generated successfully!"
echo ""

# Set proper permissions
chmod 600 "$KEYSTORE_FILE"

# Generate environment variables template
ENV_FILE="$KEYSTORE_DIR/keystore-env.sh"

cat > "$ENV_FILE" <<EOF
#!/bin/bash
# Matrix Delivery Keystore Environment Variables
# Source this file before building APK: source $ENV_FILE

export KEYSTORE_FILE="$KEYSTORE_FILE"
export KEY_ALIAS="matrix-delivery-key"
export KEYSTORE_PASSWORD="YOUR_KEYSTORE_PASSWORD"
export KEY_PASSWORD="YOUR_KEY_PASSWORD"

# Usage:
# 1. Update KEYSTORE_PASSWORD and KEY_PASSWORD above
# 2. Source this file: source $ENV_FILE
# 3. Build APK: bash scripts/build-apk.sh release
EOF

chmod 600 "$ENV_FILE"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  Keystore Created Successfully!                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
print_status "Keystore location: $KEYSTORE_FILE"
print_status "Environment template: $ENV_FILE"
echo ""
print_warning "CRITICAL: Backup your keystore securely!"
echo ""
echo "Next steps:"
echo "1. Edit $ENV_FILE and add your passwords"
echo "2. Backup keystore to secure location (password manager, encrypted drive)"
echo "3. Source environment: source $ENV_FILE"
echo "4. Build APK: bash scripts/build-apk.sh release"
echo ""
print_warning "If you lose this keystore, you cannot update your app!"
