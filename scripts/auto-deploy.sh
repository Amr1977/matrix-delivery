#!/bin/bash

# Configuration
# Run this script from the project root or adjust PROJECT_DIR accordingly
PROJECT_DIR="$(pwd)"
BRANCH="master"
CHECK_INTERVAL=60 # Seconds

echo "---------------------------------------------------"
echo "Starting Auto-Deploy Service"
echo "Monitoring branch: $BRANCH"
echo "Project Directory: $PROJECT_DIR"
echo "Check Interval: ${CHECK_INTERVAL}s"
echo "---------------------------------------------------"

# Go to project root (assuming we are in scripts/ or run from root)
# If this script is in scripts/, we go up one level if PROJECT_DIR matches scripts
if [[ "$(basename "$PROJECT_DIR")" == "scripts" ]]; then
    cd ..
    PROJECT_DIR="$(pwd)"
    echo "Corrected Project Directory: $PROJECT_DIR"
fi

while true; do
    # Fetch latest changes without merging
    git fetch origin $BRANCH > /dev/null 2>&1

    # Get commit hashes
    LOCAL=$(git rev-parse HEAD)
    REMOTE=$(git rev-parse origin/$BRANCH)

    if [ "$LOCAL" != "$REMOTE" ]; then
        echo "[$(date)] New changes detected ($REMOTE). Deploying..."

        # Pull changes
        git pull origin $BRANCH
        if [ $? -ne 0 ]; then
            echo "[$(date)] ❌ Git pull failed! Retrying next loop."
        else
            echo "[$(date)] ✅ Git pull successful."

            # Backend Install (as requested: 'nim install' -> npm install)
            echo "[$(date)] Installing backend dependencies..."
            cd backend
            npm install
            if [ $? -ne 0 ]; then
                 echo "[$(date)] ⚠️ npm install failed/warned. Continuing..."
            fi
            cd .. # Return to root

            # Reload Services (Zero Downtime)
            echo "[$(date)] Reloading application via PM2..."
            pm2 reload all
            
            echo "[$(date)] 🚀 Deployment complete."
        fi
    else
        # No changes - silent or debug log
        # echo "[$(date)] No changes."
        :
    fi

    # Wait before next check
    sleep $CHECK_INTERVAL
done
