# Clean Code, Project Management & Solo Startup Resources

## 📚 Clean Code & Software Craftsmanship

### Essential Books

**"Clean Code" by Robert C. Martin**
- **Publisher**: Prentice Hall
- **Format**: PDF, EPUB, Kindle
- **Where**: O'Reilly, Amazon Kindle ($35-45)
- **Free Alternative**: https://github.com/jnguyen095/clean-code (Summary)
- **Offline**: `git clone https://github.com/jnguyen095/clean-code.git`

**"The Clean Coder" by Robert C. Martin**
- **Focus**: Professional behavior, time management, estimation
- **Where**: O'Reilly, Amazon Kindle ($30-40)
- **Direct Application**: Your refactoring strategy, BDD workflow

**"Refactoring" by Martin Fowler** (2nd Edition)
- **Publisher**: Addison-Wesley
- **Format**: PDF, EPUB, Kindle
- **Where**: O'Reilly, Amazon Kindle ($40-50)
- **Free Alternative**: https://refactoring.guru/ (comprehensive patterns)
- **Offline**: Save refactoring.guru as PDF

**"Code Complete" by Steve McConnell** (2nd Edition)
- **Publisher**: Microsoft Press
- **Format**: PDF, EPUB
- **Where**: O'Reilly, Amazon Kindle ($35-45)
- **Coverage**: Construction, testing, debugging, collaboration

### Free Clean Code Resources

**Clean Code JavaScript**
- URL: https://github.com/ryanmcdermott/clean-code-javascript
- Download: `git clone https://github.com/ryanmcdermott/clean-code-javascript.git`
- Coverage: Variables, functions, objects, SOLID principles

**Clean Code TypeScript**
- URL: https://github.com/labs42io/clean-code-typescript
- Download: `git clone https://github.com/labs42io/clean-code-typescript.git`
- Perfect for your TS migration

**Refactoring Guru**
- URL: https://refactoring.guru/
- Download: Save entire site with HTTrack
- Command: `httrack https://refactoring.guru/ -O ./refactoring-guru`

---

## 🧪 BDD & TDD (Test-Driven Development)

### Essential Books

**"Test Driven Development: By Example" by Kent Beck**
- **Publisher**: Addison-Wesley
- **Format**: PDF, EPUB, Kindle
- **Where**: O'Reilly, Amazon Kindle ($30-40)
- **Coverage**: Red-Green-Refactor cycle, testing patterns
- **Direct Application**: Your backend service tests, balanceService.ts

**"The Cucumber Book" by Matt Wynne & Aslak Hellesøy** (2nd Edition)
- **Publisher**: Pragmatic Bookshelf
- **Format**: PDF, EPUB, MOBI (DRM-free)
- **Where**: pragprog.com ($25), O'Reilly ($35)
- **Coverage**: Gherkin syntax, step definitions, test organization
- **Direct Application**: Your 31 feature files, dual-mode testing

**"BDD in Action" by John Ferguson Smart**
- **Publisher**: Manning
- **Format**: PDF, EPUB, Kindle
- **Where**: manning.com ($35-45), O'Reilly
- **Coverage**: Living documentation, executable specifications
- **Direct Application**: Your BDD-first workflow

**"Growing Object-Oriented Software, Guided by Tests" by Steve Freeman & Nat Pryce**
- **Publisher**: Addison-Wesley
- **Format**: PDF, EPUB, Kindle
- **Where**: O'Reilly, Amazon Kindle ($35-45)
- **Coverage**: Outside-in TDD, mocking, test doubles
- **Direct Application**: Your service layer architecture

**"Specification by Example" by Gojko Adzic**
- **Publisher**: Manning
- **Format**: PDF, EPUB, Kindle
- **Where**: manning.com ($30-40), O'Reilly
- **Coverage**: Collaborative specification, living documentation
- **Direct Application**: Your feature files as documentation

