#!/bin/bash
echo '🔗 NEXUS DevOps Agent Started'
echo 'Task: Production Deployment & Monitoring'

# Monitor GCP job queue
echo '✅ Watching job queue for deployments...'

while true; do
  # Check for pending jobs
  if [ -d ~/jobs/pending ]; then
    for job in ~/jobs/pending/*; do
      if [ -f "$job" ]; then
        echo "Processing job: $(basename $job)"
        
        # Move to processing
        mv "$job" ~/jobs/processing/
        
        # Execute deployment
        cd /root/.openclaw/workspace/matrix-delivery
        git pull origin master 2>&1
        npm run build 2>&1
        
        # Notify AWS to deploy
        ssh -i ~/.ssh/matrix-osama-aws ubuntu@matrix-delivery-api.mywire.org '
          cd ~/matrix-delivery
          git pull
          npm run build
          pm2 restart matrix-delivery-backend
        ' 2>&1
        
        # Mark as completed
        mv ~/jobs/processing/$(basename $job) ~/jobs/completed/
        echo '✅ Deployment completed'
      fi
    done
  fi
  
  sleep 30
done
