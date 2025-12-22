# Matrix Delivery Learning Library - 100% FREE Resources Only
# Complete offline library without any paid books

$libraryPath = "$HOME\matrix-learning-library-free"
New-Item -ItemType Directory -Force -Path $libraryPath | Out-Null
Set-Location $libraryPath

Write-Host "📚 Downloading Clean Code Resources..." -ForegroundColor Green
git clone https://github.com/ryanmcdermott/clean-code-javascript.git
git clone https://github.com/labs42io/clean-code-typescript.git
git clone https://github.com/jnguyen095/clean-code.git clean-code-summary
git clone https://github.com/97-things/97-things-every-programmer-should-know.git

Write-Host "`n🧪 Downloading BDD/TDD Resources..." -ForegroundColor Cyan
git clone https://github.com/cucumber/docs.git cucumber-docs
git clone https://github.com/cucumber/cucumber-js.git
git clone https://github.com/dwyl/learn-tdd.git
git clone https://github.com/goldbergyoni/javascript-testing-best-practices.git
git clone https://github.com/testing-library/testing-library-docs.git
git clone --depth 1 https://github.com/jestjs/jest.git jest-docs
git clone --depth 1 https://github.com/microsoft/playwright.git playwright-docs

Write-Host "`n🔐 Downloading Security Resources..." -ForegroundColor Red
# OWASP Resources
git clone https://github.com/OWASP/CheatSheetSeries.git owasp-cheat-sheets
git clone https://github.com/OWASP/wstg.git owasp-testing-guide
git clone https://github.com/juice-shop/juice-shop.git owasp-juice-shop

# Security Books (Free)
git clone https://github.com/sbilly/awesome-security.git
git clone https://github.com/qazbnm456/awesome-web-security.git
git clone https://github.com/lirantal/awesome-nodejs-security.git
git clone https://github.com/nakov/Practical-Cryptography-for-Developers-Book.git

# Download Security Engineering (Free PDF)
Invoke-WebRequest -Uri "https://www.cl.cam.ac.uk/~rja14/Papers/SEv3-1-May21.pdf" -OutFile "Security-Engineering-3rd-Edition.pdf"

# OWASP PDFs
Invoke-WebRequest -Uri "https://owasp.org/www-project-top-ten/2017/OWASP_Top_10-2017_(en).pdf.pdf" -OutFile "OWASP-Top-10.pdf" -ErrorAction SilentlyContinue
Invoke-WebRequest -Uri "https://owasp.org/www-project-api-security/assets/pdf/OWASP_API-Security-Top-10-2019.pdf" -OutFile "OWASP-API-Security-Top-10.pdf" -ErrorAction SilentlyContinue

Write-Host "`n📊 Downloading Project Management Resources..." -ForegroundColor Green
Invoke-WebRequest -Uri "https://basecamp.com/shapeup/shape-up.pdf" -OutFile "shape-up.pdf"
Invoke-WebRequest -Uri "https://basecamp.com/gettingreal/getting-real.pdf" -OutFile "getting-real.pdf"
Invoke-WebRequest -Uri "https://scrumguides.org/docs/scrumguide/v2020/2020-Scrum-Guide-US.pdf" -OutFile "scrum-guide.pdf"

Write-Host "`n🚀 Downloading Startup & Business Resources..." -ForegroundColor Magenta
git clone https://github.com/charlax/professional-programming.git
git clone https://github.com/mtdvio/every-programmer-should-know.git
git clone https://github.com/kdeldycke/awesome-engineering-team-management.git
git clone https://github.com/LappleApple/awesome-leading-and-managing.git

Write-Host "`n📖 Downloading Node.js & JavaScript Resources..." -ForegroundColor Yellow
git clone https://github.com/goldbergyoni/nodebestpractices.git
git clone https://github.com/basarat/typescript-book.git typescript-deep-dive
git clone https://github.com/getify/You-Dont-Know-JS.git
git clone https://github.com/airbnb/javascript.git airbnb-style-guide
git clone https://github.com/leonardomso/33-js-concepts.git

Write-Host "`n⚛️ Downloading React & Frontend Resources..." -ForegroundColor Blue
git clone https://github.com/reactjs/react.dev.git
git clone https://github.com/typescript-cheatsheets/react.git react-typescript-cheatsheet
git clone https://github.com/enaqx/awesome-react.git

Write-Host "`n🗄️ Downloading Database Resources..." -ForegroundColor DarkCyan
git clone https://github.com/dhamaniasad/awesome-postgres.git
git clone https://github.com/PostgREST/postgrest.git postgrest-docs

Write-Host "`n🏗️ Downloading Architecture & Design Patterns..." -ForegroundColor DarkYellow
git clone https://github.com/kamranahmedse/design-patterns-for-humans.git
git clone https://github.com/DovAmir/awesome-design-patterns.git
git clone https://github.com/donnemartin/system-design-primer.git

Write-Host "`n📚 Downloading Free Programming Books..." -ForegroundColor White
git clone https://github.com/EbookFoundation/free-programming-books.git

Write-Host "`n✅ All FREE resources downloaded to: $libraryPath" -ForegroundColor Cyan

Write-Host "`nCalculating total size..." -ForegroundColor Yellow
$totalSize = (Get-ChildItem -Recurse -File | Measure-Object -Property Length -Sum).Sum / 1GB
Write-Host "Total size: $([math]::Round($totalSize, 2)) GB" -ForegroundColor Cyan

Write-Host "`n📚 Downloaded Resources Summary:" -ForegroundColor Cyan
Write-Host "Directories: $((Get-ChildItem -Directory).Count)" -ForegroundColor White
Write-Host "PDF Files: $((Get-ChildItem -Filter *.pdf).Count)" -ForegroundColor White

Write-Host "`n🎯 Quick Start Guide:" -ForegroundColor Yellow
Write-Host "1. Security: Start with owasp-cheat-sheets/ and Security-Engineering-3rd-Edition.pdf" -ForegroundColor White
Write-Host "2. BDD/TDD: Read cucumber-docs/ and javascript-testing-best-practices/" -ForegroundColor White
Write-Host "3. Clean Code: Study clean-code-javascript/ and clean-code-typescript/" -ForegroundColor White
Write-Host "4. Project Mgmt: Read shape-up.pdf and getting-real.pdf" -ForegroundColor White
Write-Host "5. Node.js: Explore nodebestpractices/ and You-Dont-Know-JS/" -ForegroundColor White
Write-Host "6. TypeScript: Study typescript-deep-dive/" -ForegroundColor White
Write-Host "7. Architecture: Review system-design-primer/ and design-patterns-for-humans/" -ForegroundColor White
Write-Host "8. React: Check react.dev/ and react-typescript-cheatsheet/" -ForegroundColor White

Write-Host "`n📖 Recommended Reading Order for Matrix Delivery:" -ForegroundColor Magenta
Write-Host "Week 1: OWASP Top 10 + Node.js Security Best Practices" -ForegroundColor White
Write-Host "Week 2: Cucumber Docs + JavaScript Testing Best Practices" -ForegroundColor White
Write-Host "Week 3: Clean Code JavaScript + TypeScript Deep Dive" -ForegroundColor White
Write-Host "Week 4: Shape Up + Getting Real (Project Management)" -ForegroundColor White
Write-Host "Week 5: System Design Primer + Node.js Best Practices" -ForegroundColor White

Write-Host "`n🔍 Explore all books:" -ForegroundColor Yellow
Write-Host "Check free-programming-books/ for 1000+ free books on every topic!" -ForegroundColor White
