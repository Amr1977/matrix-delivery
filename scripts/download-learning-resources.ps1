# Matrix Delivery Learning Library - Complete Download Script
# Run this to get all free resources offline (including BDD/TDD)

$libraryPath = "$HOME\matrix-learning-library"
New-Item -ItemType Directory -Force -Path $libraryPath | Out-Null
Set-Location $libraryPath

Write-Host "📚 Downloading Clean Code Resources..." -ForegroundColor Green
git clone https://github.com/ryanmcdermott/clean-code-javascript.git
git clone https://github.com/labs42io/clean-code-typescript.git
git clone https://github.com/jnguyen095/clean-code.git clean-code-summary

Write-Host "`n🧪 Downloading BDD/TDD Resources..." -ForegroundColor Cyan
git clone https://github.com/cucumber/docs.git cucumber-docs
git clone https://github.com/cucumber/cucumber-js.git
git clone https://github.com/dwyl/learn-tdd.git
git clone https://github.com/goldbergyoni/javascript-testing-best-practices.git
git clone https://github.com/testing-library/testing-library-docs.git
git clone --depth 1 https://github.com/jestjs/jest.git jest-docs
git clone --depth 1 https://github.com/microsoft/playwright.git playwright-docs

Write-Host "`n📊 Downloading Project Management Resources..." -ForegroundColor Green
Invoke-WebRequest -Uri "https://basecamp.com/shapeup/shape-up.pdf" -OutFile "shape-up.pdf"
Invoke-WebRequest -Uri "https://basecamp.com/gettingreal/getting-real.pdf" -OutFile "getting-real.pdf"

Write-Host "`n🚀 Downloading Startup Resources..." -ForegroundColor Green
git clone https://github.com/charlax/professional-programming.git
git clone https://github.com/mtdvio/every-programmer-should-know.git

Write-Host "`n📖 Downloading Node.js Best Practices..." -ForegroundColor Green
git clone https://github.com/goldbergyoni/nodebestpractices.git
git clone https://github.com/basarat/typescript-book.git

Write-Host "`n✅ All free resources downloaded to: $libraryPath" -ForegroundColor Cyan
Write-Host "`nTotal size:" -ForegroundColor Yellow
Get-ChildItem -Recurse | Measure-Object -Property Length -Sum | Select-Object @{Name = "Size (MB)"; Expression = { [math]::Round($_.Sum / 1MB, 2) } }

Write-Host "`n📚 Available Resources:" -ForegroundColor Cyan
Get-ChildItem -Directory | Select-Object Name
Get-ChildItem -File | Select-Object Name

Write-Host "`n🎯 Quick Start Guide:" -ForegroundColor Yellow
Write-Host "1. BDD/TDD: Start with cucumber-docs/ and javascript-testing-best-practices/" -ForegroundColor White
Write-Host "2. Clean Code: Read clean-code-javascript/ and clean-code-typescript/" -ForegroundColor White
Write-Host "3. Project Mgmt: Read shape-up.pdf and getting-real.pdf" -ForegroundColor White
Write-Host "4. Node.js: Explore nodebestpractices/" -ForegroundColor White
Write-Host "5. TypeScript: Study typescript-book/" -ForegroundColor White
