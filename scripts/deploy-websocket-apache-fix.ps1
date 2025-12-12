#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Deploy Apache WebSocket fix to production VPS

.DESCRIPTION
    Enables mod_proxy_wstunnel and updates Apache config via SSH commands
#>

$ErrorActionPreference = 'Stop'

$VPS_HOST = "oldantique50.com"
$VPS_PORT = "2222"
$VPS_USER = "root"
$CONFIG_FILE = "matrix-api.oldantique50.com-le-ssl.conf"

Write-Host "`n╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Deploying WebSocket Fix to Apache    ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Read local config file
$localConfig = Get-Content $CONFIG_FILE -Raw

# Step 1: Enable mod_proxy_wstunnel
Write-Host "▶ Enabling mod_proxy_wstunnel module..." -ForegroundColor Yellow
ssh -p $VPS_PORT "${VPS_USER}@${VPS_HOST}" "a2enmod proxy_wstunnel 2>&1"
Write-Host "  ✅ Module enabled`n" -ForegroundColor Green

# Step 2: Backup current config
Write-Host "▶ Backing up current Apache config..." -ForegroundColor Yellow
ssh -p $VPS_PORT "${VPS_USER}@${VPS_HOST}" @"
cp /etc/apache2/sites-available/$CONFIG_FILE /etc/apache2/sites-available/${CONFIG_FILE}.backup.`$(date +%Y%m%d_%H%M%S)
"@
Write-Host "  ✅ Backup created`n" -ForegroundColor Green

# Step 3: Upload new config via cat and heredoc
Write-Host "▶ Updating Apache config..." -ForegroundColor Yellow
$escapedConfig = $localConfig -replace '"', '\"' -replace '`', '\`' -replace '\$', '\$'
ssh -p $VPS_PORT "${VPS_USER}@${VPS_HOST}" @"
cat > /etc/apache2/sites-available/$CONFIG_FILE << 'APACHE_CONFIG_EOF'
$localConfig
APACHE_CONFIG_EOF
"@
Write-Host "  ✅ Config updated`n" -ForegroundColor Green

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
    ssh -p $VPS_PORT "${VPS_USER}@${VPS_HOST}" @"
    cp /etc/apache2/sites-available/${CONFIG_FILE}.backup.* /etc/apache2/sites-available/$CONFIG_FILE
"@
    Write-Host "Backup restored. Please check errors above." -ForegroundColor Red
    exit 1
}

# Step 5: Reload Apache
Write-Host "▶ Reloading Apache..." -ForegroundColor Yellow
ssh -p $VPS_PORT "${VPS_USER}@${VPS_HOST}" "systemctl reload apache2"
Write-Host "  ✅ Apache reloaded`n" -ForegroundColor Green

# Step 6: Verify modules
Write-Host "▶ Verifying enabled modules..." -ForegroundColor Yellow
$modules = ssh -p $VPS_PORT "${VPS_USER}@${VPS_HOST}" "apache2ctl -M 2>&1 | grep -E 'proxy|rewrite'"
Write-Host $modules
Write-Host ""

# Step 7: Check Apache status
Write-Host "▶ Checking Apache status..." -ForegroundColor Yellow
$status = ssh -p $VPS_PORT "${VPS_USER}@${VPS_HOST}" "systemctl is-active apache2"
if ($status -eq "active") {
    Write-Host "  ✅ Apache is running`n" -ForegroundColor Green
}
else {
    Write-Host "  ❌ Apache is not running!" -ForegroundColor Red
    exit 1
}

Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  WebSocket Fix Deployed Successfully!  ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════╝`n" -ForegroundColor Green

Write-Host "✅ Next steps:" -ForegroundColor Cyan
Write-Host "   1. Test WebSocket connection: https://matrix-delivery.web.app" -ForegroundColor Gray
Write-Host "   2. Check devtools console - WebSocket 400 error should be gone" -ForegroundColor Gray
Write-Host "   3. Verify Socket.IO upgrades to WebSocket (check Network tab)`n" -ForegroundColor Gray
