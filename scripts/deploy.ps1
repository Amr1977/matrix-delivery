#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Professional CI/CD deployment script with pre-deployment testing

.DESCRIPTION
    Automated deployment pipeline that:
    1. Runs linting
    2. Runs smoke tests
    3. Builds frontend
    4. Deploys backend to VPS
    5. Deploys frontend to Firebase
    6. Runs health checks

.PARAMETER Target
    Deployment target: 'backend', 'frontend', or 'all' (default)

.PARAMETER SkipTests
    Skip pre-deployment tests (not recommended for production)

.EXAMPLE
    .\scripts\deploy.ps1
    .\scripts\deploy.ps1 -Target backend
    .\scripts\deploy.ps1 -Target frontend -SkipTests
#>

param(
    [Parameter()]
    [ValidateSet('all', 'backend', 'frontend')]
    [string]$Target = 'all',
    
    [Parameter()]
    [switch]$SkipTests = $false
)

$ErrorActionPreference = 'Stop'

# Configuration
$VPS_HOST = "oldantique50.com"
$VPS_PORT = "2222"
$VPS_USER = "root"
$VPS_PATH = "/root/matrix-delivery"
$API_URL = "https://matrix-api.oldantique50.com"

# Colors
function Write-Header {
    param([string]$Message)
    Write-Host "`n╔$('═' * ($Message.Length + 2))╗" -ForegroundColor Cyan
    Write-Host "║ $Message ║" -ForegroundColor Cyan
    Write-Host "╚$('═' * ($Message.Length + 2))╝`n" -ForegroundColor Cyan
}

function Write-Step {
    param([string]$Message)
    Write-Host "`n▶ $Message" -ForegroundColor Yellow
}

function Write-Success {
    param([string]$Message)
    Write-Host "  ✅ $Message" -ForegroundColor Green
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "  ❌ $Message" -ForegroundColor Red
}

function Write-Info {
    param([string]$Message)
    Write-Host "  ℹ️  $Message" -ForegroundColor Gray
}

# Check if git is clean
function Test-GitClean {
    Write-Step "Checking git status..."
    
    $status = git status --porcelain
    if ($status) {
        Write-Error-Custom "Working directory is not clean. Commit or stash changes first."
        Write-Host "`nUncommitted changes:" -ForegroundColor Yellow
        git status --short
        return $false
    }
    
    Write-Success "Git working directory is clean"
    return $true
}

# Run linting
function Invoke-Lint {
    Write-Step "Running ESLint..."
    
    try {
        npm run lint
        Write-Success "Linting passed"
        return $true
    }
    catch {
        Write-Error-Custom "Linting failed"
        Write-Info "Fix linting errors with: npm run lint:fix"
        return $false
    }
}

# Run smoke tests
function Invoke-SmokeTests {
    Write-Step "Running smoke tests..."
    
    try {
        npm run test:smoke
        Write-Success "Smoke tests passed"
        return $true
    }
    catch {
        Write-Error-Custom "Smoke tests failed"
        return $false
    }
}

# Build frontend
function Build-Frontend {
    Write-Step "Building frontend..."
    
    try {
        cd frontend
        npm run build
        cd ..
        Write-Success "Frontend build completed"
        return $true
    }
    catch {
        Write-Error-Custom "Frontend build failed"
        cd ..
        return $false
    }
}

# Deploy backend to VPS
function Deploy-Backend {
    Write-Step "Deploying backend to VPS..."
    
    try {
        # Pull latest code on VPS
        Write-Info "Pulling latest code from git..."
        ssh -p $VPS_PORT "${VPS_USER}@${VPS_HOST}" "cd $VPS_PATH && git pull origin master"
        Write-Success "Code pulled"
        
        # Install dependencies
        Write-Info "Installing dependencies..."
        ssh -p $VPS_PORT "${VPS_USER}@${VPS_HOST}" "cd $VPS_PATH/backend && npm ci --production"
        Write-Success "Dependencies installed"
        
        # Reload PM2
        Write-Info "Reloading PM2 services..."
        ssh -p $VPS_PORT "${VPS_USER}@${VPS_HOST}" "cd $VPS_PATH/backend && pm2 reload ecosystem.config.js --env production"
        Write-Success "PM2 services reloaded"
        
        # Wait for services to start
        Write-Info "Waiting for services to start..."
        Start-Sleep -Seconds 10
        
        # Health check
        Write-Info "Running health check..."
        $response = Invoke-WebRequest -Uri "$API_URL/api/health" -UseBasicParsing -TimeoutSec 30
        if ($response.StatusCode -eq 200) {
            Write-Success "Backend health check passed"
            return $true
        }
        else {
            Write-Error-Custom "Backend health check failed (Status: $($response.StatusCode))"
            return $false
        }
    }
    catch {
        Write-Error-Custom "Backend deployment failed: $_"
        return $false
    }
}

# Deploy frontend to Firebase
function Deploy-Frontend {
    Write-Step "Deploying frontend to Firebase..."
    
    try {
        node scripts/deploy-firebase.js production
        Write-Success "Frontend deployed to Firebase"
        return $true
    }
    catch {
        Write-Error-Custom "Frontend deployment failed"
        return $false
    }
}

# Main deployment flow
function Start-Deployment {
    Write-Header "Matrix Delivery - Professional Deployment"
    
    Write-Host "Target: $Target" -ForegroundColor Cyan
    Write-Host "Skip Tests: $SkipTests`n" -ForegroundColor Cyan
    
    $deployBackend = ($Target -eq 'all' -or $Target -eq 'backend')
    $deployFrontend = ($Target -eq 'all' -or $Target -eq 'frontend')
    
    # Pre-deployment checks
    if (-not $SkipTests) {
        Write-Header "Pre-Deployment Checks"
        
        # Check git status
        if (-not (Test-GitClean)) {
            Write-Error-Custom "Deployment aborted"
            exit 1
        }
        
        # Run linting
        if (-not (Invoke-Lint)) {
            Write-Error-Custom "Deployment aborted due to linting errors"
            exit 1
        }
        
        # Run smoke tests
        if (-not (Invoke-SmokeTests)) {
            Write-Error-Custom "Deployment aborted due to failed smoke tests"
            exit 1
        }
        
        Write-Success "All pre-deployment checks passed"
    }
    else {
        Write-Host "`n⚠️  Skipping pre-deployment tests (not recommended)" -ForegroundColor Yellow
    }
    
    # Build frontend if deploying it
    if ($deployFrontend) {
        Write-Header "Building Frontend"
        
        if (-not (Build-Frontend)) {
            Write-Error-Custom "Deployment aborted due to build failure"
            exit 1
        }
    }
    
    # Deploy backend
    if ($deployBackend) {
        Write-Header "Deploying Backend"
        
        if (-not (Deploy-Backend)) {
            Write-Error-Custom "Backend deployment failed"
            exit 1
        }
    }
    
    # Deploy frontend
    if ($deployFrontend) {
        Write-Header "Deploying Frontend"
        
        if (-not (Deploy-Frontend)) {
            Write-Error-Custom "Frontend deployment failed"
            exit 1
        }
    }
    
    # Final summary
    Write-Header "Deployment Complete"
    
    if ($deployBackend) {
        Write-Success "Backend: $API_URL/api/health"
    }
    
    if ($deployFrontend) {
        Write-Success "Frontend: https://matrix-delivery.web.app"
    }
    
    Write-Host "`n🎉 Deployment successful!`n" -ForegroundColor Green
}

# Run deployment
try {
    Start-Deployment
}
catch {
    Write-Host "`n❌ Deployment failed: $_`n" -ForegroundColor Red
    exit 1
}
