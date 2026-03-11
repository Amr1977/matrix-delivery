#!/bin/bash
source ~/agents/bot-tokens.env

send_osama_message() {
  local msg="$1"
  curl -s -X POST "https://api.telegram.org/bot${OSAMA_BOT_TOKEN}/sendMessage" \
    -H 'Content-Type: application/json' \
    -d "{\"chat_id\": ${YOUR_CHAT_ID}, \"text\": \"🦅 **[OSAMA]** $msg\", \"parse_mode\": \"Markdown\"}" > /dev/null
}

send_osama_message "Distributed team fully operational - 7 independent communication channels active"
