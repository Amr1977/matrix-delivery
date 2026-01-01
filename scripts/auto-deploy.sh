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
if [[ "$(basename "$PROJECT_DIR")" == "scripts" ]]; then
    cd ..
    PROJECT_DIR="$(pwd)"
    echo "Corrected Project Directory: $PROJECT_DIR"
fi

while true; do
    # Load Environment Variables (for FIREBASE_TOKEN)
    if [ -f .env ]; then
        export $(grep -v '^#' .env | xargs)
    fi

    # Fetch latest changes without merging
    git fetch origin $BRANCH > /dev/null 2>&1

    # Get commit hashes
    LOCAL=$(git rev-parse HEAD)
    REMOTE=$(git rev-parse origin/$BRANCH)

    if [ "$LOCAL" != "$REMOTE" ]; then
        echo "[$(date)] New changes detected ($REMOTE). Deploying..."

        # 1. Reset and Pull
        # WARNING: This discards local changes (needed because npm audit fix modifies lockfiles)
        git reset --hard HEAD
        git pull origin $BRANCH
        
        if [ $? -ne 0 ]; then
            echo "[$(date)] ❌ Git pull failed! Retrying next loop."
        else
            echo "[$(date)] ✅ Git pull successful."

            # ---------------------------
            # 2. Backend Deployment
            # ---------------------------
            echo "[$(date)] 🔧 Starting Backend Deployment..."
            cd backend || exit
            
            echo "[$(date)] Installing backend dependencies..."
            npm install
            
            echo "[$(date)] Running security audit (backend)..."
            npm audit fix

            if [ $? -ne 0 ]; then
                 echo "[$(date)] ⚠️ Backend npm issues. Proceeding carefully..."
            fi
            
            cd .. # Return to root

            # Reload Services (Zero Downtime)
            echo "[$(date)] Reloading backend via PM2..."
            pm2 reload all

            # ---------------------------
            # 3. Frontend Deployment
            # ---------------------------
            if [ -z "$FIREBASE_TOKEN" ]; then
                echo "[$(date)] ⚠️ skipping Frontend Deploy: FIREBASE_TOKEN not set in .env"
            else
                echo "[$(date)] 🎨 Starting Frontend Deployment..."
                cd frontend || exit

                echo "[$(date)] Installing frontend dependencies..."
                npm install
                
                echo "[$(date)] Running security audit (frontend)..."
                npm audit fix

                # Build Process (Custom for 1GB VPS)
                # We replicate 'npm run build:prod' steps but override memory limit
                echo "[$(date)] Building Frontend (Limit: 768MB)..."
                
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
                
                npm run build
                
                if [ $? -ne 0 ]; then
                    echo "[$(date)] ❌ Frontend Build Failed! Skipping deploy."
                else
                    echo "[$(date)] ✅ Build Successful. Deploying to Firebase..."
                    npx firebase-tools deploy --only hosting --token "$FIREBASE_TOKEN"
                    
                    if [ $? -eq 0 ]; then
                        echo "[$(date)] 🚀 Firebase Deployment Complete."
                    else
                        echo "[$(date)] ❌ Firebase Deployment Failed."
                    fi
                fi
                cd .. # Return to root
            fi
            
            echo "[$(date)] 🎉 Full Deployment Sequence Finished."
        fi
    else
        # No changes - silent or debug log
        # echo "[$(date)] No changes."
        :
    fi

    # Wait before next check
    sleep $CHECK_INTERVAL
done
