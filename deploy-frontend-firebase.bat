@echo off
REM === Matrix Delivery Frontend Firebase Deploy Script ===
REM Build & deploy React frontend to Firebase Hosting

setlocal enabledelayedexpansion

set "FRONTEND_DIR=.\frontend"

echo 🚀 Starting Firebase frontend deployment...

REM Step 1: Go to frontend folder
cd "%FRONTEND_DIR%"

echo 📦 Installing dependencies...
call npm ci --silent
if errorlevel 1 (
    echo ❌ Failed to install dependencies
    cd ..
    exit /b 1
)

echo 🏗️ Building project...
call npm run build
if errorlevel 1 (
    echo ❌ Failed to build project
    cd ..
    exit /b 1
)

echo 🔥 Deploying to Firebase hosting...
call firebase deploy --only hosting
if errorlevel 1 (
    echo ❌ Failed to deploy to Firebase
    cd ..
    exit /b 1
)

echo ✅ Frontend deployed to Firebase successfully!
cd ..

endlocal
