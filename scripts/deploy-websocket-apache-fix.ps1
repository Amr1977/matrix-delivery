#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Deploy Apache WebSocket fix to production VPS

.DESCRIPTION
    Enables mod_proxy_wstunnel, uploads fixed Apache config, and restarts Apache
#>

$ErrorActionPreference = 'Stop'

$VPS_HOST = "oldantique50.com"
$VPS_PORT = "2222"
$VPS_USER = "root"
$CONFIG_FILE = "matrix-api.oldantique50.com-le-ssl.conf"
$REMOTE_CONFIG = "/etc/apache2/sites-available/$CONFIG_FILE"

Write-Host "`n╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Deploying WebSocket Fix to Apache    ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Step 1: Enable mod_proxy_wstunnel
Write-Host "▶ Enabling mod_proxy_wstunnel module..." -ForegroundColor Yellow
ssh -p $VPS_PORT "${VPS_USER}@${VPS_HOST}" "a2enmod proxy_wstunnel"
Write-Host "  ✅ Module enabled`n" -ForegroundColor Green

# Step 2: Backup current config
Write-Host "▶ Backing up current Apache config..." -ForegroundColor Yellow
ssh -p $VPS_PORT "${VPS_USER}@${VPS_HOST}" "cp $REMOTE_CONFIG ${REMOTE_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"
Write-Host "  ✅ Backup created`n" -ForegroundColor Green

# Step 3: Upload new config
Write-Host "▶ Uploading fixed Apache config..." -ForegroundColor Yellow
scp -P $VPS_PORT $CONFIG_FILE "${VPS_USER}@${VPS_HOST}:$REMOTE_CONFIG"
Write-Host "  ✅ Config uploaded`n" -ForegroundColor Green

# Step 4: Test Apache config
Write-Host "▶ Testing Apache configuration..." -ForegroundColor Yellow
$testResult = ssh -p $VPS_PORT "${VPS_USER}@${VPS_HOST}" "apache2ctl configtest 2>&1"
Write-Host $testResult

if ($testResult -like "*Syntax OK*") {
    Write-Host "  ✅ Apache config is valid`n" -ForegroundColor Green
}
else {
    Write-Host "  ❌ Apache config has errors!" -ForegroundColor Red
    Write-Host "`nRestoring backup..." -ForegroundColor Yellow
    ssh -p $VPS_PORT "${VPS_USER}@${VPS_HOST}" "cp ${REMOTE_CONFIG}.backup.* $REMOTE_CONFIG"
    Write-Host "Backup restored. Please fix errors and try again." -ForegroundColor Red
    exit 1
}

# Step 5: Reload Apache
Write-Host "▶ Reloading Apache..." -ForegroundColor Yellow
ssh -p $VPS_PORT "${VPS_USER}@${VPS_HOST}" "systemctl reload apache2"
Write-Host "  ✅ Apache reloaded`n" -ForegroundColor Green

# Step 6: Verify modules
Write-Host "▶ Verifying enabled modules..." -ForegroundColor Yellow
$modules = ssh -p $VPS_PORT "${VPS_USER}@${VPS_HOST}" "apache2ctl -M | grep -E 'proxy|websocket|rewrite'"
Write-Host $modules
Write-Host ""

# Step 7: Check Apache status
Write-Host "▶ Checking Apache status..." -ForegroundColor Yellow
$status = ssh -p $VPS_PORT "${VPS_USER}@${VPS_HOST}" "systemctl status apache2 | head -n 10"
Write-Host $status
Write-Host ""

Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  WebSocket Fix Deployed Successfully!  ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════╝`n" -ForegroundColor Green

Write-Host "✅ Next steps:" -ForegroundColor Cyan
Write-Host "   1. Test WebSocket connection in browser" -ForegroundColor Gray
Write-Host "   2. Check devtools console for WebSocket errors" -ForegroundColor Gray
Write-Host "   3. Verify Socket.IO upgrades to WebSocket`n" -ForegroundColor Gray
