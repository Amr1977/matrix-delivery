# Fix JWT tokens in core test files (excluding PayPal/Stripe)
Write-Host "🔧 Fixing JWT tokens in core test files..." -ForegroundColor Cyan

$testDir = "d:\matrix-delivery\backend\tests"

# Fix messaging.test.js
Write-Host "`n📝 Fixing messaging.test.js..." -ForegroundColor Yellow
$file = "$testDir\messaging.test.js"
if (Test-Path $file) {
    $content = Get-Content $file -Raw
    # Replace the JWT token generation pattern
    $content = $content -replace "(\s+)(expiresIn: '1h')", "`$1algorithm: 'HS256',`r`n`$1issuer: 'matrix-delivery',`r`n`$1audience: 'matrix-delivery-api',`r`n`$1expiresIn: '1h'"
    Set-Content $file -Value $content -NoNewline
    Write-Host "  ✅ Fixed messaging.test.js" -ForegroundColor Green
}

# Fix auth.test.js
Write-Host "`n📝 Fixing auth.test.js..." -ForegroundColor Yellow
$file = "$testDir\auth.test.js"
if (Test-Path $file) {
    $content = Get-Content $file -Raw
    $content = $content -replace "(\s+)(expiresIn: '1h')", "`$1algorithm: 'HS256',`r`n`$1issuer: 'matrix-delivery',`r`n`$1audience: 'matrix-delivery-api',`r`n`$1expiresIn: '1h'"
    Set-Content $file -Value $content -NoNewline
    Write-Host "  ✅ Fixed auth.test.js" -ForegroundColor Green
}

# Fix fileUpload.test.js
Write-Host "`n📝 Fixing fileUpload.test.js..." -ForegroundColor Yellow
$file = "$testDir\fileUpload.test.js"
if (Test-Path $file) {
    $content = Get-Content $file -Raw
    $content = $content -replace "(\s+)(expiresIn: '1h')", "`$1algorithm: 'HS256',`r`n`$1issuer: 'matrix-delivery',`r`n`$1audience: 'matrix-delivery-api',`r`n`$1expiresIn: '1h'"
    Set-Content $file -Value $content -NoNewline
    Write-Host "  ✅ Fixed fileUpload.test.js" -ForegroundColor Green
}

Write-Host "`n✅ Core test files fixed!" -ForegroundColor Green
Write-Host "`nNote: PayPal and Stripe tests skipped per user request" -ForegroundColor Yellow
