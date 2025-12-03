#!/bin/bash
# Check and create database if needed

# Connect to PostgreSQL and check
sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw matrix_delivery_prod

if [ $? -eq 0 ]; then
    echo "✅ Database matrix_delivery_prod already exists"
else
    echo "Creating database matrix_delivery_prod..."
    sudo -u postgres psql -c "CREATE DATABASE matrix_delivery_prod;"
    sudo -u postgres psql -c "CREATE USER matrix_delivery_prod WITH PASSWORD 'TEMP_PASSWORD';"
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE matrix_delivery_prod TO matrix_delivery_prod;"
    echo "✅ Database created"
fi