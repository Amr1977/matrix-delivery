#!/bin/bash

# DuckDNS Configuration
DOMAIN="mydelivery"  # Change this to your DuckDNS domain
TOKEN="your_token_here"  # Change this to your DuckDNS token

# Get current public IP
IP=$(curl -s https://api.ipify.org)

echo "[$(date '+%Y-%m-%d %H:%M:%S')] IP: $IP"

# Update DuckDNS
RESPONSE=$(curl -s "https://www.duckdns.org/update?domains=$DOMAIN&token=$TOKEN&ip=$IP")

if [[ $RESPONSE == "OK" ]]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ DDNS Updated Successfully"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ❌ DDNS Update Failed: $RESPONSE"
fi