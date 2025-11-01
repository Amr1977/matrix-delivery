#!/bin/bash
# Matrix Delivery - Start PageKite Tunnel

echo "🚀 Starting PageKite tunnel for backend at matrix-api.pagekite.me"
echo "Your Firebase frontend will connect to: https://matrix-api.pagekite.me/api"
echo ""

# Start the SSH tunnel (PageKite alternative)
ssh -R matrix-api:80:localhost:5000 pagekite.net
