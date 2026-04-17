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
    [ValidateSet('aws', 'gcp', 'both')]
    [string]$Server = 'both',
    
    [Parameter()]
    [switch]$SkipTests = $false
)

$ErrorActionPreference = 'Stop'

# AWS and GCP Configuration
$VPS_HOST_AWS = "api.et3am.com"
$VPS_HOST_GCP = "matrix-delivery-api-gc.mywire.org"
$VPS_PORT = "22"
$VPS_USER_AWS = "ubuntu"
$VPS_USER_GCP = "amr_lotfy_othman"
$VPS_PATH_AWS = "/home/ubuntu/matrix-delivery"
$VPS_PATH_GCP = "/home/amr_lotfy_othman/matrix-delivery"
$API_URL_AWS = "https://api.et3am.com"
$API_URL_GCP = "https://matrix-delivery-api-gc.mywire.org"

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

# Deploy backend to VPS (supports AWS and GCP)
function Deploy-BackendToServer {
    param(
        [string]$ServerName,
        [string]$VPS_HOST,
        [string]$VPS_USER,
        [string]$VPS_PATH,
        [string]$API_URL
    )
    
    Write-Step "Deploying backend to $ServerName ($VPS_HOST)..."
    
    try {
        # Pull latest code on VPS
        Write-Info "Pulling latest code from git..."
        ssh -o ConnectTimeout=30 -p $VPS_PORT "${VPS_USER}@${VPS_HOST}" "cd $VPS_PATH && git pull origin master 2>&1"
        Write-Success "Code pulled"
        
        # Install dependencies (include devDependencies for tsc)
        Write-Info "Installing dependencies..."
        ssh -o ConnectTimeout=30 -p $VPS_PORT "${VPS_USER}@${VPS_HOST}" "cd $VPS_PATH/backend && npm ci 2>&1"
        Write-Success "Dependencies installed"

        # Compile TypeScript
        Write-Info "Compiling Backend TypeScript..."
        ssh -o ConnectTimeout=30 -p $VPS_PORT "${VPS_USER}@${VPS_HOST}" "cd $VPS_PATH/backend && npx tsc --outDir . 2>&1"
        Write-Success "Backend compiled"
        
        # Reload PM2
        Write-Info "Reloading PM2 services..."
        ssh -o ConnectTimeout=30 -p $VPS_PORT "${VPS_USER}@${VPS_HOST}" "cd $VPS_PATH/backend && pm2 reload ecosystem.config.js --env production 2>&1"
        Write-Success "PM2 services reloaded"
        
        # Wait for services to start
        Write-Info "Waiting for services to start..."
        Start-Sleep -Seconds 10
        
        # Health check
        Write-Info "Running health check..."
        try {
            $response = Invoke-WebRequest -Uri "$API_URL/api/health" -UseBasicParsing -TimeoutSec 30
            if ($response.StatusCode -eq 200) {
                Write-Success "Backend health check passed for $ServerName"
                return $true
            }
            else {
                Write-Error-Custom "Backend health check failed for $ServerName (Status: $($response.StatusCode))"
                return $false
            }
        }
        catch {
            Write-Error-Custom "Backend health check failed for $ServerName: $_"
            return $false
        }
    }
    catch {
        Write-Error-Custom "Backend deployment to $ServerName failed: $_"
        return $false
    }
}

# Deploy backend to all configured servers
function Deploy-Backend {
    $deployAWS = ($Server -eq 'aws' -or $Server -eq 'both')
    $deployGCP = ($Server -eq 'gcp' -or $Server -eq 'both')
    $success = $true
    
    if ($deployAWS) {
        $success = $success -and (Deploy-BackendToServer -ServerName "AWS" -VPS_HOST $VPS_HOST_AWS -VPS_USER $VPS_USER_AWS -VPS_PATH $VPS_PATH_AWS -API_URL $API_URL_AWS)
    }
    
    if ($deployGCP) {
        $success = $success -and (Deploy-BackendToServer -ServerName "GCP" -VPS_HOST $VPS_HOST_GCP -VPS_USER $VPS_USER_GCP -VPS_PATH $VPS_PATH_GCP -API_URL $API_URL_GCP)
    }
    
    return $success
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