**"Unit Testing Principles, Practices, and Patterns" by Vladimir Khorikov**
- **Publisher**: Manning
- **Format**: PDF, EPUB, Kindle
- **Where**: manning.com ($40-50), O'Reilly
- **Coverage**: Test quality, mocking best practices, integration tests
- **Direct Application**: Your Jest tests, backend/__tests__/

### Free BDD/TDD Resources

**Cucumber Documentation (Official)**
- URL: https://cucumber.io/docs/
- Download: https://github.com/cucumber/docs
- Offline: `git clone https://github.com/cucumber/docs.git`
- Coverage: Gherkin, step definitions, hooks, tags

**Cucumber School (Free Course)**
- URL: https://school.cucumber.io/
- Format: Video + exercises
- Coverage: BDD fundamentals, Cucumber basics
- Download: Videos can be saved for offline

**BDD with Cucumber.js (GitHub)**
- URL: https://github.com/cucumber/cucumber-js
- Download: `git clone https://github.com/cucumber/cucumber-js.git`
- Examples: `/examples` directory has complete samples

**Jest Documentation (Official)**
- URL: https://jestjs.io/docs/getting-started
- Download: https://github.com/jestjs/jest/tree/main/docs
- Offline: `git clone --depth 1 https://github.com/jestjs/jest.git`

**Playwright Testing Documentation**
- URL: https://playwright.dev/
- Download: https://github.com/microsoft/playwright/tree/main/docs
- Offline: `git clone --depth 1 https://github.com/microsoft/playwright.git`
- Coverage: E2E testing, browser automation

**TDD by Example (Free Articles)**
- URL: https://martinfowler.com/articles/practical-test-pyramid.html
- Download: Save as PDF
- Coverage: Test pyramid, integration vs unit tests

**BDD 101 (Cucumber Blog)**
- URL: https://cucumber.io/blog/bdd/
- Download: Save articles as PDF
- Coverage: BDD principles, best practices

**Test Driven Development with Node.js (Free Guide)**
- URL: https://github.com/dwyl/learn-tdd
- Download: `git clone https://github.com/dwyl/learn-tdd.git`
- Coverage: Mocha, Chai, TDD workflow

**JavaScript Testing Best Practices**
- URL: https://github.com/goldbergyoni/javascript-testing-best-practices
- Download: `git clone https://github.com/goldbergyoni/javascript-testing-best-practices.git`
- Coverage: 50+ best practices, anti-patterns

**Testing Library Documentation**
- URL: https://testing-library.com/
- Download: https://github.com/testing-library/testing-library-docs
- Offline: `git clone https://github.com/testing-library/testing-library-docs.git`
- Coverage: React Testing Library, DOM Testing Library

### BDD/TDD Video Courses (Free)

**freeCodeCamp - TDD Course**
- URL: https://www.youtube.com/watch?v=Jv2uxzhPFl4
- Duration: 2 hours
- Download: `youtube-dl` for offline

**Cucumber BDD Tutorial (Automation Step by Step)**
- URL: https://www.youtube.com/playlist?list=PLhW3qG5bs-L9sJKoT1LC5grGT77sfW0Z8
- Duration: 3+ hours
- Coverage: Cucumber basics, advanced patterns

**Jest Crash Course (Traversy Media)**
- URL: https://www.youtube.com/watch?v=7r4xVDI2vho
- Duration: 57 minutes
- Coverage: Unit testing with Jest

### Matrix Delivery-Specific BDD/TDD Application

**Your Current BDD Setup** (Already Excellent!):
```
tests/features/               # 31 feature files ✓
tests/step_definitions/
  ├── backend/               # Integration tests ✓
  └── frontend/              # UI tests (skeleton) ✓
tests/support/
  ├── hooks.js               # Backend hooks ✓
  └── browser_hooks.js       # Playwright hooks ✓
```

**Recommended Reading Order for Your Project**:
1. **Cucumber Documentation** (Free - 2 days) - Understand your current setup
2. **The Cucumber Book** (Paid - 1 week) - Master Gherkin and step organization
3. **BDD in Action** (Paid - 1 week) - Living documentation patterns
4. **JavaScript Testing Best Practices** (Free - 2 days) - Apply to your tests
5. **Unit Testing Principles** (Paid - 2 weeks) - Improve test quality

