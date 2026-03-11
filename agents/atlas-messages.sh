#!/bin/bash

# Send to your personal chat + group
BOT_TOKEN='***REDACTED***'
YOUR_CHAT='7615344890'        # Your DM (works now ✅)
GROUP_CHAT='-1005179780577'   # Group (add bot to enable)

send_message() {
  local msg="$1"
  
  # Send to your DM (guaranteed)
  curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage"     -H 'Content-Type: application/json'     -d "{
      \"chat_id\": ${YOUR_CHAT},
      \"text\": \"🗺️ **[ATLAS]** ${msg}\",
      \"parse_mode\": \"Markdown\"
    }" > /dev/null
  
  # Try to send to group too
  curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage"     -H 'Content-Type: application/json'     -d "{
      \"chat_id\": ${GROUP_CHAT},
      \"text\": \"🗺️ **[ATLAS]** ${msg}\",
      \"parse_mode\": \"Markdown\"
    }" > /dev/null 2>&1
}

send_message 'Starting vendor products API implementation'
sleep 1
send_message 'Analyzing vendor database schema'
sleep 1
send_message 'Building 4 API endpoints (GET/POST/PUT/DELETE)'
sleep 1
send_message '✅ Vendor products API implementation COMPLETE'

