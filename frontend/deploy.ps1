if (Test-Path "frontend") { cd frontend }
npm i
npm audit fix

# Build with restricted memory (768MB) to prevent OOM
node scripts/generate-git-info.js
Copy-Item .env.production .env -Force
$env:NODE_OPTIONS = "--max-old-space-size=2048"
$env:REACT_APP_ENV = "production"
$env:DISABLE_ESLINT_PLUGIN = "true"
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed! Skipping deployment." -ForegroundColor Red
    exit 1
}

firebase deploy --only hosting