**Apply to Your Codebase**:
- **COD Commission Tests**: Already following BDD best practices!
- **Balance Service Tests**: Add TDD for new features
- **Frontend Components**: Use Testing Library + BDD scenarios

---

## 🔐 Cybersecurity & Software Security

### Essential Books

**"Web Application Security" by Andrew Hoffman**
- **Publisher**: O'Reilly
- **Format**: PDF, EPUB, Kindle
- **Where**: O'Reilly, Amazon Kindle ($35-45)
- **Coverage**: XSS, CSRF, SQL injection, authentication, session management
- **Direct Application**: Your JWT auth, httpOnly cookies, input validation

**"The Web Application Hacker's Handbook" by Dafydd Stuttard & Marcus Pinto** (2nd Edition)
- **Publisher**: Wiley
- **Format**: PDF, EPUB, Kindle
- **Where**: Amazon Kindle ($40-50), O'Reilly
- **Coverage**: Finding and exploiting vulnerabilities, testing methodology
- **Direct Application**: Security testing your API endpoints

**"Security Engineering" by Ross Anderson** (3rd Edition)
- **Publisher**: Wiley
- **Format**: PDF, EPUB (FREE online!)
- **Free URL**: https://www.cl.cam.ac.uk/~rja14/book.html
- **Download**: PDF available for free
- **Coverage**: Cryptography, authentication, access control, security economics

**"Bulletproof SSL and TLS" by Ivan Ristić**
- **Publisher**: Feisty Duck
- **Format**: PDF, EPUB, MOBI
- **Where**: feistyduck.com ($49), O'Reilly
- **Coverage**: HTTPS, certificates, TLS configuration
- **Direct Application**: Your production deployment, API security

**"The Tangled Web" by Michal Zalewski**
- **Publisher**: No Starch Press
- **Format**: PDF, EPUB (DRM-free)
- **Where**: nostarch.com ($35), Amazon Kindle
- **Coverage**: Browser security, same-origin policy, web protocols
- **Direct Application**: Frontend security, XSS prevention

**"Hacking APIs" by Corey J. Ball**
- **Publisher**: No Starch Press
- **Format**: PDF, EPUB (DRM-free)
- **Where**: nostarch.com ($40), Amazon Kindle ($30)
- **Coverage**: API security testing, authentication flaws, rate limiting
- **Direct Application**: Your Express API, authentication endpoints

**"Practical Cryptography for Developers" by Svetlin Nakov**
- **Publisher**: Free Online Book
- **Format**: Web, PDF
- **Free URL**: https://cryptobook.nakov.com/
- **Download**: Available as PDF
- **Coverage**: Hashing, encryption, digital signatures, blockchain

**"OWASP Testing Guide" (Official)**
- **Publisher**: OWASP Foundation (FREE!)
- **Format**: PDF, Web
- **Free URL**: https://owasp.org/www-project-web-security-testing-guide/
- **Download**: https://github.com/OWASP/wstg/releases
- **Coverage**: Complete web security testing methodology

### Free Security Resources

**OWASP Top 10 (2021)**
- URL: https://owasp.org/www-project-top-ten/
- Download: PDF available
- Coverage: Top 10 web application security risks
- **Critical for Matrix Delivery**: A01:2021-Broken Access Control, A02:2021-Cryptographic Failures

**OWASP API Security Top 10**
- URL: https://owasp.org/www-project-api-security/
- Download: PDF available
- Coverage: API-specific security risks
- **Direct Application**: Your REST API endpoints

**OWASP Cheat Sheet Series**
- URL: https://cheatsheetseries.owasp.org/
- Download: https://github.com/OWASP/CheatSheetSeries
- Offline: `git clone https://github.com/OWASP/CheatSheetSeries.git`
- Coverage: 100+ security cheat sheets (Node.js, JWT, Session Management, etc.)

**Node.js Security Best Practices**
- URL: https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html
- Download: Save as PDF
- Coverage: Input validation, authentication, dependency security

