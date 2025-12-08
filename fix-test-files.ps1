# Fix JWT tokens and order statuses in test files
# This script fixes critical MVP blockers

Write-Host "🔧 Fixing test files for MVP launch..." -ForegroundColor Cyan

$testDir = "d:\matrix-delivery\backend\tests"

# Fix 1: Update JWT token generation to include audience and issuer
Write-Host "`n📝 Fixing JWT token generation..." -ForegroundColor Yellow

$jwtFix = @"
            {
                algorithm: 'HS256',
                issuer: 'matrix-delivery',
                audience: 'matrix-delivery-api',
                expiresIn: '1h'
            }
"@

# Fix paypal.test.js
$paypalTest = Get-Content "$testDir\paypal.test.js" -Raw
$paypalTest = $paypalTest -replace "(?s)('posted')", "'pending_bids'"
$paypalTest = $paypalTest -replace "(?s)(jwt\.sign\([^)]+\),\s*JWT_SECRET,\s*\{\s*expiresIn: '1h'\s*\})", "jwt.sign(`$1, JWT_SECRET, $jwtFix)"
Set-Content "$testDir\paypal.test.js" -Value $paypalTest
Write-Host "  ✅ Fixed paypal.test.js" -ForegroundColor Green

# Fix messaging.test.js  
$messagingTest = Get-Content "$testDir\messaging.test.js" -Raw
$messagingTest = $messagingTest -replace "(?s)(jwt\.sign\([^)]+\),\s*JWT_SECRET,\s*\{\s*expiresIn: '1h'\s*\})", "jwt.sign(`$1, JWT_SECRET, $jwtFix)"
Set-Content "$testDir\messaging.test.js" -Value $messagingTest
Write-Host "  ✅ Fixed messaging.test.js" -ForegroundColor Green

# Fix payment.test.js
if (Test-Path "$testDir\payment.test.js") {
    $paymentTest = Get-Content "$testDir\payment.test.js" -Raw
    $paymentTest = $paymentTest -replace "(?s)(jwt\.sign\([^)]+\),\s*JWT_SECRET,\s*\{\s*expiresIn: '1h'\s*\})", "jwt.sign(`$1, JWT_SECRET, $jwtFix)"
    Set-Content "$testDir\payment.test.js" -Value $paymentTest
    Write-Host "  ✅ Fixed payment.test.js" -ForegroundColor Green
}

# Fix fileUpload.test.js
if (Test-Path "$testDir\fileUpload.test.js") {
    $fileUploadTest = Get-Content "$testDir\fileUpload.test.js" -Raw
    $fileUploadTest = $fileUploadTest -replace "(?s)(jwt\.sign\([^)]+\),\s*JWT_SECRET,\s*\{\s*expiresIn: '1h'\s*\})", "jwt.sign(`$1, JWT_SECRET, $jwtFix)"
    Set-Content "$testDir\fileUpload.test.js" -Value $fileUploadTest
    Write-Host "  ✅ Fixed fileUpload.test.js" -ForegroundColor Green
}

# Fix auth.test.js
if (Test-Path "$testDir\auth.test.js") {
    $authTest = Get-Content "$testDir\auth.test.js" -Raw
    $authTest = $authTest -replace "(?s)(jwt\.sign\([^)]+\),\s*JWT_SECRET,\s*\{\s*expiresIn: '1h'\s*\})", "jwt.sign(`$1, JWT_SECRET, $jwtFix)"
    Set-Content "$testDir\auth.test.js" -Value $authTest
    Write-Host "  ✅ Fixed auth.test.js" -ForegroundColor Green
}

Write-Host "`n✅ All test files fixed!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "  1. Run: cd backend && npm test" -ForegroundColor White
Write-Host "  2. Verify test pass rate ≥95%" -ForegroundColor White
