# Project Rules Summary - Updated 2025-12-30

## 🎯 New Mandatory Requirements Added

This document summarizes the comprehensive rules added to `.agent/rules.md` to ensure all future AI agents and developers follow best practices.

---

## 1. 🔒 Security as Priority #1 (MANDATORY)

**Philosophy**: "WE DON'T WANT OUR APP HACKED!"

Every line of code, API endpoint, and database query MUST be security-first.

### Key Security Requirements:
- ✅ **SQL Injection Prevention**: 100% parameterized queries, whitelist validation
- ✅ **Authentication & Authorization**: JWT tokens, resource ownership checks
- ✅ **Input Validation**: All params validated and sanitized
- ✅ **Error Handling**: No information leakage to clients
- ✅ **Rate Limiting**: Prevent brute force and DoS attacks
- ✅ **Sensitive Data Protection**: Environment variables, encryption at rest
- ✅ **Security Testing**: Comprehensive security test suite required

**See:** Lines 5-558 in `.agent/rules.md`

---

## 2. 🧹 Clean Code Best Practices (MANDATORY)

### Requirements:
- **Meaningful Names**: Descriptive variable, function, and class names
- **Small Functions**: <50 lines, do one thing well
- **DRY Principle**: Don't Repeat Yourself
- **Boy Scout Rule**: Leave code cleaner than you found it
- **Error Handling**: Use try-catch, never ignore errors
- **No Magic Numbers**: Use named constants
- **Consistent Formatting**: Prettier/ESLint

**Example:**
```typescript
// ❌ BAD
function p(d) { let t = 0; for (let i = 0; i < d.length; i++) { t += d[i].p * d[i].q; } return t; }

// ✅ GOOD
/**
 * Calculates the total price for all items in an order
 * @param orderItems - Array of order items with price and quantity
 * @returns Total price in EGP
 */
function calculateOrderTotal(orderItems: OrderItem[]): number {
  const ZERO_TOTAL = 0;
  return orderItems.reduce((total, item) => 
    total + (item.price * item.quantity), ZERO_TOTAL
  );
}
```

**See:** Lines 586-626 in `.agent/rules.md`

---

## 3. 📝 Comprehensive Documentation & Comments (MANDATORY)

**Goal**: Every piece of code MUST be beginner-friendly and well-documented.

### Requirements:

#### Inline Comments (REQUIRED)
- Explain **WHY**, not just what
- Document complex logic, security considerations, edge cases
- Break down complex operations into commented steps

#### JSDoc/TSDoc (MANDATORY for all functions)
```typescript
/**
 * Brief description of what the function does
 * 
 * Detailed explanation for beginners.
 * 
 * Security: Note any security considerations
 * 
 * @param paramName - Description
 * @returns Description of return value
 * @throws Description of errors
 * 
 * @example
 * const result = myFunction('example', 123);
 */
```

#### File-Level Documentation (MANDATORY)
Every file starts with a header comment explaining:
- Purpose of the file
- What it contains
- Security considerations
- Beginner-friendly explanation
- Links to related files

#### Module README Files (RECOMMENDED)
For complex modules, add `README.md` explaining architecture and concepts.

**See:** Lines 627-841 in `.agent/rules.md`

---

## 4. 📚 Mandatory DOCS/ Documentation (REQUIRED)

**For EVERY task, feature, or significant change, create documentation in `DOCS/`.**

### Required Documentation Types:

1. **Implementation Docs** (`DOCS/<feature-name>-implementation.md`)
   - What was built
   - Why decisions were made
   - How it works (with diagrams)
   - API specifications
   - Security measures
   - Usage examples
   - Testing approach

2. **API Documentation** (`DOCS/API/`)
   - All endpoints documented
   - Request/response examples
   - Authentication requirements
   - Error codes

3. **Architecture Decisions** (`DOCS/ADR/`)
   - Major architectural decisions
   - Alternatives considered
   - Rationale for chosen approach

### Documentation Template Provided
Complete template with all sections included in rules file.

**See:** Lines 842-921 in `.agent/rules.md`

---

## 5. 🎯 TypeScript-First Development (MANDATORY)

**Rule**: TypeScript is REQUIRED for all new code. JavaScript only for legacy modifications.

### Requirements:

✅ **ALWAYS Use TypeScript:**
- All new components (`.tsx`)
- All new services (`.ts`)
- All new utilities (`.ts`)
- All new hooks (`.ts`)
- All new routes/controllers (`.ts`)

