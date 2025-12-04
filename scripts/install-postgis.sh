#!/bin/bash

##############################################################################
# Install PostGIS Extension on Production Database
# Enables spatial queries for distance-based filtering
#
# Usage: Run this on the VPS as root or postgres user
# bash install-postgis.sh
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
echo "  Install PostGIS Extension"
echo "========================================="
echo ""

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    print_error "This script must be run as root"
    exit 1
fi

# Step 1: Install PostGIS package
print_status "Installing PostGIS package..."
apt-get update
apt-get install -y postgresql-contrib postgis postgresql-15-postgis-3

if [ $? -ne 0 ]; then
    print_error "Failed to install PostGIS package"
    exit 1
fi

print_status "PostGIS package installed successfully"

# Step 2: Enable PostGIS extension in the database
print_status "Enabling PostGIS extension in database..."

# Get database credentials from environment file
DB_NAME="matrix_delivery"
DB_USER="postgres"

# Enable PostGIS extension
sudo -u postgres psql -d "$DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS postgis;"

if [ $? -ne 0 ]; then
    print_error "Failed to enable PostGIS extension"
    exit 1
fi

print_status "PostGIS extension enabled successfully"

# Step 3: Verify PostGIS installation
print_status "Verifying PostGIS installation..."

POSTGIS_VERSION=$(sudo -u postgres psql -d "$DB_NAME" -t -c "SELECT PostGIS_version();")

if [ -z "$POSTGIS_VERSION" ]; then
    print_error "PostGIS verification failed"
    exit 1
fi

print_status "PostGIS installed and verified"
echo ""
echo "PostGIS Version: $POSTGIS_VERSION"
echo ""

# Step 4: Test spatial query
print_status "Testing spatial query..."

TEST_QUERY="SELECT ST_Distance(
  ST_Point(0, 0)::geography,
  ST_Point(1, 1)::geography
) / 1000 as distance_km;"

DISTANCE=$(sudo -u postgres psql -d "$DB_NAME" -t -c "$TEST_QUERY")

if [ -z "$DISTANCE" ]; then
    print_error "Spatial query test failed"
    exit 1
fi

print_status "Spatial query test successful"
echo "Test distance: ${DISTANCE}km"
echo ""

print_status "PostGIS installation completed successfully!"
echo ""
echo "Next steps:"
echo "  1. Restart the backend: pm2 restart matrix-backend"
echo "  2. Check logs: pm2 logs matrix-backend | grep PostGIS"
echo "  3. Test driver order fetching"
echo ""
echo "The backend will now use PostGIS for faster distance calculations!"
