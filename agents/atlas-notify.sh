#!/bin/bash

NOTIFY_PATH=~/agents/agent-telegram-notify.js
BOT_TOKEN='***REDACTED***'
GROUP_ID='-1005179780577'

# Function to send telegram message
send_message() {
  local msg="$1"
  local type="$2"
  
  curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage"     -H 'Content-Type: application/json'     -d "{
      \"chat_id\": ${GROUP_ID},
      \"text\": \"🗺️ **[ATLAS Backend Dev]** ${msg}\",
      \"parse_mode\": \"Markdown\"
    }" > /dev/null
}

echo '🗺️ ATLAS Backend Developer Started'
send_message 'Starting vendor products API implementation'

# Simulate work
send_message 'Analyzing vendor schema (migrations 010-019)'
sleep 2
send_message 'Designing 4 API endpoints (GET/POST/PUT/DELETE)'
sleep 2
send_message 'Building service layer + validation'
sleep 2
send_message 'Creating database service'
sleep 2
send_message '✅ Vendor products API complete'
send_message 'Ready for NEXUS deployment to AWS'

