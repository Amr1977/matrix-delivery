#!/bin/bash
# Database Check and Creation Script
# Run this from any directory - it doesn't need to be in /root/matrix-delivery

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  Database Check for matrix_delivery_prod                   ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if database exists
echo "Checking if database exists..."
DB_EXISTS=$(sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -w matrix_delivery_prod | wc -l)

if [ "$DB_EXISTS" -eq "1" ]; then
    echo "✅ Database 'matrix_delivery_prod' already exists"
    echo ""
    echo "Checking if user 'matrix_delivery_prod' exists..."
    USER_EXISTS=$(sudo -u postgres psql -t -c "SELECT 1 FROM pg_roles WHERE rolname='matrix_delivery_prod'" | grep -c 1)
    
    if [ "$USER_EXISTS" -eq "1" ]; then
        echo "✅ User 'matrix_delivery_prod' already exists"
    else
        echo "❌ User 'matrix_delivery_prod' does NOT exist"
        echo "Creating user..."
        sudo -u postgres psql -c "CREATE USER matrix_delivery_prod WITH PASSWORD 'TEMP_PASSWORD';"
        sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE matrix_delivery_prod TO matrix_delivery_prod;"
        echo "✅ User created with TEMP_PASSWORD"
        echo "⚠️  IMPORTANT: Change the password immediately!"
    fi
else
    echo "❌ Database 'matrix_delivery_prod' does NOT exist"
    echo ""
    echo "Creating database and user..."
    sudo -u postgres psql -c "CREATE DATABASE matrix_delivery_prod;"
    sudo -u postgres psql -c "CREATE USER matrix_delivery_prod WITH PASSWORD 'TEMP_PASSWORD';"
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE matrix_delivery_prod TO matrix_delivery_prod;"
    sudo -u postgres psql -c "ALTER DATABASE matrix_delivery_prod OWNER TO matrix_delivery_prod;"
    echo "✅ Database and user created"
    echo "⚠️  IMPORTANT: Change the password with:"
    echo "   sudo -u postgres psql -c \"ALTER USER matrix_delivery_prod PASSWORD 'YOUR_STRONG_PASSWORD';\""
fi

echo ""
echo "Current databases:"
sudo -u postgres psql -l | grep matrix_delivery

echo ""
echo "✅ Database check complete!"
