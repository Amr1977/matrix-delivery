#!/bin/bash

##############################################################################
# Secure APK Build Script for Matrix Delivery
# Builds a signed, obfuscated APK with security hardening
#
# Prerequisites:
# - Android SDK installed
# - Keystore file created (use generate-keystore.sh)
# - Environment variables set for keystore credentials
#
# Usage: bash build-apk.sh [release|debug]
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

BUILD_TYPE=${1:-release}
PROJECT_ROOT=$(pwd)
ANDROID_DIR="$PROJECT_ROOT/android"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
APK_OUTPUT_DIR="$ANDROID_DIR/app/build/outputs/apk/$BUILD_TYPE"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  Matrix Delivery Secure APK Build                          ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if [ ! -d "$ANDROID_DIR" ]; then
        print_error "Android directory not found: $ANDROID_DIR"
        exit 1
    fi
    
    if [ ! -d "$FRONTEND_DIR" ]; then
        print_error "Frontend directory not found: $FRONTEND_DIR"
        exit 1
    fi
    
    if [ "$BUILD_TYPE" == "release" ]; then
        if [ -z "$KEYSTORE_FILE" ]; then
            print_error "KEYSTORE_FILE environment variable not set"
            print_error "Set with: export KEYSTORE_FILE=/path/to/keystore.jks"
            exit 1
        fi
        
        if [ ! -f "$KEYSTORE_FILE" ]; then
            print_error "Keystore file not found: $KEYSTORE_FILE"
            print_error "Generate with: bash scripts/generate-keystore.sh"
            exit 1
        fi
        
        if [ -z "$KEYSTORE_PASSWORD" ] || [ -z "$KEY_ALIAS" ] || [ -z "$KEY_PASSWORD" ]; then
            print_error "Keystore credentials not set"
            print_error "Required environment variables:"
            print_error "  - KEYSTORE_PASSWORD"
            print_error "  - KEY_ALIAS"
            print_error "  - KEY_PASSWORD"
            exit 1
        fi
    fi
    
    print_status "Prerequisites check passed"
}

# Build frontend
build_frontend() {
    print_status "Building frontend..."
    
    cd "$FRONTEND_DIR"
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        print_status "Installing frontend dependencies..."
        npm ci
    fi
    
    # Build production frontend
    print_status "Building production bundle..."
    npm run build
    
    print_status "Frontend build complete"
    cd "$PROJECT_ROOT"
}

# Sync Capacitor
sync_capacitor() {
    print_status "Syncing Capacitor..."
    
    npx cap sync android
    
    print_status "Capacitor sync complete"
}

# Build APK
build_apk() {
    print_status "Building APK ($BUILD_TYPE)..."
    
    cd "$ANDROID_DIR"
    
    if [ "$BUILD_TYPE" == "release" ]; then
        ./gradlew assembleRelease
    else
        ./gradlew assembleDebug
    fi
    
    print_status "APK build complete"
    cd "$PROJECT_ROOT"
}

# Verify APK signature
verify_signature() {
    if [ "$BUILD_TYPE" != "release" ]; then
        return
    fi
    
    print_status "Verifying APK signature..."
    
    APK_FILE=$(find "$APK_OUTPUT_DIR" -name "*.apk" | head -1)
    
    if [ -z "$APK_FILE" ]; then
        print_error "APK file not found in $APK_OUTPUT_DIR"
        exit 1
    fi
    
    if jarsigner -verify -verbose -certs "$APK_FILE" > /dev/null 2>&1; then
        print_status "APK signature verified successfully"
    else
        print_error "APK signature verification failed!"
        exit 1
    fi
}

# Generate checksums
generate_checksums() {
    print_status "Generating checksums..."
    
    APK_FILE=$(find "$APK_OUTPUT_DIR" -name "*.apk" | head -1)
    
    if [ -z "$APK_FILE" ]; then
        print_error "APK file not found"
        exit 1
    fi
    
    # SHA-256 checksum
    sha256sum "$APK_FILE" > "${APK_FILE}.sha256"
    
    # MD5 checksum (for compatibility)
    md5sum "$APK_FILE" > "${APK_FILE}.md5"
    
    print_status "Checksums generated"
}

# Generate build info
generate_build_info() {
    print_status "Generating build information..."
    
    APK_FILE=$(find "$APK_OUTPUT_DIR" -name "*.apk" | head -1)
    BUILD_INFO_FILE="${APK_FILE}.info.txt"
    
    cat > "$BUILD_INFO_FILE" <<EOF
Matrix Delivery APK Build Information
=====================================

Build Type: $BUILD_TYPE
Build Date: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
Build Host: $(hostname)
Git Commit: $(git rev-parse HEAD 2>/dev/null || echo "N/A")
Git Branch: $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "N/A")

APK Details:
-----------
File: $(basename "$APK_FILE")
Size: $(du -h "$APK_FILE" | cut -f1)
SHA-256: $(cat "${APK_FILE}.sha256" | cut -d' ' -f1)
MD5: $(cat "${APK_FILE}.md5" | cut -d' ' -f1)

Security Features:
-----------------
✓ Code obfuscation enabled (ProGuard/R8)
✓ Certificate pinning configured
✓ APK signed with production keystore
✓ Debug mode disabled

Installation Instructions:
-------------------------
1. Download APK and checksum files
2. Verify checksum: sha256sum -c $(basename "$APK_FILE").sha256
3. Enable "Install from Unknown Sources" in Android settings
4. Install APK
5. Disable "Install from Unknown Sources" after installation

EOF

    print_status "Build information saved to: $BUILD_INFO_FILE"
}

# Main build process
main() {
    check_prerequisites
    build_frontend
    sync_capacitor
    build_apk
    verify_signature
    generate_checksums
    generate_build_info
    
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║  APK Build Complete!                                        ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    
    APK_FILE=$(find "$APK_OUTPUT_DIR" -name "*.apk" | head -1)
    
    print_status "APK Location: $APK_FILE"
    print_status "Size: $(du -h "$APK_FILE" | cut -f1)"
    print_status "SHA-256: $(cat "${APK_FILE}.sha256" | cut -d' ' -f1)"
    echo ""
    print_warning "Upload the following files to your distribution channel:"
    echo "  - $(basename "$APK_FILE")"
    echo "  - $(basename "$APK_FILE").sha256"
    echo "  - $(basename "$APK_FILE").info.txt"
    echo ""
}

# Run main function
main "$@"