**Security Engineering (Free Book)**
- URL: https://www.cl.cam.ac.uk/~rja14/book.html
- Download: Free PDF (all chapters)
- Coverage: Comprehensive security engineering

**Practical Cryptography for Developers**
- URL: https://cryptobook.nakov.com/
- Download: https://github.com/nakov/Practical-Cryptography-for-Developers-Book
- Offline: `git clone https://github.com/nakov/Practical-Cryptography-for-Developers-Book.git`

**Web Security Academy (PortSwigger)**
- URL: https://portswigger.net/web-security
- Format: Interactive labs + reading
- Coverage: SQL injection, XSS, CSRF, authentication, access control
- **Free labs**: Practice exploiting vulnerabilities

**Awesome Security**
- URL: https://github.com/sbilly/awesome-security
- Download: `git clone https://github.com/sbilly/awesome-security.git`
- Coverage: Curated list of security tools, resources, books

**Awesome Web Security**
- URL: https://github.com/qazbnm456/awesome-web-security
- Download: `git clone https://github.com/qazbnm456/awesome-web-security.git`
- Coverage: Web security resources, tools, articles

**Awesome Node.js Security**
- URL: https://github.com/lirantal/awesome-nodejs-security
- Download: `git clone https://github.com/lirantal/awesome-nodejs-security.git`
- Coverage: Node.js security best practices, tools, resources

**OWASP Juice Shop (Practice App)**
- URL: https://owasp.org/www-project-juice-shop/
- Download: `git clone https://github.com/juice-shop/juice-shop.git`
- Purpose: Intentionally vulnerable app for security testing practice
- **Perfect for learning**: Practice finding vulnerabilities

**Security Headers**
- URL: https://securityheaders.com/
- Purpose: Test your site's security headers
- **Test Matrix Delivery**: Check HTTPS, CSP, HSTS headers

**Mozilla Observatory**
- URL: https://observatory.mozilla.org/
- Purpose: Security & privacy analysis
- **Scan your deployment**: Get security recommendations

### Security Tools & Frameworks

**Helmet.js (Express Security)**
- URL: https://helmetjs.github.io/
- Download: `npm install helmet`
- Purpose: Secure Express apps with HTTP headers
- **Direct Application**: Add to your Express server

**express-rate-limit**
- URL: https://github.com/express-rate-limit/express-rate-limit
- Download: `npm install express-rate-limit`
- Purpose: Rate limiting middleware
- **Already in your code**: `backend/middleware/rateLimit.js`

**Snyk (Dependency Scanning)**
- URL: https://snyk.io/
- Free tier available
- Purpose: Find vulnerabilities in dependencies
- **Scan Matrix Delivery**: `npx snyk test`

**npm audit**
- Built into npm
- Command: `npm audit`
- Purpose: Check for known vulnerabilities
- **Run regularly**: Part of CI/CD

### Matrix Delivery-Specific Security Concerns

**Current Security Implementation** (Review these):
```
✅ JWT Authentication (httpOnly cookies)
✅ Rate limiting (orderCreationRateLimit, apiRateLimit)
✅ Input validation (middleware/auth.js)
✅ CORS configuration
⚠️ Need to verify: SQL injection prevention
⚠️ Need to add: Security headers (Helmet.js)
⚠️ Need to add: CSRF protection
```

**Critical Security Areas for Matrix Delivery**:

1. **Authentication & Authorization**
   - JWT token management (backend/middleware/auth.js)
   - Role-based access control (customer, driver, admin)
   - Session management (httpOnly cookies)

2. **Payment Security**
   - COD commission handling (balanceService.ts)
   - Wallet transactions
   - Crypto payments (USDT/BNB)

3. **API Security**
   - Rate limiting (already implemented)
   - Input validation (need to verify)
   - SQL injection prevention (using parameterized queries?)

4. **Data Protection**
   - User PII (personal information)
   - Location data (driver tracking)
   - Financial data (balances, transactions)

