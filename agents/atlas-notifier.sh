#!/bin/bash
source ~/agents/bot-tokens.env

send_atlas_message() {
  local msg="$1"
  curl -s -X POST "https://api.telegram.org/bot${ATLAS_BOT_TOKEN}/sendMessage" \
    -H 'Content-Type: application/json' \
    -d "{\"chat_id\": ${YOUR_CHAT_ID}, \"text\": \"🗺️ **[ATLAS]** $msg\", \"parse_mode\": \"Markdown\"}" > /dev/null
}

send_atlas_message "Vendor products API ready for final testing"
