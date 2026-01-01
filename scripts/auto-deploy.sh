#!/bin/bash

# Configuration
# Run this script from the project root or adjust PROJECT_DIR accordingly
PROJECT_DIR="$(pwd)"
BRANCH="master"
CHECK_INTERVAL=60 # Seconds

# Helper function for timestamped logs
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Helper function to execute commands with timestamped output
exec_cmd() {
    # Disable progress bars for cleaner logs (especially npm)
    export CI=true 
    "$@" 2>&1 | while IFS= read -r line; do
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] $line"
    done
    return ${PIPESTATUS[0]} # Return the exit status of the command
}

log "---------------------------------------------------"
log "Starting Auto-Deploy Service"
log "Monitoring branch: $BRANCH"
log "Project Directory: $PROJECT_DIR"
log "Check Interval: ${CHECK_INTERVAL}s"
log "---------------------------------------------------"

# Go to project root (assuming we are in scripts/ or run from root)
if [[ "$(basename "$PROJECT_DIR")" == "scripts" ]]; then
    cd ..
    PROJECT_DIR="$(pwd)"
    log "Corrected Project Directory: $PROJECT_DIR"
fi

while true; do
    # Load Environment Variables (for FIREBASE_TOKEN)
    if [ -f .env ]; then
        # Read .env line by line to handle edge cases better than xargs
        while IFS= read -r line || [ -n "$line" ]; do
            # Skip comments and empty lines
            if [[ "$line" =~ ^# ]] || [[ -z "$line" ]]; then continue; fi
            # Remove carriage return (CRLF support)
            line=$(echo "$line" | tr -d '\r')
            # Export the variable
            export "$line"
        done < .env
    fi

    # Debug: Check if Token is loaded (masked)
    if [ -n "$FIREBASE_TOKEN" ]; then
        log "🔑 FIREBASE_TOKEN found (starts with: ${FIREBASE_TOKEN:0:4}...)"
    else
        log "⚠️ FIREBASE_TOKEN is missing or empty"
    fi

    # Fetch latest changes without merging
    if ! git fetch origin $BRANCH > /dev/null 2>&1; then
        log "⚠️ Git fetch failed. Check network, remote URL, or credentials."
    fi

    # Get commit hashes
    LOCAL=$(git rev-parse HEAD)
    REMOTE=$(git rev-parse origin/$BRANCH)

    if [ "$LOCAL" != "$REMOTE" ]; then
        log "New changes detected ($REMOTE). Deploying..."

        # 1. Reset and Pull
        # WARNING: This discards local changes (needed because npm audit fix modifies lockfiles)
        log "Resetting and pulling changes..."
        git reset --hard HEAD
        git pull origin $BRANCH
        
        if [ $? -ne 0 ]; then
            log "❌ Git pull failed! Retrying next loop."
        else
            log "✅ Git pull successful."

            # ---------------------------
            # 2. Backend Deployment
            # ---------------------------
            log "🔧 Starting Backend Deployment..."
            cd backend || exit
            
            log "Installing backend dependencies..."
            exec_cmd npm install --no-progress
            
            log "Running security audit (backend)..."
            exec_cmd npm audit fix --force
            
            if [ $? -ne 0 ]; then
                 log "⚠️ Backend npm issues. Proceeding carefully..."
            fi
            
            cd .. # Return to root

            # Reload Services (Zero Downtime)
            log "Reloading backend via PM2..."
            exec_cmd pm2 reload all

            # ---------------------------
            # 3. Frontend Deployment
            # ---------------------------
            if [ -z "$FIREBASE_TOKEN" ]; then
                log "⚠️ skipping Frontend Deploy: FIREBASE_TOKEN not set in .env"
            else
                log "🎨 Starting Frontend Deployment..."
                cd frontend || exit

                log "Installing frontend dependencies..."
                exec_cmd npm install --no-progress
                
                log "Running security audit (frontend)..."
                exec_cmd npm audit fix --force

                # Build Process (Custom for 1GB VPS)
                # We replicate 'npm run build:prod' steps but override memory limit
                log "Building Frontend (Limit: 768MB)..."
                
                # Step A: Generate Git Info
                node scripts/generate-git-info.js
                
                # Step B: Setup Env
                if [ -f .env.production ]; then
                    cp .env.production .env
                fi

                # Step C: Build with Memory Limit
                # Using 768MB to be safe on 1GB VPS
                export NODE_OPTIONS="--max-old-space-size=768"
                export REACT_APP_ENV=production
                export DISABLE_ESLINT_PLUGIN=true
                
                exec_cmd npm run build
                
                if [ $? -ne 0 ]; then
                    log "❌ Frontend Build Failed! Skipping deploy."
                else
                    log "✅ Build Successful. Deploying to Firebase..."
                    exec_cmd npx firebase-tools deploy --only hosting --token "$FIREBASE_TOKEN"
                    
                    if [ $? -eq 0 ]; then
                        log "🚀 Firebase Deployment Complete."
                    else
                        log "❌ Firebase Deployment Failed."
                    fi
                fi
                cd .. # Return to root
            fi
            
            log "🎉 Full Deployment Sequence Finished."
        fi
    else
        # Heartbeat log (optional: uncomment to verify service is alive in logs)
        log "No changes ($LOCAL). Waiting..."
        :
    fi

    # Wait before next check
    sleep $CHECK_INTERVAL
done