5. **Real-time Communication**
   - Socket.IO authentication
   - WebSocket security

### Security Video Courses (Free)

**OWASP Top 10 Explained**
- URL: https://www.youtube.com/watch?v=rWHvp7rUka8
- Duration: 1 hour
- Coverage: Overview of top web vulnerabilities

**Web Security by Stanford (CS 253)**
- URL: https://web.stanford.edu/class/cs253/
- Format: Lecture videos + slides
- Coverage: Comprehensive web security course

**Cybrary - Web Application Security**
- URL: https://www.cybrary.it/
- Free tier available
- Coverage: Various security courses

### Recommended Security Learning Path

**Week 1: Foundations**
1. OWASP Top 10 (Free - 1 day)
2. OWASP API Security Top 10 (Free - 1 day)
3. OWASP Cheat Sheet Series (Free - browse)
4. Node.js Security Best Practices (Free - 1 day)

**Week 2: Web Security**
5. Web Application Security book (Paid - 1 week)
6. Web Security Academy labs (Free - practice)

**Week 3: API Security**
7. Hacking APIs book (Paid - 1 week)
8. Test your own API endpoints

**Week 4: Advanced**
9. Security Engineering (Free - selected chapters)
10. The Tangled Web (Paid - browser security)

### Security Audit Checklist for Matrix Delivery

**Immediate Actions**:
- [ ] Run `npm audit` and fix vulnerabilities
- [ ] Add Helmet.js for security headers
- [ ] Implement CSRF protection
- [ ] Review SQL queries for injection risks
- [ ] Add security logging (failed auth attempts)
- [ ] Implement account lockout after failed logins
- [ ] Add input sanitization for all user inputs
- [ ] Review CORS configuration
- [ ] Implement Content Security Policy (CSP)
- [ ] Add HTTPS enforcement (HSTS)

**Regular Security Tasks**:
- [ ] Weekly: `npm audit` and dependency updates
- [ ] Monthly: Security header scan (securityheaders.com)
- [ ] Quarterly: Penetration testing
- [ ] Yearly: Security code review

---

## 📊 Project Management for Developers

### Essential Books

**"The Lean Startup" by Eric Ries**
- **Publisher**: Crown Business
- **Format**: PDF, EPUB, Kindle, Audiobook
- **Where**: Amazon Kindle ($15-20), Audible
- **Focus**: Build-Measure-Learn, MVP, validated learning
- **Direct Application**: Your Matrix Delivery MVP strategy

**"Shape Up" by Basecamp (Ryan Singer)**
- **Publisher**: Basecamp (FREE!)
- **Format**: Web, PDF, EPUB
- **Download**: https://basecamp.com/shapeup
- **Free PDF**: https://basecamp.com/shapeup/shape-up.pdf
- **Coverage**: 6-week cycles, appetite, betting table
- **Perfect For**: Solo/small team development

**"Getting Real" by Basecamp (37signals)**
- **Publisher**: Basecamp (FREE!)
- **Format**: Web, PDF
- **Download**: https://basecamp.com/gettingreal
- **Coverage**: Build less, iterate, stay lean

**"Rework" by Jason Fried & DHH**
- **Publisher**: Crown Business
- **Format**: PDF, EPUB, Kindle, Audiobook
- **Where**: Amazon Kindle ($12-18)
- **Focus**: Productivity, meetings, hiring, culture

**"The Phoenix Project" by Gene Kim**
- **Publisher**: IT Revolution Press
- **Format**: PDF, EPUB, Kindle, Audiobook
- **Where**: Amazon Kindle ($15-25)
- **Coverage**: DevOps, continuous delivery, flow
- **Direct Application**: Your CI/CD pipeline, deployment

### Free Project Management Resources

**Agile Manifesto & Principles**
- URL: https://agilemanifesto.org/
- Download: Save as PDF
- Essential reading (5 minutes)

**Scrum Guide**
- URL: https://scrumguides.org/
- Download: PDF available in 30+ languages
- Free official guide

**Kanban Guide**
- URL: https://kanbanguides.org/
- Download: Free PDF
- Perfect for solo development

