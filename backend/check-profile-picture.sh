#!/bin/bash

# Quick script to check if profile picture is in database

set -e

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "❌ Error: .env file not found!"
    exit 1
fi

DB_NAME="${DB_NAME:-matrix_delivery_prod}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

echo "Checking profile picture for user: 1765275398316iu6zpugb5"
echo ""

PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << EOF
SELECT 
  id,
  name,
  email,
  LENGTH(profile_picture_url) as picture_url_length,
  SUBSTRING(profile_picture_url, 1, 50) as picture_url_preview
FROM users 
WHERE id = '1765275398316iu6zpugb5';
EOF

echo ""
echo "If picture_url_length > 0, the image is saved in the database!"
