param(
    [Parameter(Mandatory=$true, HelpMessage="User email to verify")]
    [string]$Email,

    [Parameter(Mandatory=$false, HelpMessage="Database host (default: localhost)")]
    [string]$DbHost = "localhost",

    [Parameter(Mandatory=$false, HelpMessage="Database port (default: 5432)")]
    [string]$DbPort = "5432",

    [Parameter(Mandatory=$false, HelpMessage="Database name (default: matrix_delivery)")]
    [string]$DbName = "matrix_delivery",

    [Parameter(Mandatory=$false, HelpMessage="Database user (default: postgres)")]
    [string]$DbUser = "postgres",

    [Parameter(Mandatory=$false, HelpMessage="Database password (default: be_the_one)")]
    [string]$DbPassword = "be_the_one"
)

Write-Host "Matrix Delivery - User Verification Script" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Validate email format
if ([string]::IsNullOrWhiteSpace($Email)) {
    Write-Host "ERROR: Email cannot be empty" -ForegroundColor Red
    exit 1
}

# Basic email validation
if ($Email -notmatch '^[^@\s]+@[^@\s]+\.[^@\s]+$') {
    Write-Host "ERROR: Invalid email format" -ForegroundColor Red
    exit 1
}

Write-Host "Email to verify: $Email" -ForegroundColor Yellow
Write-Host "Database: $DbHost`:$DbPort/$DbName" -ForegroundColor Yellow
Write-Host ""

# Set PGPASSWORD environment variable for psql
$env:PGPASSWORD = $DbPassword

# Construct the psql connection string
$connectionString = "host=$DbHost port=$DbPort dbname=$DbName user=$DbUser"

# SQL query to verify the user
$sqlQuery = "UPDATE users SET is_verified = true WHERE email = '$Email';"

Write-Host "Executing verification query..." -ForegroundColor Green

try {
    # Execute the query using psql
    $result = $sqlQuery | & psql "$connectionString" -q -t

    if ($LASTEXITCODE -eq 0) {
        Write-Host "SUCCESS: User verification completed!" -ForegroundColor Green
        Write-Host ""

        # Check if the user was actually found and updated
        $checkQuery = "SELECT id, name, email, is_verified FROM users WHERE email = '$Email';"

        Write-Host "Verifying the update..." -ForegroundColor Cyan
        $checkResult = $checkQuery | & psql "$connectionString" -q -t -A -F ","

        if ($checkResult) {
            $userData = $checkResult -split ","
            if ($userData.Length -ge 4) {
                Write-Host "User Details:" -ForegroundColor White
                Write-Host "   ID: $($userData[0])" -ForegroundColor White
                Write-Host "   Name: $($userData[1])" -ForegroundColor White
                Write-Host "   Email: $($userData[2])" -ForegroundColor White
                Write-Host "   Verified: $($userData[3])" -ForegroundColor White

                if ($userData[3] -eq "t") {
                    Write-Host ""
                    Write-Host "SUCCESS: User is now verified! They will see the green 'Verified' badge in the app." -ForegroundColor Green
                } else {
                    Write-Host ""
                    Write-Host "WARNING: User verification status is still false. Please check the database." -ForegroundColor Yellow
                }
            }
        } else {
            Write-Host "ERROR: User not found in database" -ForegroundColor Red
        }
    } else {
        Write-Host "ERROR: Database query failed" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    # Clean up environment variable
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "Note: The user will need to refresh their browser or log out/in to see the verification badge." -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