---

## 🚀 Solo Startup & Indie Hacking

### Essential Books

**"The Mom Test" by Rob Fitzpatrick**
- **Publisher**: Robfitz Ltd
- **Format**: PDF, EPUB, Kindle
- **Where**: Amazon Kindle ($10-15)
- **Focus**: Customer interviews, validation
- **Critical For**: Understanding Matrix Delivery user needs

**"Start Small, Stay Small" by Rob Walling**
- **Publisher**: The Numa Group
- **Format**: PDF, EPUB, Kindle
- **Where**: Amazon Kindle ($10-15)
- **Focus**: Bootstrapping, marketing, automation
- **Perfect For**: Solo developer building SaaS

**"The $100 Startup" by Chris Guillebeau**
- **Publisher**: Crown Business
- **Format**: PDF, EPUB, Kindle, Audiobook
- **Where**: Amazon Kindle ($12-18)
- **Coverage**: Lean startup, minimal investment

**"Company of One" by Paul Jarvis**
- **Publisher**: Houghton Mifflin Harcourt
- **Format**: PDF, EPUB, Kindle, Audiobook
- **Where**: Amazon Kindle ($15-20)
- **Focus**: Staying small, sustainable growth

**"Zero to Sold" by Arvid Kahl**
- **Publisher**: The Bootstrapped Founder
- **Format**: PDF, EPUB, Kindle
- **Where**: Amazon Kindle ($15-20), https://thebootstrappedfounder.com/zero-to-sold/
- **Coverage**: Building, growing, selling a bootstrapped SaaS

### Free Solo Startup Resources

**Indie Hackers**
- URL: https://www.indiehackers.com/
- Download: Save articles/interviews as PDF
- Coverage: Real founder stories, revenue numbers

**MicroConf YouTube Channel**
- URL: https://www.youtube.com/c/MicroConf
- Download: `youtube-dl` for offline viewing
- Coverage: SaaS metrics, marketing, growth

**Startup School by Y Combinator**
- URL: https://www.startupschool.org/
- Format: Free video course
- Download: Available for offline viewing
- Coverage: Product-market fit, growth, fundraising

