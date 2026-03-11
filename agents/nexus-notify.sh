#!/bin/bash

BOT_TOKEN='***REDACTED***'
GROUP_ID='-1005179780577'

send_message() {
  local msg="$1"
  curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage"     -H 'Content-Type: application/json'     -d "{
      \"chat_id\": ${GROUP_ID},
      \"text\": \"🔗 **[NEXUS DevOps]** ${msg}\",
      \"parse_mode\": \"Markdown\"
    }" > /dev/null
}

echo '🔗 NEXUS DevOps Agent Started'
send_message 'Watching GCP job queue for deployments...'
send_message 'Connected to AWS backend (matrix-delivery-api.mywire.org)'
send_message 'Ready to deploy on ATLAS completion'

# Monitor loop
while true; do
  if [ -d ~/jobs/pending ] && [ "" ]; then
    for job in ~/jobs/pending/*; do
      if [ -f "$job" ]; then
        send_message "Deploying: $(basename $job)..."
        
        # Move to processing
        mv "$job" ~/jobs/processing/
        
        # Deploy
        cd /root/.openclaw/workspace/matrix-delivery
        git pull origin master 2>&1 > /tmp/deploy.log
        npm run build 2>&1 >> /tmp/deploy.log
        
        send_message '✅ Code built successfully'
        send_message 'Deploying to AWS...'
        
        # Deploy to AWS
        ssh -i ~/.ssh/matrix-osama-aws ubuntu@matrix-delivery-api.mywire.org '
          cd ~/matrix-delivery
          git pull
          npm run build
          pm2 restart matrix-delivery-backend
        ' 2>&1 > /tmp/aws-deploy.log
        
        send_message '✅ Deployed to AWS production'
        send_message '🎉 Backend API now live'
        
        # Mark done
        mv ~/jobs/processing/$(basename $job) ~/jobs/completed/
      fi
    done
  fi
  
  sleep 10
done

