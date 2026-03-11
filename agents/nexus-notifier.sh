#!/bin/bash
source ~/agents/bot-tokens.env

send_nexus_message() {
  local msg="$1"
  curl -s -X POST "https://api.telegram.org/bot${NEXUS_BOT_TOKEN}/sendMessage" \
    -H 'Content-Type: application/json' \
    -d "{\"chat_id\": ${YOUR_CHAT_ID}, \"text\": \"🔗 **[NEXUS]** $msg\", \"parse_mode\": \"Markdown\"}" > /dev/null
}

send_nexus_message "Production deployment complete - all systems operational"
