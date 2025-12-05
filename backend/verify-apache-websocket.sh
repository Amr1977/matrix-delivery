#!/bin/bash

# Configuration
HOST="matrix-api.oldantique50.com"
URL="https://$HOST/socket.io/?EIO=4&transport=websocket"

echo "Testing WebSocket connection to $URL..."
echo "Sending Upgrade headers..."

# Use curl to simulate a WebSocket handshake
# Expected response: "101 Switching Protocols"
OUTPUT=$(curl -i -N \
     -H "Connection: Upgrade" \
     -H "Upgrade: websocket" \
     -H "Host: $HOST" \
     -H "Origin: https://matrix-delivery.web.app" \
     -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
     -H "Sec-WebSocket-Version: 13" \
     "$URL" 2>&1)

if echo "$OUTPUT" | grep -q "101 Switching Protocols"; then
    echo ""
    echo "✅ SUCCESS: WebSocket Upgrade successful (101 Switching Protocols)"
    exit 0
elif echo "$OUTPUT" | grep -q "400 Bad Request"; then
    echo ""
    echo "❌ FAILURE: 400 Bad Request received."
    echo "   Use the config in apache_websocket_config.conf to fix your Apache proxy."
    exit 1
else
    echo ""
    echo "⚠️  UNKNOWN RESPONSE:"
    echo "$OUTPUT" | head -n 1
    exit 1
fi
