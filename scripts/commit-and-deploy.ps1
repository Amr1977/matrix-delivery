# Commit and Deploy Security Hardening
# Run this from d:\matrix-delivery

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Committing Security Hardening Changes                    ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Step 1: Add TypeScript source files
Write-Host "1. Adding TypeScript security files..." -ForegroundColor Yellow
git add backend/types/security.d.ts
git add backend/utils/tokenManager.ts
git add backend/utils/encryption.ts
git add backend/middleware/security.ts
git add backend/middleware/auditLogger.ts

# Step 2: Add updated server.js
Write-Host "2. Adding updated server.js..." -ForegroundColor Yellow
git add backend/server.js

# Step 3: Add .env.example
Write-Host "3. Adding .env.example..." -ForegroundColor Yellow
git add backend/.env.example

# Step 4: Add package files
Write-Host "4. Adding package.json changes..." -ForegroundColor Yellow
git add backend/package.json
git add backend/package-lock.json

# Step 5: Add updated .gitignore
Write-Host "5. Adding updated .gitignore..." -ForegroundColor Yellow
git add .gitignore

# Step 6: Add useful scripts (optional)
Write-Host "6. Adding deployment scripts..." -ForegroundColor Yellow
git add scripts/rotate-secrets.ps1
git add scripts/update-env-production.ps1
git add backend/check-create-db.sh

Write-Host ""
Write-Host "Files staged for commit:" -ForegroundColor Green
git status --short

Write-Host ""
$confirm = Read-Host "Do you want to commit these changes? (y/N)"

if ($confirm -eq 'y' -or $confirm -eq 'Y') {
    Write-Host ""
    Write-Host "Committing changes..." -ForegroundColor Yellow
    
    git commit -m "feat: implement comprehensive security hardening

Security Enhancements:
- Add TypeScript security utilities (JWT, encryption, audit logging)
- Integrate Helmet.js security headers (HSTS, CSP, X-Frame-Options)
- Implement strict CORS validation (no wildcards)
- Add HTTPS redirect middleware for production
- Remove weak database credential fallbacks
- Enhance JWT validation with proper error codes and claims
- Initialize audit logging system with database persistence
- Add request sanitization middleware

Configuration:
- Update .env.example with all required security variables
- Add comprehensive .gitignore patterns for secrets
- Add deployment scripts for VPS setup

Dependencies:
- helmet: Security headers
- cookie-parser: CSRF token support
- csurf: CSRF protection
- typescript: TypeScript compilation
- @types/node, @types/express: TypeScript definitions

Breaking Changes:
- JWT_REFRESH_SECRET and ENCRYPTION_KEY now required
- CORS_ORIGIN must not contain localhost in production
- Database credentials must be explicitly set (no fallbacks)

Migration:
1. Generate new secrets with rotate-secrets.ps1
2. Update .env files with JWT_REFRESH_SECRET and ENCRYPTION_KEY
3. Compile TypeScript files on deployment
4. Update PostgreSQL password if needed"

    Write-Host ""
    Write-Host "✅ Changes committed!" -ForegroundColor Green
    Write-Host ""
    
    $push = Read-Host "Do you want to push to remote? (y/N)"
    
    if ($push -eq 'y' -or $push -eq 'Y') {
        Write-Host ""
        Write-Host "Pushing to remote..." -ForegroundColor Yellow
        git push origin main
        
        Write-Host ""
        Write-Host "✅ Pushed to remote!" -ForegroundColor Green
        Write-Host ""
        Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
        Write-Host "║  Next Steps: Deploy on VPS                                 ║" -ForegroundColor Cyan
        Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "1. SSH to VPS:" -ForegroundColor White
        Write-Host "   ssh root@matrix-api.oldantique50.com -p 2222" -ForegroundColor Gray
        Write-Host ""
        Write-Host "2. Pull latest code:" -ForegroundColor White
        Write-Host "   cd /root/matrix-delivery" -ForegroundColor Gray
        Write-Host "   git pull origin main" -ForegroundColor Gray
        Write-Host ""
        Write-Host "3. Install dependencies:" -ForegroundColor White
        Write-Host "   cd backend" -ForegroundColor Gray
        Write-Host "   npm install" -ForegroundColor Gray
        Write-Host ""
        Write-Host "4. Compile TypeScript:" -ForegroundColor White
        Write-Host "   npx tsc utils/tokenManager.ts utils/encryption.ts middleware/security.ts middleware/auditLogger.ts --outDir . --module commonjs --target es2020 --esModuleInterop --skipLibCheck --resolveJsonModule" -ForegroundColor Gray
        Write-Host ""
        Write-Host "5. Upload .env file (from Windows):" -ForegroundColor White
        Write-Host "   scp -P 2222 backend\.env.production root@matrix-api.oldantique50.com:/root/matrix-delivery/backend/.env" -ForegroundColor Gray
        Write-Host ""
        Write-Host "6. Restart PM2 (on VPS):" -ForegroundColor White
        Write-Host "   chmod 600 .env" -ForegroundColor Gray
        Write-Host "   pm2 restart ecosystem.config.js --env production" -ForegroundColor Gray
        Write-Host ""
    }
}
else {
    Write-Host ""
    Write-Host "❌ Commit cancelled" -ForegroundColor Red
}
