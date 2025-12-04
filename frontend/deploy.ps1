# Frontend Deployment Script for Firebase

$ErrorActionPreference = "Stop"

function Print-Status($message) {
    Write-Host "[✓] $message" -ForegroundColor Green
}

function Print-Error($message) {
    Write-Host "[✗] $message" -ForegroundColor Red
}

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Deploying Frontend to Firebase" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Install Dependencies
Write-Host "Step 1: Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) { Print-Error "Failed to install dependencies"; exit 1 }
Print-Status "Dependencies installed"

# 2. Build for Production
Write-Host "`nStep 2: Building for production..." -ForegroundColor Yellow
npm run build:prod
if ($LASTEXITCODE -ne 0) { Print-Error "Build failed"; exit 1 }
Print-Status "Build completed successfully"

# 3. Deploy to Firebase
Write-Host "`nStep 3: Deploying to Firebase Hosting..." -ForegroundColor Yellow
firebase deploy --only hosting
if ($LASTEXITCODE -ne 0) { Print-Error "Deployment failed"; exit 1 }

Write-Host "`n=========================================" -ForegroundColor Cyan
Print-Status "Deployment Complete!"
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Visit: https://matrix-delivery.web.app" -ForegroundColor Green

