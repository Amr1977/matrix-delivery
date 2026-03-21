#!/bin/bash
set -Eeuo pipefail

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
    # Check both root .env and backend/.env
    if [ -f backend/.env ]; then
        log "ðŸ“„ Loading env from backend/.env"
        ENV_FILE="backend/.env"
    elif [ -f .env ]; then
        log "ðŸ“„ Loading env from .env"
        ENV_FILE=".env"
    else
        log "âš ï¸ No .env file found"
        ENV_FILE=""
    fi
    
    if [ -n "$ENV_FILE" ]; then
        while IFS= read -r line || [ -n "$line" ]; do
            # Skip comments and empty lines
            if [[ "$line" =~ ^# ]] || [[ -z "$line" ]]; then continue; fi
            # Remove carriage return (CRLF support)
            line=$(echo "$line" | tr -d '\r')
            # Export the variable
            export "$line"
        done < "$ENV_FILE"
    fi

    # Debug: Check if Token is loaded (masked)
    if [ -n "$FIREBASE_TOKEN" ]; then
        log "ðŸ”‘ FIREBASE_TOKEN found (starts with: ${FIREBASE_TOKEN:0:4}...)"
    else
        log "âš ï¸ FIREBASE_TOKEN is missing or empty"
    fi

    # Capture current script hash for self-update check
    INITIAL_SCRIPT_HASH=$(git hash-object scripts/auto-deploy.sh)

    # Fetch latest changes without merging
    if ! git fetch origin $BRANCH > /dev/null 2>&1; then
        log "âš ï¸ Git fetch failed. Check network, remote URL, or credentials."
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
            log "âŒ Git pull failed! Retrying next loop."
        else
            log "âœ… Git pull successful."

            # ---------------------------
            # 2. Backend Deployment
            # ---------------------------
            log "ðŸ”§ Starting Backend Deployment..."
            cd backend || exit
            
            log "Installing backend dependencies..."
            exec_cmd npm install --no-progress
            
            log "Running security audit (backend)..."
            exec_cmd npm audit fix --force
            
            if [ $? -ne 0 ]; then
                 log "âš ï¸ Backend npm issues. Proceeding carefully..."
            fi
            
            log "Compiling Backend TypeScript..."
            # Force output to current directory to ensure node server.js picks up changes
            # (Overrides tsconfig.json outDir: ./dist)
            exec_cmd npx tsc --outDir .
            
            cd .. # Return to root

            # Reload Services (Zero Downtime)
            log "Reloading backend via PM2..."
            # CRITICAL: Do NOT run 'pm2 reload all' if this script is managed by PM2!
            # It will kill itself. Reload specific app only.
            exec_cmd pm2 reload matrix-delivery-backend || exec_cmd pm2 reload all

            # ---------------------------
            # 3. Frontend Deployment (DISABLED - deploy manually)
            # ---------------------------
            log "⚠️ Frontend deployment disabled - deploy manually from local machine"
            
            log "🎉 Backend Deployment Finished."
            
            # Check for self-update
            # We use git hash-object to compare the script file on disk vs what it was before validation
            # Note: We are in root here
            NEW_SCRIPT_HASH=$(git hash-object scripts/auto-deploy.sh)
            
            if [ "$INITIAL_SCRIPT_HASH" != "$NEW_SCRIPT_HASH" ]; then
                log "ðŸ”„ Auto-deploy script updated. Exiting to allow PM2 to restart..."
                exit 0
            fi
        fi
    else
        # Heartbeat with system health stats
        MEM_TOTAL=$(free -m | awk '/Mem:/ {print $2}')
        MEM_USED=$(free -m | awk '/Mem:/ {print $3}')
        MEM_PCT=$(free -m | awk '/Mem:/ {printf "%.0f", $3/$2*100}')
        MEM_FREE=$(free -m | awk '/Mem:/ {print $7}')  # Available memory
        
        # Get status of all PM2 processes (format: "name:status" for each)
        PM2_INFO=$(pm2 jlist 2>/dev/null | jq -r '.[] | "\(.name):\(.pm2_env.status)"' 2>/dev/null | tr '\n' ' ' || echo "unknown")
        # Get total memory of all PM2 processes
        PM2_MEM_TOTAL=$(pm2 jlist 2>/dev/null | jq -r '[.[].monit.memory // 0] | add' 2>/dev/null | awk '{printf "%.0f", $1/1024/1024}')
        
        UPTIME_STR=$(uptime -p 2>/dev/null | sed 's/up //' || echo "N/A")
        
        log "â³ No changes | Mem: ${MEM_PCT}% (${MEM_FREE}MB avail) | PM2: ${PM2_INFO}(${PM2_MEM_TOTAL}MB total) | Up: ${UPTIME_STR}"
    fi

    # Wait before next check
    sleep $CHECK_INTERVAL
done