**The Bootstrapped Founder (Arvid Kahl's Blog)**
- URL: https://thebootstrappedfounder.com/
- Download: RSS feed or save articles
- Coverage: Audience building, SaaS metrics

**Indie Hackers Podcast Transcripts**
- URL: https://www.indiehackers.com/podcasts
- Download: Transcripts available
- Coverage: Founder interviews, tactics

---

## 🎯 Recommended Reading Order for Matrix Delivery

### Phase 1: Clean Code Foundation (Week 1-2)
1. **Clean Code JavaScript** (Free - 2 days)
2. **Clean Code TypeScript** (Free - 2 days)
3. **Refactoring Guru** (Free - browse patterns)
4. **Clean Code** by Uncle Bob (Paid - Chapters 1-6, 10-11)

### Phase 2: Project Management (Week 3)
5. **Shape Up** (FREE - 3 days)
6. **Getting Real** (FREE - 1 day)
7. **The Lean Startup** (Paid - Chapters 1-8)

### Phase 3: Solo Startup (Week 4)
8. **The Mom Test** (Paid - 2 days)
9. **Start Small, Stay Small** (Paid - 3 days)
10. **Indie Hackers** (Free - ongoing)

### Phase 4: Advanced (Ongoing)
11. **The Phoenix Project** (Paid - DevOps mindset)
12. **Zero to Sold** (Paid - SaaS playbook)
13. **Company of One** (Paid - sustainable growth)

---

## 💾 Complete Offline Download Script

```bash
#!/bin/bash
# Download all free clean code & startup resources

mkdir -p ~/startup-library
cd ~/startup-library

echo "📚 Downloading Clean Code Resources..."
git clone https://github.com/ryanmcdermott/clean-code-javascript.git
git clone https://github.com/labs42io/clean-code-typescript.git
git clone https://github.com/jnguyen095/clean-code.git clean-code-summary

echo "🧪 Downloading BDD/TDD Resources..."
git clone https://github.com/cucumber/docs.git cucumber-docs
git clone https://github.com/cucumber/cucumber-js.git
git clone https://github.com/dwyl/learn-tdd.git
git clone https://github.com/goldbergyoni/javascript-testing-best-practices.git
git clone https://github.com/testing-library/testing-library-docs.git
git clone --depth 1 https://github.com/jestjs/jest.git jest-docs
git clone --depth 1 https://github.com/microsoft/playwright.git playwright-docs

echo "📊 Downloading Project Management Resources..."
wget https://basecamp.com/shapeup/shape-up.pdf
wget https://basecamp.com/gettingreal/getting-real.pdf
wget https://scrumguides.org/docs/scrumguide/v2020/2020-Scrum-Guide-US.pdf

echo "🚀 Downloading Startup Resources..."
git clone https://github.com/charlax/professional-programming.git
git clone https://github.com/mtdvio/every-programmer-should-know.git

echo "✅ All free resources downloaded to ~/startup-library"
ls -lh
```

---

## 💰 Budget-Friendly Purchase Strategy

### Option A: O'Reilly Platform ($49/month)
**Download in Month 1**:
- Clean Code
- The Clean Coder
- Refactoring (2nd Ed)
- Code Complete
- The Lean Startup
- The Phoenix Project
- Rework
- The Mom Test
- Start Small, Stay Small
- Zero to Sold

**Total**: $49 for 10+ books

### Option B: Kindle Strategic Purchases ($150 total)
**Priority 1** ($60):
- Clean Code ($40)
- Shape Up (FREE)
- The Mom Test ($15)

**Priority 2** ($50):
- The Lean Startup ($15)
- Start Small, Stay Small ($15)
- Refactoring ($40)

**Priority 3** ($40):
- The Phoenix Project ($20)
- Zero to Sold ($20)

### Option C: 100% Free Path
1. Clean Code JavaScript (Free)
2. Clean Code TypeScript (Free)
3. Refactoring Guru (Free)
4. Shape Up (Free)
5. Getting Real (Free)
6. Indie Hackers (Free)
7. Startup School (Free)
8. MicroConf Videos (Free)

---

## 🎓 Bonus: Free Courses

**Harvard CS50**
- URL: https://cs50.harvard.edu/
- Download: Videos available offline
- Coverage: Computer science fundamentals

**MIT OpenCourseWare - Software Engineering**
- URL: https://ocw.mit.edu/
- Download: PDFs, videos
- Coverage: Software construction, testing

**Google Project Management Certificate (Coursera)**
- URL: https://www.coursera.org/professional-certificates/google-project-management
- Free audit option
- Coverage: Agile, Scrum, project planning

---

## 📱 Recommended Apps for Offline Reading

**Calibre** (eBook Manager)
- Converts between formats (PDF ↔ EPUB ↔ MOBI)
- Organizes library
- Offline reader

**Obsidian** (Note-taking)
- Link notes from different books
- Build knowledge graph
- Markdown-based (portable)

**Zotero** (Research Manager)
- Organize PDFs
- Annotate
- Generate citations

---

## 🎯 Matrix Delivery-Specific Application

### Clean Code → Your Codebase
- **App.js (2,921 lines)**: Apply "Extract Function" pattern
- **server.js (6,009 lines)**: Apply "Extract Class" pattern
- **balanceService.ts**: Already following clean code principles!

### Project Management → Your Workflow
- **Shape Up**: 6-week cycles for feature development
- **Kanban**: Track BDD test implementation
- **Lean Startup**: MVP validation for new features

### Solo Startup → Matrix Delivery
- **The Mom Test**: Interview drivers/customers
- **Start Small, Stay Small**: Marketing automation
- **Zero to Sold**: SaaS metrics dashboard

Would you like me to:
1. Create a PowerShell script to download all free resources?
2. Generate a personalized reading plan based on your current priorities?
3. Set up an Obsidian vault template for organizing these resources?
