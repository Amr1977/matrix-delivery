# Deploy Apache WebSocket Fix
# Run this script to upload and apply the fixed Apache configuration

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Deploying Apache WebSocket Fix" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Upload Apache config
Write-Host "[1/4] Uploading Apache configuration..." -ForegroundColor Yellow
scp scripts/apache-config-fixed.conf root@oldantique50.com:/etc/apache2/sites-available/matrix-api.oldantique50.com-le-ssl.conf

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to upload Apache config" -ForegroundColor Red
    exit 1
}
Write-Host "Apache config uploaded successfully" -ForegroundColor Green
Write-Host ""

# Enable required modules and reload Apache
Write-Host "[2/4] Enabling Apache modules..." -ForegroundColor Yellow
ssh root@oldantique50.com "sudo a2enmod proxy proxy_http proxy_wstunnel rewrite headers ssl"

Write-Host "[3/4] Testing Apache configuration..." -ForegroundColor Yellow
ssh root@oldantique50.com "sudo apache2ctl configtest"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Apache configuration test failed!" -ForegroundColor Red
    exit 1
}
Write-Host "Apache configuration is valid" -ForegroundColor Green
Write-Host ""

Write-Host "[4/4] Reloading Apache..." -ForegroundColor Yellow
ssh root@oldantique50.com "sudo systemctl reload apache2"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to reload Apache" -ForegroundColor Red
    exit 1
}
Write-Host "Apache reloaded successfully" -ForegroundColor Green
Write-Host ""

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Deployment Complete!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Refresh your browser at https://matrix-delivery.web.app"
Write-Host "  2. Open DevTools -> Console"
Write-Host "  3. WebSocket errors should be gone!"
Write-Host "  4. Check Network -> WS tab for successful connections"
Write-Host ""
