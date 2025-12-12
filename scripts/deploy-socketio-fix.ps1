# Socket.IO Apache Configuration Deployment Script
# This script deploys the updated Apache configuration for Socket.IO WebSocket support

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Socket.IO Apache Configuration Deployment       ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Configuration
$LOCAL_CONFIG = "d:/matrix-delivery/scripts/apache-config-fixed.conf"
$REMOTE_USER = "root"
$REMOTE_HOST = "oldantique50.com"
$REMOTE_CONFIG_PATH = "/etc/apache2/sites-available/matrix-api.oldantique50.com.conf"
$REMOTE_ENABLED_PATH = "/etc/apache2/sites-enabled/matrix-api.oldantique50.com.conf"

Write-Host "📋 Configuration:" -ForegroundColor Yellow
Write-Host "   Local file:  $LOCAL_CONFIG"
Write-Host "   Remote host: $REMOTE_HOST"
Write-Host "   Remote path: $REMOTE_CONFIG_PATH"
Write-Host ""

# Check if local config exists
if (-not (Test-Path $LOCAL_CONFIG)) {
    Write-Host "❌ Error: Local configuration file not found: $LOCAL_CONFIG" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Local configuration file found" -ForegroundColor Green
Write-Host ""

# Display what will be deployed
Write-Host "📄 Configuration preview (Socket.IO section):" -ForegroundColor Yellow
Get-Content $LOCAL_CONFIG | Select-String -Pattern "socket.io" -Context 2, 2
Write-Host ""

# Confirm deployment
$confirmation = Read-Host "Do you want to deploy this configuration? (yes/no)"
if ($confirmation -ne "yes") {
    Write-Host "❌ Deployment cancelled" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "🚀 Starting deployment..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Upload configuration
Write-Host "📤 Step 1/5: Uploading configuration to server..." -ForegroundColor Yellow
scp $LOCAL_CONFIG "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_CONFIG_PATH}"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to upload configuration" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Configuration uploaded successfully" -ForegroundColor Green
Write-Host ""

# Step 2: Verify Apache modules
Write-Host "🔍 Step 2/5: Verifying required Apache modules..." -ForegroundColor Yellow
$modules = @("proxy", "proxy_http", "proxy_wstunnel", "rewrite", "headers")

foreach ($module in $modules) {
    Write-Host "   Checking mod_$module..." -NoNewline
    ssh "${REMOTE_USER}@${REMOTE_HOST}" "a2query -m $module" 2>&1 | Out-Null
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host " ❌ Not enabled, enabling..." -ForegroundColor Yellow
        ssh "${REMOTE_USER}@${REMOTE_HOST}" "a2enmod $module"
    }
    else {
        Write-Host " ✅" -ForegroundColor Green
    }
}
Write-Host ""

# Step 3: Test configuration
Write-Host "🧪 Step 3/5: Testing Apache configuration..." -ForegroundColor Yellow
ssh "${REMOTE_USER}@${REMOTE_HOST}" "apache2ctl configtest"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Apache configuration test failed!" -ForegroundColor Red
    Write-Host "⚠️  Please check the configuration manually" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ Apache configuration test passed" -ForegroundColor Green
Write-Host ""

# Step 4: Enable site
Write-Host "🔗 Step 4/5: Ensuring site is enabled..." -ForegroundColor Yellow
ssh "${REMOTE_USER}@${REMOTE_HOST}" "a2ensite matrix-api.oldantique50.com.conf"
Write-Host "✅ Site enabled" -ForegroundColor Green
Write-Host ""

# Step 5: Reload Apache
Write-Host "🔄 Step 5/5: Reloading Apache..." -ForegroundColor Yellow
ssh "${REMOTE_USER}@${REMOTE_HOST}" "systemctl reload apache2"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to reload Apache" -ForegroundColor Red
    Write-Host "⚠️  Attempting restart instead..." -ForegroundColor Yellow
    ssh "${REMOTE_USER}@${REMOTE_HOST}" "systemctl restart apache2"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to restart Apache" -ForegroundColor Red
        exit 1
    }
}
Write-Host "✅ Apache reloaded successfully" -ForegroundColor Green
Write-Host ""

# Verify Apache is running
Write-Host "🔍 Verifying Apache status..." -ForegroundColor Yellow
ssh "${REMOTE_USER}@${REMOTE_HOST}" "systemctl is-active apache2"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Apache is not running!" -ForegroundColor Red
    ssh "${REMOTE_USER}@${REMOTE_HOST}" "systemctl status apache2"
    exit 1
}
Write-Host "✅ Apache is running" -ForegroundColor Green
Write-Host ""

# Display logs
Write-Host "📋 Recent Apache error logs:" -ForegroundColor Yellow
ssh "${REMOTE_USER}@${REMOTE_HOST}" "tail -n 20 /var/log/apache2/matrix-api-error.log"
Write-Host ""

Write-Host "╔════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║          ✅ Deployment Completed Successfully      ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "🧪 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Test Socket.IO connection: https://matrix-api.oldantique50.com/socket.io/" -ForegroundColor White
Write-Host "   2. Check browser console for Socket.IO connection logs" -ForegroundColor White
Write-Host "   3. Monitor Apache logs: ssh $REMOTE_USER@$REMOTE_HOST 'tail -f /var/log/apache2/matrix-api-error.log'" -ForegroundColor White
Write-Host ""
