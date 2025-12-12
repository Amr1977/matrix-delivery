# Socket.IO Apache Configuration Deployment Script
# This script deploys the updated Apache configuration for Socket.IO WebSocket support

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   Socket.IO Apache Configuration Deployment" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$LOCAL_CONFIG = "d:/matrix-delivery/scripts/apache-config-fixed.conf"
$REMOTE_USER = "root"
$REMOTE_HOST = "oldantique50.com"
$REMOTE_CONFIG_PATH = "/etc/apache2/sites-available/matrix-api.oldantique50.com.conf"
$REMOTE_ENABLED_PATH = "/etc/apache2/sites-enabled/matrix-api.oldantique50.com.conf"

Write-Host "[CONFIG] Configuration:" -ForegroundColor Yellow
Write-Host "   Local file:  $LOCAL_CONFIG"
Write-Host "   Remote host: $REMOTE_HOST"
Write-Host "   Remote path: $REMOTE_CONFIG_PATH"
Write-Host ""

# Check if local config exists
if (-not (Test-Path $LOCAL_CONFIG)) {
    Write-Host "[ERROR] Local configuration file not found: $LOCAL_CONFIG" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Local configuration file found" -ForegroundColor Green
Write-Host ""

# Display what will be deployed
Write-Host "[PREVIEW] Configuration preview (Socket.IO section):" -ForegroundColor Yellow
Get-Content $LOCAL_CONFIG | Select-String -Pattern "socket.io" -Context 2, 2
Write-Host ""

# Confirm deployment
$confirmation = Read-Host "Do you want to deploy this configuration? (yes/no)"
if ($confirmation -ne "yes") {
    Write-Host "[CANCELLED] Deployment cancelled" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "[DEPLOY] Starting deployment..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Upload configuration
Write-Host "[STEP 1/5] Uploading configuration to server..." -ForegroundColor Yellow
scp $LOCAL_CONFIG "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_CONFIG_PATH}"

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to upload configuration" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Configuration uploaded successfully" -ForegroundColor Green
Write-Host ""

# Step 2: Verify Apache modules
Write-Host "[STEP 2/5] Verifying required Apache modules..." -ForegroundColor Yellow
$modules = @("proxy", "proxy_http", "proxy_wstunnel", "rewrite", "headers")

foreach ($module in $modules) {
    Write-Host "   Checking mod_$module..." -NoNewline
    ssh "${REMOTE_USER}@${REMOTE_HOST}" "a2query -m $module" 2>&1 | Out-Null
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host " [ENABLING]" -ForegroundColor Yellow
        ssh "${REMOTE_USER}@${REMOTE_HOST}" "a2enmod $module"
    }
    else {
        Write-Host " [OK]" -ForegroundColor Green
    }
}
Write-Host ""

# Step 3: Test configuration
Write-Host "[STEP 3/5] Testing Apache configuration..." -ForegroundColor Yellow
ssh "${REMOTE_USER}@${REMOTE_HOST}" "apache2ctl configtest"

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Apache configuration test failed!" -ForegroundColor Red
    Write-Host "[WARNING] Please check the configuration manually" -ForegroundColor Yellow
    exit 1
}
Write-Host "[OK] Apache configuration test passed" -ForegroundColor Green
Write-Host ""

# Step 4: Enable site
Write-Host "[STEP 4/5] Ensuring site is enabled..." -ForegroundColor Yellow
ssh "${REMOTE_USER}@${REMOTE_HOST}" "a2ensite matrix-api.oldantique50.com.conf"
Write-Host "[OK] Site enabled" -ForegroundColor Green
Write-Host ""

# Step 5: Reload Apache
Write-Host "[STEP 5/5] Reloading Apache..." -ForegroundColor Yellow
ssh "${REMOTE_USER}@${REMOTE_HOST}" "systemctl reload apache2"

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to reload Apache" -ForegroundColor Red
    Write-Host "[WARNING] Attempting restart instead..." -ForegroundColor Yellow
    ssh "${REMOTE_USER}@${REMOTE_HOST}" "systemctl restart apache2"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Failed to restart Apache" -ForegroundColor Red
        exit 1
    }
}
Write-Host "[OK] Apache reloaded successfully" -ForegroundColor Green
Write-Host ""

# Verify Apache is running
Write-Host "[VERIFY] Checking Apache status..." -ForegroundColor Yellow
ssh "${REMOTE_USER}@${REMOTE_HOST}" "systemctl is-active apache2"

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Apache is not running!" -ForegroundColor Red
    ssh "${REMOTE_USER}@${REMOTE_HOST}" "systemctl status apache2"
    exit 1
}
Write-Host "[OK] Apache is running" -ForegroundColor Green
Write-Host ""

# Display logs
Write-Host "[LOGS] Recent Apache error logs:" -ForegroundColor Yellow
ssh "${REMOTE_USER}@${REMOTE_HOST}" "tail -n 20 /var/log/apache2/matrix-api-error.log"
Write-Host ""

Write-Host "========================================================" -ForegroundColor Green
Write-Host "   Deployment Completed Successfully!" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host ""
Write-Host "[NEXT STEPS]" -ForegroundColor Cyan
Write-Host "   1. Test Socket.IO: https://matrix-api.oldantique50.com/socket.io/" -ForegroundColor White
Write-Host "   2. Check browser console for Socket.IO connection logs" -ForegroundColor White
Write-Host "   3. Monitor logs: ssh $REMOTE_USER@$REMOTE_HOST 'tail -f /var/log/apache2/matrix-api-error.log'" -ForegroundColor White
Write-Host ""
