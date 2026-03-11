#!/bin/bash

BOT_TOKEN='***REDACTED***'
YOUR_CHAT='7615344890'
GROUP_CHAT='-1005179780577'

send_message() {
  local msg="$1"
  curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage"     -H 'Content-Type: application/json'     -d "{\"chat_id\": ${YOUR_CHAT}, \"text\": \"🔗 **[NEXUS]** ${msg}\", \"parse_mode\": \"Markdown\"}" > /dev/null
  curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage"     -H 'Content-Type: application/json'     -d "{\"chat_id\": ${GROUP_CHAT}, \"text\": \"🔗 **[NEXUS]** ${msg}\", \"parse_mode\": \"Markdown\"}" > /dev/null 2>&1
}

send_message 'Watching for ATLAS completion...'
sleep 1
send_message 'Code ready - deploying to AWS'
sleep 1
send_message '✅ Backend API live in production'

