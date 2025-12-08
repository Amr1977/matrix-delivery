# Simple direct fix for test files
Write-Host "🔧 Fixing test files..." -ForegroundColor Cyan

# Fix paypal.test.js - change 'posted' to 'pending_bids'
$file = "d:\matrix-delivery\backend\tests\paypal.test.js"
$content = Get-Content $file -Raw
$content = $content.Replace("'posted'", "'pending_bids'")
$content = $content.Replace("{ expiresIn: '1h' }", "{ algorithm: 'HS256', issuer: 'matrix-delivery', audience: 'matrix-delivery-api', expiresIn: '1h' }")
Set-Content $file -Value $content -NoNewline
Write-Host "✅ Fixed paypal.test.js" -ForegroundColor Green

# Fix messaging.test.js
$file = "d:\matrix-delivery\backend\tests\messaging.test.js"
$content = Get-Content $file -Raw
$content = $content.Replace("{ expiresIn: '1h' }", "{ algorithm: 'HS256', issuer: 'matrix-delivery', audience: 'matrix-delivery-api', expiresIn: '1h' }")
Set-Content $file -Value $content -NoNewline
Write-Host "✅ Fixed messaging.test.js" -ForegroundColor Green

Write-Host "`n✅ Test files fixed!" -ForegroundColor Green