❌ **NEVER:**
- Create new `.js` files
- Use `any` type (FORBIDDEN)
- Skip type definitions

### TypeScript Standards:

**1. No `any` Types (Forbidden)**
```typescript
// ❌ BAD - FORBIDDEN
function processData(data: any): any { }

// ✅ GOOD
function processData(data: OrderData): ProcessedOrder { }

// ✅ ACCEPTABLE when truly unknown
function processData(data: unknown): ProcessedOrder {
  if (!isOrderData(data)) throw new Error('Invalid data');
  return processValidatedData(data);
}
```

**2. Strict TypeScript Config**
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

**3. Define Interfaces for All Data Structures**

**4. Use Type Guards for Runtime Validation**

**5. Use Generics for Reusable Code**

**See:** Lines 922-1019 in `.agent/rules.md`

---

## 6. 🧪 Comprehensive Testing (MANDATORY)

**EVERY new feature MUST include comprehensive tests at ALL levels.**

### Required Test Types (ALL MANDATORY):

1. **Unit Tests** - Test individual functions in isolation
2. **Integration Tests** - Test API endpoints and database interactions
3. **BDD Tests** - Dual/polymorphic approach (see below)
4. **E2E Tests** - Critical user flows (highly recommended)

### Minimum Coverage:
- New code: **80% minimum**
- Critical paths: **100%** (auth, payments, orders, balance)
- Bug fixes: MUST include regression test
- **No PR merged without tests**

---

## 7. 🥒 Dual/Polymorphic BDD Testing (MANDATORY)

**Innovation**: One `.feature` file, two test layers!

### Concept:
The same Gherkin feature file is used for BOTH:
1. **Integration tests** (backend API testing)
2. **UI tests** (frontend browser testing)

This ensures behavior consistency across layers.

### Structure:
```
/features/
  balance/
    transaction-history.feature    # Shared feature file
  step-definitions/
    integration/
      balance_steps.ts              # Backend/API test steps
    ui/
      balance_steps.tsx             # Frontend/UI test steps
```

### Example Feature File:
```gherkin
Feature: Transaction History
  As a user
  I want to view my transaction history
  So I can track my balance changes

  @integration @ui
  Scenario: View recent transactions with pagination
    When I request my transaction history with limit 2
    Then I should see 2 transactions
    And pagination should show total of 3 transactions

  @integration
  Scenario: Filter transactions by type (API only)
    When I request transactions filtered by type "earnings"
    Then I should receive 1 transaction

  @ui
  Scenario: User sees loading state (UI only)
    When I navigate to the transactions page
    Then I should see a loading spinner
    And after loading I should see my transactions
```

### Tag-Based Running:
```bash
# Backend integration only
npm run test:bdd -- --tags '@integration and not @ui'

# UI tests only
npm run test:bdd:ui -- --tags '@ui'

# Both layers
npm run test:bdd:all
```

**See:** Lines 1092-1439 in `.agent/rules.md`

---

## Summary: What Every Agent Must Do Now

### ✅ For Every Feature/Task:

1. **Security First**
   - [ ] All inputs validated and sanitized
   - [ ] Parameterized queries only
   - [ ] Authorization checks on all endpoints
   - [ ] No sensitive data exposure

2. **Clean Code**
   - [ ] Meaningful names, small functions (<50 lines)
   - [ ] No magic numbers, DRY principle
   - [ ] Proper error handling

3. **Documentation**
   - [ ] JSDoc on all functions
   - [ ] Inline comments explaining WHY
   - [ ] File-level documentation
   - [ ] Create DOCS/<feature>-implementation.md

4. **TypeScript**
   - [ ] Use TypeScript for all new code
   - [ ] No `any` types
   - [ ] Strict configuration
   - [ ] Type guards for validation

5. **Testing**
   - [ ] Unit tests for all functions
   - [ ] Integration tests for API endpoints
   - [ ] BDD tests (dual: integration + UI)
   - [ ] 80%+ coverage minimum

---

## Result

The `.agent/rules.md` file now contains **1,380+ lines** of comprehensive guidelines ensuring:

✅ **Security-first development**  
✅ **Production-quality code**  
✅ **Beginner-friendly codebase**  
✅ **Complete documentation**  
✅ **TypeScript everywhere**  
✅ **Comprehensive test coverage**  

All future AI agents working on this project will automatically follow these rules! 🎯
