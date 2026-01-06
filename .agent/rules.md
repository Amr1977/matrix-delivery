# Matrix Delivery Project Rules

---

## 🔒 SECURITY - PRIORITY #1 (MANDATORY)

**SECURITY IS THE #1 CONCERN FOR ALL IMPLEMENTATIONS AND DOCUMENTATION.**

**WE DON'T WANT OUR APP HACKED! Every line of code, every API endpoint, every database query MUST be security-first.**

### Security Mindset

- **Assume all input is malicious** until proven otherwise
- **Never trust the client** - always validate on the server
- **Defense in depth** - multiple layers of security
- **Least privilege** - grant minimum necessary permissions
- **Fail securely** - errors should not leak sensitive info

---

### 🛡️ Authentication & Authorization

#### 1. JWT Token Security

```javascript
// ✅ GOOD: Secure token generation
const token = jwt.sign(
  { userId, role }, // NEVER include passwords or secrets
  process.env.JWT_SECRET, // MUST be strong (256-bit minimum)
  {
    expiresIn: "7d", // Always set expiration
    algorithm: "HS256", // Explicitly specify algorithm
  },
);

// ❌ BAD: Weak or missing security
const token = jwt.sign({ userId, password }, "weak-secret");
```

**Token Best Practices:**

- ✅ Store in httpOnly cookies (frontend can't access)
- ✅ Set secure: true in production (HTTPS only)
- ✅ Set sameSite: 'strict' or 'lax' (CSRF protection)
- ✅ Implement token rotation/refresh
- ❌ NEVER store tokens in localStorage (XSS vulnerable)
- ❌ NEVER include sensitive data in tokens

#### 2. Password Security

```javascript
// ✅ GOOD: Bcrypt with salt rounds ≥ 10
const hashedPassword = await bcrypt.hash(password, 12);

// ❌ BAD: Plain text or weak hashing
const hashedPassword = crypto.createHash("md5").update(password).digest("hex");
```

**Password Best Practices:**

- ✅ Minimum 8 characters, complexity requirements
- ✅ Use bcrypt with cost factor ≥ 10
- ✅ Rate limit login attempts (prevent brute force)
- ✅ Implement account lockout after failed attempts
- ❌ NEVER log passwords (even in debug mode)
- ❌ NEVER send passwords in error messages
- ❌ NEVER store passwords in plain text

#### 3. Authorization Checks

```javascript
// ✅ GOOD: Verify ownership before operations
router.get("/balance/:userId/transactions", verifyToken, async (req, res) => {
  // Check if user owns this resource OR is admin
  if (req.params.userId !== req.user.userId && req.user.role !== "admin") {
    return res.status(403).json({ error: "Unauthorized" });
  }
  // Proceed with operation
});

// ❌ BAD: Trusting client-provided data
router.get("/balance/:userId/transactions", async (req, res) => {
  // No auth check - anyone can access anyone's data!
});
```

**Authorization Best Practices:**

- ✅ Verify every request (even GET requests)
- ✅ Check resource ownership, not just authentication
- ✅ Use middleware for consistent checks
- ✅ Implement RBAC (Role-Based Access Control)
- ❌ NEVER trust req.body for user identification
- ❌ NEVER skip auth checks on "read-only" endpoints

---

### 💉 SQL Injection Prevention

#### 1. Parameterized Queries (ALWAYS)

```javascript
// ✅ GOOD: Parameterized query
const result = await pool.query(
  "SELECT * FROM users WHERE email = $1 AND status = $2",
  [email, status], // Values are escaped automatically
);

// ❌ BAD: String concatenation
const result = await pool.query(
  `SELECT * FROM users WHERE email = '${email}'`, // SQL INJECTION!
);
```

#### 2. ORM/Query Builder

```javascript
// ✅ GOOD: Use query builders or ORMs
const users = await knex("users").where({ email }).select("*");

// ❌ BAD: Raw SQL with interpolation
const users = await db.raw(`SELECT * FROM users WHERE email = '${email}'`);
```

#### 3. Dynamic Query Building

```javascript
// ✅ GOOD: Whitelist validation for dynamic fields
const allowedSortFields = ["created_at", "amount", "type"];
const sortBy = allowedSortFields.includes(req.query.sortBy)
  ? req.query.sortBy
  : "created_at"; // Safe default

const query = `SELECT * FROM transactions ORDER BY ${sortBy} DESC`;

// ❌ BAD: Direct use of user input
const query = `SELECT * FROM transactions ORDER BY ${req.query.sortBy} DESC`; // Injection!
```

**SQL Injection Best Practices:**

- ✅ ALWAYS use parameterized queries ($1, $2, etc.)
- ✅ Whitelist user input for ORDER BY, column names
- ✅ Validate and sanitize ALL user inputs
- ✅ Use prepared statements
- ❌ NEVER concatenate user input into SQL
- ❌ NEVER trust client-side validation alone
- ❌ NEVER use string interpolation in queries

---

### 🔐 Input Validation & Sanitization

#### 1. Comprehensive Validation

```javascript
// ✅ GOOD: Multiple layers of validation
const validateTransactionQuery = (req, res, next) => {
  const { limit, offset, type, sortBy } = req.query;

  // Validate types
  if (limit && !Number.isInteger(Number(limit))) {
    return res.status(400).json({ error: "Invalid limit" });
  }

  // Validate ranges
  const sanitizedLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);

  // Whitelist validation
  const allowedTypes = ["deposit", "withdrawal", "earnings"];
  if (type && !allowedTypes.includes(type)) {
    return res.status(400).json({ error: "Invalid transaction type" });
  }

  req.sanitized = { limit: sanitizedLimit, type };
  next();
};

// ❌ BAD: No validation
router.get("/transactions", (req, res) => {
  const limit = req.query.limit; // Could be anything!
});
```

#### 2. Sanitization Libraries

```javascript
// ✅ GOOD: Use validation libraries
const { body, validationResult } = require("express-validator");

router.post(
  "/orders",
  [
    body("email").isEmail().normalizeEmail(),
    body("amount").isFloat({ min: 0.01, max: 10000 }),
    body("description").trim().escape(),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    // Proceed with validated data
  },
);
```

**Input Validation Best Practices:**

- ✅ Validate type, format, range, and length
- ✅ Use whitelist validation (allow known good)
- ✅ Sanitize HTML/special characters
- ✅ Validate on BOTH client and server
- ✅ Reject invalid input, don't try to fix it
- ❌ NEVER trust any client input
- ❌ NEVER use eval() or Function() with user input
- ❌ NEVER assume valid format without checking

---

### 🌐 Web Security Headers

#### 1. Security Middleware (MANDATORY)

```javascript
// ✅ GOOD: Helmet.js for security headers
const helmet = require("helmet");

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // Minimize unsafe-inline
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    frameguard: { action: "deny" }, // Prevent clickjacking
    noSniff: true, // Prevent MIME sniffing
    xssFilter: true, // XSS protection
  }),
);
```

#### 2. CORS Configuration

```javascript
// ✅ GOOD: Strict CORS policy
const corsOptions = {
  origin:
    process.env.NODE_ENV === "production"
      ? "https://matrix-delivery.com" // Specific origin
      : "http://localhost:3000",
  credentials: true, // Allow cookies
  optionsSuccessStatus: 200,
  maxAge: 86400, // 24 hours
};

app.use(cors(corsOptions));

// ❌ BAD: Permissive CORS
app.use(cors({ origin: "*" })); // Anyone can access!
```

#### 3. Rate Limiting

```javascript
// ✅ GOOD: Rate limiting on sensitive endpoints
const rateLimit = require("express-rate-limit");

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: "Too many login attempts, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

app.post("/api/auth/login", loginLimiter, loginHandler);

// API-wide rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // 100 requests per 15 minutes
});

app.use("/api/", apiLimiter);
```

**Web Security Best Practices:**

- ✅ Use Helmet.js for security headers
- ✅ Implement strict CSP (Content Security Policy)
- ✅ Enable HSTS (HTTP Strict Transport Security)
- ✅ Set restrictive CORS policies
- ✅ Implement rate limiting on all endpoints
- ✅ Use HTTPS only in production (no HTTP)
- ❌ NEVER allow permissive CORS (origin: '\*')
- ❌ NEVER skip rate limiting on auth endpoints

---

### 🔍 Error Handling & Logging

#### 1. Secure Error Messages

```javascript
// ✅ GOOD: Generic error messages to clients
try {
  const user = await getUserByEmail(email);
  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid credentials' });  // Generic
  }
} catch (error) {
  logger.error('Login error:', { error: error.message, email });  // Log details
  return res.status(500).json({ error: 'Internal server error' });  // Generic to client
}

// ❌ BAD: Exposing sensitive information
catch (error) {
  return res.status(500).json({
    error: error.message,  // May expose DB structure
    stack: error.stack     // Exposes code structure!
  });
}
```

#### 2. Sensitive Data Logging

```javascript
// ✅ GOOD: Sanitize logs
logger.info("Login attempt", {
  email, // OK to log email
  ip: req.ip,
  userAgent: req.headers["user-agent"],
  // NO password, token, or credit card info!
});

// ❌ BAD: Logging sensitive data
logger.debug("Login data", { email, password }); // NEVER log passwords!
logger.info("Payment", { cardNumber: req.body.cardNumber }); // NEVER log PII!
```

**Error Handling Best Practices:**

- ✅ Log detailed errors server-side
- ✅ Return generic errors to clients
- ✅ Use different error codes (don't leak info)
- ✅ Sanitize error messages (no stack traces)
- ❌ NEVER expose stack traces to clients
- ❌ NEVER log passwords, tokens, credit cards
- ❌ NEVER expose database errors to clients
- ❌ NEVER include sensitive data in URLs/logs

---

### 💳 Sensitive Data Protection

#### 1. Environment Variables

```javascript
// ✅ GOOD: Use environment variables
const JWT_SECRET = process.env.JWT_SECRET; // Must be 256-bit minimum
const DB_PASSWORD = process.env.DB_PASSWORD;

// Validate on startup
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must be set and at least 32 characters");
}

// ❌ BAD: Hardcoded secrets
const JWT_SECRET = "my-secret-key"; // Committed to Git!
const API_KEY = "sk_live_abc123"; // Exposed in code!
```

#### 2. .env File Security

```bash
# ✅ GOOD: Strong secrets, properly configured
JWT_SECRET=a3d8f7b2c9e1d6f4a8b3c7e2f9d1a6b4c8e3f7a2d9b6c1e4f8a3d7b2c9e1f6a4
DB_PASSWORD=ComplexP@ssw0rd!WithSpecialChars123

# .gitignore must include:
.env
.env.local
.env.*.local

# ❌ BAD: Weak or missing secrets
JWT_SECRET=secret
DB_PASSWORD=password
```

#### 3. Encryption for Stored Data

```javascript
// ✅ GOOD: Encrypt sensitive data at rest
const crypto = require("crypto");

const algorithm = "aes-256-gcm";
const key = Buffer.from(process.env.ENCRYPTION_KEY, "hex");

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();
  return {
    encrypted,
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
  };
}

// Store credit card tokens encrypted
const encryptedCard = encrypt(cardToken);
```

**Sensitive Data Best Practices:**

- ✅ Use .env files for secrets (never commit)
- ✅ Encrypt sensitive data at rest
- ✅ Use strong encryption (AES-256)
- ✅ Rotate secrets regularly
- ✅ Use separate secrets for dev/prod
- ❌ NEVER commit secrets to Git
- ❌ NEVER store credit cards (use tokens)
- ❌ NEVER log sensitive data
- ❌ NEVER send secrets in error messages

---

### 🧪 Security Testing

#### 1. Security Test Checklist

**EVERY feature MUST pass these security tests:**

```javascript
// Authentication Tests
describe("Security: Authentication", () => {
  it("rejects requests without valid token", async () => {
    const response = await request(app)
      .get("/api/balance/123/transactions")
      .expect(401);
  });

  it("rejects expired tokens", async () => {
    const expiredToken = generateExpiredToken();
    const response = await request(app)
      .get("/api/orders")
      .set("Authorization", `Bearer ${expiredToken}`)
      .expect(401);
  });
});

// Authorization Tests
describe("Security: Authorization", () => {
  it("prevents users from accessing other users data", async () => {
    const user1Token = await loginUser("user1");
    const response = await request(app)
      .get("/api/balance/user2/transactions")
      .set("Authorization", `Bearer ${user1Token}`)
      .expect(403); // Forbidden
  });
});

// SQL Injection Tests
describe("Security: SQL Injection", () => {
  it("sanitizes malicious SQL in query params", async () => {
    const maliciousInput = "'; DROP TABLE users; --";
    const response = await request(app)
      .get(`/api/transactions?type=${maliciousInput}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(400); // Bad request, not executed
  });
});

// XSS Tests
describe("Security: XSS Prevention", () => {
  it("escapes HTML in user input", async () => {
    const xssPayload = '<script>alert("XSS")</script>';
    const response = await request(app)
      .post("/api/orders")
      .send({ description: xssPayload })
      .set("Authorization", `Bearer ${token}`)
      .expect(201);

    expect(response.body.description).not.toContain("<script>");
  });
});
```

#### 2. Penetration Testing Checklist

**Manually test these before production:**

- [ ] SQL injection on all input fields
- [ ] XSS attempts in text fields
- [ ] CSRF token validation
- [ ] Path traversal attempts (../../etc/passwd)
- [ ] Rate limiting on all endpoints
- [ ] Authorization bypass attempts
- [ ] Session hijacking resistance
- [ ] Brute force protection on login
- [ ] File upload restrictions (if applicable)
- [ ] API key exposure in responses

---

### 📋 Security Code Review Checklist

**Before ANY code goes to production:**

#### Authentication & Authorization

- [ ] All endpoints have authentication
- [ ] Resource ownership verified
- [ ] JWT tokens are httpOnly cookies
- [ ] Tokens have expiration times
- [ ] Passwords hashed with bcrypt (cost ≥ 10)
- [ ] No hardcoded credentials

#### Input Validation

- [ ] All user inputs validated
- [ ] Whitelist validation for enums/options
- [ ] SQL queries use parameterized statements
- [ ] No string interpolation in SQL
- [ ] File uploads have type/size restrictions
- [ ] Email addresses validated and sanitized

#### Error Handling

- [ ] Generic error messages to clients
- [ ] Detailed errors logged server-side
- [ ] No stack traces exposed
- [ ] No sensitive data in error messages
- [ ] No database errors exposed to clients

#### Security Headers

- [ ] Helmet.js configured
- [ ] CORS properly restricted
- [ ] CSP (Content Security Policy) enabled
- [ ] HSTS enabled for HTTPS
- [ ] Rate limiting on all endpoints
- [ ] Rate limiting strict on auth endpoints

#### Sensitive Data

- [ ] No secrets in code
- [ ] .env files in .gitignore
- [ ] Secrets are strong (≥ 256-bit)
- [ ] No sensitive data in logs
- [ ] Credit cards tokenized, not stored
- [ ] PII encrypted at rest

#### Testing

- [ ] Auth/AuthZ tests passing
- [ ] SQL injection tests passing
- [ ] XSS prevention tests passing
- [ ] Rate limiting tests passing
- [ ] Security test coverage ≥ 80%

---

### 🚨 Security Incident Response

**If a security vulnerability is discovered:**

1. **Immediate Actions:**
   - Document the vulnerability (don't fix yet)
   - Assess severity (Low/Medium/High/Critical)
   - Determine if data was compromised
   - Notify the user immediately

2. **Remediation:**
   - Fix the vulnerability
   - Add regression tests
   - Review similar code patterns
   - Update this security guide

3. **Prevention:**
   - Add automated tests for this vulnerability type
   - Update security checklist
   - Review all code for similar issues

---

## 🏗️ Architecture & Code Quality

### Clean Code Principles (MANDATORY)

**ALL code MUST follow these principles:**

1. **Single Responsibility Principle (SRP)**
   - Each file/module/function does ONE thing
   - If a file exceeds 300 lines, it MUST be refactored
   - Break down large files like `server.js` and `App.js` into smaller modules

2. **Modularity & Separation of Concerns**
   - **Backend**: Use service layer pattern
     - `routes/` - Route handlers only (thin controllers)
     - `services/` - Business logic
     - `middleware/` - Reusable middleware
     - `utils/` - Helper functions
     - `models/` - Data models/schemas
   - **Frontend**: Component-based architecture
     - `components/` - Reusable UI components
     - `hooks/` - Custom React hooks
     - `services/` - API calls and business logic
     - `utils/` - Helper functions
     - `types/` - TypeScript type definitions

3. **File Size Limits**
   - Maximum 300 lines per file
   - If exceeded, MUST refactor into smaller modules
   - Extract reusable logic into separate files

4. **Clean Code Best Practices (MANDATORY)**
   - **Meaningful Names**: Variables, functions, and classes must have descriptive names
   - **Functions**: Do one thing, keep small (<50 lines)
   - **DRY Principle**: Don't Repeat Yourself - extract common code
   - **Boy Scout Rule**: Leave code cleaner than you found it
   - **Error Handling**: Use try-catch, don't ignore errors
   - **Consistent Formatting**: Use Prettier/ESLint
   - **No Magic Numbers**: Use named constants
   - **Pure Functions**: Minimize side effects when possible

**Clean Code Example:**

```typescript
// ❌ BAD: Unclear, complex, no error handling
function p(d) {
  let t = 0;
  for (let i = 0; i < d.length; i++) {
    t += d[i].p * d[i].q;
  }
  return t;
}

// ✅ GOOD: Clear, documented, error-handled
/**
 * Calculates the total price for all items in an order
 * @param orderItems - Array of order items with price and quantity
 * @returns Total price in EGP
 * @throws Error if orderItems is invalid
 */
function calculateOrderTotal(orderItems: OrderItem[]): number {
  if (!Array.isArray(orderItems) || orderItems.length === 0) {
    throw new Error("Invalid order items provided");
  }

  const ZERO_TOTAL = 0;
  const totalPrice = orderItems.reduce((total, item) => {
    const itemTotal = item.price * item.quantity;
    return total + itemTotal;
  }, ZERO_TOTAL);

  return totalPrice;
}
```

---

### 📝 Documentation & Comments (MANDATORY)

**Every piece of code MUST be beginner-friendly and well-documented.**

#### 1. Inline Comments (REQUIRED)

**Add comments explaining:**

- ✅ **Why** something is done (not just what)
- ✅ Complex algorithms or business logic
- ✅ Non-obvious decisions or workarounds
- ✅ Security considerations
- ✅ Performance optimizations
- ✅ Edge cases being handled

**Comment Guidelines:**

```typescript
// ❌ BAD: Stating the obvious
// Increment counter
counter++;

// ✅ GOOD: Explaining WHY
// Increment failed login attempts to trigger rate limiting after 5 attempts
failedLoginAttempts++;

// ❌ BAD: No comments on complex logic
const result = data
  .filter((x) => x.status === "active")
  .map((x) => ({ ...x, total: x.price * x.qty }))
  .reduce((sum, x) => sum + x.total, 0);

// ✅ GOOD: Breaking down complex logic with comments
// Filter to only include active items (exclude cancelled/deleted)
const activeItems = orderItems.filter((item) => item.status === "active");

// Calculate total for each item (price × quantity)
const itemsWithTotals = activeItems.map((item) => ({
  ...item,
  total: item.price * item.quantity,
}));

// Sum all item totals to get order total
const orderTotal = itemsWithTotals.reduce(
  (sum, item) => sum + item.total,
  0, // Start with 0 as initial value
);
```

#### 2. JSDoc/TSDoc Comments (MANDATORY for all functions)

**Every function/method MUST have:**

```typescript
/**
 * Brief description of what the function does
 *
 * Detailed explanation if needed. This helps beginners understand
 * the purpose and context of this function.
 *
 * @param paramName - Description of parameter
 * @param anotherParam - Description, including valid values
 * @returns Description of return value
 * @throws Description of errors that can be thrown
 *
 * @example
 * // Show how to use the function
 * const result = myFunction('example', 123);
 */
async function myFunction(
  paramName: string,
  anotherParam: number,
): Promise<Result> {
  // Implementation
}
```

**Real Example:**

```typescript
/**
 * Retrieves transaction history for a user with pagination and filtering
 *
 * This function fetches balance transactions from the database with support for
 * advanced filtering (type, status, date range) and pagination. It's designed to
 * handle large transaction histories efficiently using database indexes.
 *
 * Security: Validates all inputs to prevent SQL injection and enforces maximum
 * page size to prevent resource exhaustion attacks.
 *
 * @param options - Query options for filtering and pagination
 * @param options.userId - User ID to fetch transactions for (validated against JWT token)
 * @param options.limit - Number of items per page (1-100, default: 20)
 * @param options.offset - Number of items to skip (for pagination)
 * @param options.type - Filter by transaction type ('deposit', 'withdrawal', etc.)
 * @param options.status - Filter by status ('completed', 'pending', etc.)
 * @param options.startDate - Filter transactions after this date
 * @param options.endDate - Filter transactions before this date
 *
 * @returns Object containing transactions array and pagination metadata
 * @throws Error if userId is missing or database query fails
 *
 * @example
 * // Get first page of all transactions
 * const result = await getTransactionHistory({
 *   userId: '123',
 *   limit: 20
 * });
 *
 * @example
 * // Get completed deposits in December 2025
 * const result = await getTransactionHistory({
 *   userId: '123',
 *   type: 'deposit',
 *   status: 'completed',
 *   startDate: new Date('2025-12-01'),
 *   endDate: new Date('2025-12-31')
 * });
 */
async function getTransactionHistory(
  options: TransactionQueryOptions,
): Promise<TransactionResult> {
  // Implementation with inline comments explaining each step
}
```

#### 3. File-Level Documentation (MANDATORY)

**Every file MUST start with a header comment:**

```typescript
/**
 * Balance Service
 *
 * This service handles all balance-related operations for users including:
 * - Credit/debit operations
 * - Transaction history
 * - Balance holds and releases
 * - Commission deductions
 *
 * Security considerations:
 * - All database queries use parameterized statements (SQL injection prevention)
 * - Balance operations use database transactions to ensure consistency
 * - Negative balance checks prevent unauthorized withdrawals
 *
 * For beginners:
 * A "service" in this codebase contains business logic. It's called by
 * controllers/routes but doesn't directly handle HTTP requests.
 *
 * @module services/balanceService
 * @see {@link controllers/v1/balanceController} for HTTP endpoints
 * @see {@link types/balance} for type definitions
 */

import pool from "../config/db";
// ... rest of file
```

#### 4. README Files for Each Module (RECOMMENDED)

For complex modules, add a `README.md`:

```markdown
# Balance System

## Overview

The balance system manages user account balances for the Matrix Delivery platform.

## For Beginners

Think of balances like a digital wallet. Users can:

- Receive money (deposits, earnings)
- Spend money (withdrawals, commissions)
- View transaction history

## Architecture

- `balanceService.ts` - Core business logic
- `balanceController.ts` - HTTP endpoint handlers
- `balance.ts` - Route definitions
- `types/balance.ts` - TypeScript types

## Key Concepts

- **Available Balance**: Money user can spend right now
- **Held Balance**: Money temporarily locked (e.g., pending orders)
- **Pending Balance**: Money not yet cleared

## Security

All operations require authentication and authorization checks.
See [Security Documentation](../DOCS/security.md) for details.
```

---

### 📚 Mandatory Documentation in DOCS/ (REQUIRED)

**For EVERY task, feature, or significant change, you MUST create documentation in `DOCS/`.**

#### Documentation Requirements:

1. **Implementation Docs** (`DOCS/<feature-name>-implementation.md`)
   - What was built
   - Why decisions were made
   - How it works (with diagrams if helpful)
   - API specifications
   - Security measures
   - Usage examples
   - Testing approach

2. **API Documentation** (`DOCS/API/`)
   - All endpoints documented
   - Request/response examples
   - Authentication requirements
   - Error codes and handling

3. **Architecture Decisions** (`DOCS/ADR/`)
   - Major architectural decisions
   - Alternatives considered
   - Rationale for chosen approach

**Documentation Template:**

````markdown
# Feature Name - Implementation

## Overview

Brief description for beginners

## Background/Context

Why this was needed

## Implementation Details

### Architecture

How it's structured

### Key Components

- Component 1: Purpose and location
- Component 2: Purpose and location

### Flow Diagram

[Include mermaid diagram or image]

### Code Examples

```typescript
// Beginner-friendly examples
```
````

## Security Measures

Detailed security considerations

## API Reference

Endpoint documentation with examples

## Testing

- Unit tests location
- Integration tests location
- BDD scenarios

## For Beginners

Explanation in simple terms

## Future Improvements

What could be enhanced

````

---

### 🎯 TypeScript-First Development (MANDATORY)

**TypeScript is REQUIRED for all new code. JavaScript only for legacy modifications.**

#### TypeScript Requirements:

1. **ALWAYS Use TypeScript for New Code:**
   - ✅ All new components (`.tsx`)
   - ✅ All new services (`.ts`)
   - ✅ All new utilities (`.ts`)
   - ✅ All new hooks (`.ts`)
   - ✅ All new routes/controllers (`.ts`)
   - ✅ Type definitions in `types/` directory

2. **NEVER Use JavaScript for New Code:**
   - ❌ No new `.js` files
   - ❌ Only modify existing `.js` files when fixing legacy code
   - 🔄 Gradually migrate `.js` to `.ts` when refactoring

#### TypeScript Standards:

**1. No `any` Types (Forbidden)**
```typescript
// ❌ BAD: Using 'any' - FORBIDDEN
function processData(data: any): any {
  return data.something;
}

// ✅ GOOD: Proper typing
interface OrderData {
  id: string;
  amount: number;
  status: OrderStatus;
}

function processData(data: OrderData): ProcessedOrder {
  return {
    orderId: data.id,
    total: data.amount
  };
}

// ✅ ACCEPTABLE: Use 'unknown' if truly unknown, then narrow
function processData(data: unknown): ProcessedOrder {
  if (!isOrderData(data)) {
    throw new Error('Invalid data');
  }
  return processValidatedData(data);
}
````

**2. Strict TypeScript Configuration**

```json
// tsconfig.json - MANDATORY settings
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true
  }
}
```

**3. Define Interfaces for All Data Structures**

```typescript
// ✅ GOOD: Well-defined interfaces
interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
}

type UserRole = "customer" | "driver" | "admin";

interface TransactionQueryOptions {
  userId: string;
  limit?: number;
  offset?: number;
  type?: TransactionType;
  status?: TransactionStatus;
  startDate?: Date;
  endDate?: Date;
}

// Put in types/ directory for reuse
```

**4. Use Type Guards for Runtime Validation**

```typescript
// ✅ GOOD: Type guards for validation
function isUser(obj: unknown): obj is User {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "id" in obj &&
    "email" in obj &&
    "role" in obj
  );
}

// Usage
function processUser(data: unknown) {
  if (!isUser(data)) {
    throw new Error("Invalid user data");
  }
  // TypeScript now knows data is User type
  console.log(data.email);
}
```

**5. Use Generics for Reusable Code**

```typescript
// ✅ GOOD: Generic API response type
interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
  pagination?: PaginationMetadata;
}

// Usage
const userResponse: ApiResponse<User> = await fetchUser(id);
const ordersResponse: ApiResponse<Order[]> = await fetchOrders();
```

---

### TypeScript Preference

**ALWAYS use TypeScript for new code:**

✅ **Use TypeScript for:**

- All new components (`.tsx`)
- All new services (`.ts`)
- All new utilities (`.ts`)
- All new hooks (`.ts`)
- Type definitions in `types/` directory

❌ **Only use JavaScript (.js) when:**

- Modifying existing JavaScript files
- Quick fixes to legacy code

**TypeScript Standards:**

```typescript
// ✅ GOOD: Proper typing
interface UserData {
  id: string;
  name: string;
  email: string;
  primary_role: "customer" | "driver" | "admin";
}

const fetchUser = async (userId: string): Promise<UserData> => {
  // Implementation
};

// ❌ BAD: Using 'any'
const fetchUser = async (userId: any): Promise<any> => {
  // Don't do this
};
```

### Refactoring Guidelines

#### When to Refactor

- File exceeds 300 lines
- Function exceeds 50 lines
- Duplicated code appears 3+ times
- Complex nested logic (> 3 levels deep)
- Adding new features to large files

#### How to Refactor

1. **Extract Services**: Move business logic to `services/`
2. **Extract Utilities**: Move helper functions to `utils/`
3. **Extract Components**: Break down large components
4. **Extract Hooks**: Move stateful logic to custom hooks
5. **Extract Types**: Define interfaces/types in `types/`

#### Example: Refactoring `server.js`

```javascript
// ❌ BAD: Everything in server.js (6000+ lines)
app.post('/api/orders', async (req, res) => {
  // 100 lines of business logic
});

// ✅ GOOD: Separated into modules
// routes/orders.js
const orderService = require('../services/orderService');
router.post('/', orderController.createOrder);

// services/orderService.ts
export const createOrder = async (orderData: OrderData): Promise<Order> => {
  // Business logic here
};

// controllers/orderController.ts
export const createOrder = async (req: Request, res: Response) => {
  const order = await orderService.createOrder(req.body);
  res.json(order);
};
```

---

## 🧪 Testing Requirements (MANDATORY)

**EVERY new feature MUST include comprehensive tests at ALL levels.**

### Test Coverage Rules

1. **Required Test Types** (ALL MANDATORY)
   - **Unit Tests**: Test individual functions/methods in isolation
   - **Integration Tests**: Test API endpoints and database interactions
   - **BDD Tests**: Behavior-Driven Development tests (dual approach - see below)
   - **E2E Tests**: Test critical user flows end-to-end (highly recommended)

2. **Minimum Coverage**
   - New code: **80% coverage minimum**
   - Critical paths: **100% coverage** (auth, payments, orders, balance)
   - Bug fixes: MUST include regression test
   - No PR merged without tests

3. **Test File Structure**

   ```
   backend/
     services/
       balanceService.ts
       __tests__/
         balanceService.test.ts           # Unit tests
     routes/
       __tests__/
         balance.integration.test.ts      # Integration tests
     features/                             # BDD feature files
       balance/
         transaction-history.feature      # Shared feature file
       step-definitions/
         integration/                      # Backend/API steps
           balance_steps.ts
         ui/                               # Frontend/UI steps
           balance_steps.tsx

   frontend/
     components/
       TransactionList.tsx
       __tests__/
         TransactionList.test.tsx          # Component tests
     features/                              # BDD feature files (shared with backend)
       balance/
         transaction-history.feature       # Same as backend
       step-definitions/
         ui/
           balance_steps.tsx
   ```

---

### 🥒 Dual/Polymorphic BDD Testing (MANDATORY)

**For EVERY new feature, implement dual-layer BDD tests using SHARED feature files.**

#### Concept: One Feature File, Two Test Layers

The same `.feature` file is used for BOTH:

1. **Integration tests** (backend API testing)
2. **UI tests** (frontend browser testing)

This ensures behavior consistency across layers and catches integration issues early.

#### Example Structure:

**Shared Feature File:** `features/balance/transaction-history.feature`

```gherkin
# This file is used by BOTH backend integration tests AND frontend UI tests
Feature: Transaction History
  As a user
  I want to view my transaction history
  So I can track my balance changes

  Background:
    Given I am logged in as a "driver" user
    And I have the following transactions:
      | type      | amount | status    | created_at |
      | earnings  | 500    | completed | 2025-12-01 |
      | withdrawal| 200    | completed | 2025-12-15 |
      | deposit   | 100    | pending   | 2025-12-20 |

  @integration @ui
  Scenario: View recent transactions with pagination
    When I request my transaction history with limit 2
    Then I should see 2 transactions
    And the first transaction should be from "2025-12-20"
    And pagination should show total of 3 transactions
    And "hasMore" should be true

  @integration
  Scenario: Filter transactions by type (API only)
    When I request transactions filtered by type "earnings"
    Then I should receive 1 transaction
    And it should have type "earnings"
    And amount should be 500

  @ui
  Scenario: User sees loading state then transactions (UI only)
    When I navigate to the transactions page
    Then I should see a loading spinner
    And after loading completes I should see my transactions
    And I should see "500 EGP" in the first earnings row

  @integration @ui @security
  Scenario: Unauthorized users cannot access other users' transactions
    Given I am logged in as user "user1"
    When I try to access transactions for user "user2"
    Then I should receive a 403 Forbidden error
    # UI version: Then I should see "Unauthorized access" message
```

#### Integration Step Definitions (Backend/API)

**File:** `features/step-definitions/integration/balance_steps.ts`

```typescript
import { Given, When, Then } from "@cucumber/cucumber";
import request from "supertest";
import app from "../../../app";
import { expect } from "chai";

// Background steps
Given("I am logged in as a {string} user", async function (role: string) {
  this.user = await createTestUser({ role });
  this.token = await generateAuthToken(this.user);
});

Given("I have the following transactions:", async function (dataTable) {
  const transactions = dataTable.hashes();
  for (const tx of transactions) {
    await createTransaction({
      userId: this.user.id,
      type: tx.type,
      amount: parseFloat(tx.amount),
      status: tx.status,
      createdAt: new Date(tx.created_at),
    });
  }
});

// When steps (API calls)
When(
  "I request my transaction history with limit {int}",
  async function (limit: number) {
    this.response = await request(app)
      .get(`/api/v1/balance/${this.user.id}/transactions`)
      .query({ limit })
      .set("Authorization", `Bearer ${this.token}`)
      .expect(200);
  },
);

When(
  "I request transactions filtered by type {string}",
  async function (type: string) {
    this.response = await request(app)
      .get(`/api/v1/balance/${this.user.id}/transactions`)
      .query({ type })
      .set("Authorization", `Bearer ${this.token}`)
      .expect(200);
  },
);

When(
  "I try to access transactions for user {string}",
  async function (otherUserId: string) {
    this.response = await request(app)
      .get(`/api/v1/balance/${otherUserId}/transactions`)
      .set("Authorization", `Bearer ${this.token}`)
      .send();
  },
);

// Then steps (API assertions)
Then("I should see {int} transactions", function (count: number) {
  expect(this.response.body.data.transactions).to.have.lengthOf(count);
});

Then("the first transaction should be from {string}", function (date: string) {
  const firstTx = this.response.body.data.transactions[0];
  const txDate = new Date(firstTx.createdAt).toISOString().split("T")[0];
  expect(txDate).to.equal(date);
});

Then("I should receive a 403 Forbidden error", function () {
  expect(this.response.status).to.equal(403);
});
```

#### UI Step Definitions (Frontend/Browser)

**File:** `features/step-definitions/ui/balance_steps.tsx`

```typescript
import { Given, When, Then } from '@cucumber/cucumber';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect } from 'chai';
import TransactionHistory from '../../../src/components/TransactionHistory';

// Background steps (UI version - uses mocked API)
Given('I am logged in as a {string} user', async function(role: string) {
  this.user = createMockUser({ role });
  this.authContext = { user: this.user, token: 'mock-token' };
  setupMockAuth(this.user);
});

Given('I have the following transactions:', function(dataTable) {
  const transactions = dataTable.hashes().map(tx => ({
    type: tx.type,
    amount: parseFloat(tx.amount),
    status: tx.status,
    createdAt: new Date(tx.created_at)
  }));

  // Mock API response
  this.mockTransactions = transactions;
  setupMockAPI('/api/v1/balance/*/transactions', {
    success: true,
    data: {
      transactions: this.mockTransactions,
      pagination: { total: transactions.length, hasMore: false }
    }
  });
});

// When steps (UI interactions)
When('I request my transaction history with limit {int}', async function(limit: number) {
  // In UI context, this means component is rendered with that limit
  render(
    <AuthContext.Provider value={this.authContext}>
      <TransactionHistory limit={limit} />
    </AuthContext.Provider>
  );

  // Wait for API call to complete
  await waitFor(() => {
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
});

When('I navigate to the transactions page', async function() {
  render(
    <AuthContext.Provider value={this.authContext}>
      <TransactionHistory />
    </AuthContext.Provider>
  );
});

When('I try to access transactions for user {string}', async function(otherUserId: string) {
  // Mock 403 response
  setupMockAPI(`/api/v1/balance/${otherUserId}/transactions`, {
    status: 403,
    body: { error: 'Unauthorized access' }
  });

  render(
    <AuthContext.Provider value={this.authContext}>
      <TransactionHistory userId={otherUserId} />
    </AuthContext.Provider>
  );

  await waitFor(() => screen.getByText(/unauthorized/i));
});

// Then steps (UI assertions)
Then('I should see {int} transactions', async function(count: number) {
  const rows = await screen.findAllByRole('row');
  // -1 for header row
  expect(rows.length - 1).to.equal(count);
});

Then('I should see a loading spinner', function() {
  expect(screen.getByRole('progressbar')).toBeInTheDocument();
});

Then('after loading completes I should see my transactions', async function() {
  await waitFor(() => {
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
  expect(screen.getAllByRole('row').length).to.be.greaterThan(1);
});

Then('I should see {string} in the first earnings row', async function(expectedText: string) {
  const earningsRow = await screen.findByText(/earnings/i).then(el =>
    el.closest('tr')
  );
  expect(earningsRow).to.contain.text(expectedText);
});

Then('I should see {string} message', async function(message: string) {
  expect(await screen.findByText(new RegExp(message, 'i'))).toBeInTheDocument();
});
```

---

### BDD Testing Best Practices

#### 1. Tag Scenarios for Selective Running

```gherkin
@integration      # Run with backend integration tests
@ui              # Run with frontend UI tests
@security        # Security-related scenarios
@smoke           # Critical path scenarios
@wip             # Work in progress (skip in CI)
```

**Run specific tests:**

```bash
# Backend integration only
npm run test:bdd -- --tags '@integration and not @ui'

# UI tests only
npm run test:bdd:ui -- --tags '@ui'

# Security tests on both layers
npm run test:bdd:all -- --tags '@security'
```

#### 2. Shared Feature Files Location

```
/features/               # Root-level shared features
  auth/
    login.feature
    registration.feature
  balance/
    transaction-history.feature
    withdrawals.feature
  orders/
    create-order.feature
  step-definitions/
    integration/         # Backend steps
    ui/                  # Frontend steps
```

#### 3. Running BDD Tests

**package.json scripts:**

```json
{
  "scripts": {
    "test:bdd": "cucumber-js --require-module ts-node/register --require 'features/step-definitions/integration/**/*.ts'",
    "test:bdd:ui": "cucumber-js --require-module ts-node/register --require 'features/step-definitions/ui/**/*.tsx' --tags '@ui'",
    "test:bdd:all": "npm run test:bdd && npm run test:bdd:ui",
    "test:bdd:watch": "nodemon --exec npm run test:bdd",
    "test": "npm run test:unit && npm run test:integration && npm run test:bdd:all"
  }
}
```

---

### Testing Standards

2. **Minimum Coverage**
   - New code: 80% coverage minimum
   - Critical paths: 100% coverage (auth, payments, orders)
   - Bug fixes: MUST include regression test

3. **Test File Structure**

   ```
   backend/
     services/
       orderService.ts
       __tests__/
         orderService.test.ts

   frontend/
     components/
       OrderCard.tsx
       __tests__/
         OrderCard.test.tsx
   ```

### Testing Standards

#### Backend Tests (Jest + Supertest)

```typescript
// services/__tests__/orderService.test.ts
import { createOrder } from "../orderService";

describe("OrderService", () => {
  describe("createOrder", () => {
    it("should create order with valid data", async () => {
      const orderData = {
        /* ... */
      };
      const result = await createOrder(orderData);

      expect(result).toHaveProperty("id");
      expect(result.status).toBe("pending_bids");
    });

    it("should throw error for invalid data", async () => {
      await expect(createOrder({})).rejects.toThrow();
    });
  });
});
```

#### Frontend Tests (Jest + React Testing Library)

```typescript
// components/__tests__/OrderCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import OrderCard from '../OrderCard';

describe('OrderCard', () => {
  it('renders order details correctly', () => {
    const order = { id: '1', title: 'Test Order' };
    render(<OrderCard order={order} />);

    expect(screen.getByText('Test Order')).toBeInTheDocument();
  });

  it('calls onAccept when accept button clicked', () => {
    const onAccept = jest.fn();
    render(<OrderCard order={order} onAccept={onAccept} />);

    fireEvent.click(screen.getByText('Accept'));
    expect(onAccept).toHaveBeenCalledWith(order.id);
  });
});
```

#### API Integration Tests

```typescript
// routes/__tests__/orders.test.ts
import request from "supertest";
import app from "../../app";

describe("POST /api/orders", () => {
  it("creates order with authenticated user", async () => {
    const response = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${token}`)
      .send(orderData)
      .expect(201);

    expect(response.body).toHaveProperty("id");
  });

  it("returns 401 for unauthenticated request", async () => {
    await request(app).post("/api/orders").send(orderData).expect(401);
  });
});
```

### Test Checklist

Before submitting any code:

- [ ] Unit tests for new functions/methods
- [ ] Integration tests for API endpoints
- [ ] Component tests for UI changes
- [ ] Tests pass locally (`npm test`)
- [ ] Coverage meets minimum 80%
- [ ] Edge cases covered
- [ ] Error cases tested

---

## 📁 Project Structure Best Practices

### Backend Structure

```
backend/
├── routes/           # Route definitions (thin controllers)
├── controllers/      # Request handlers
├── services/         # Business logic
├── middleware/       # Custom middleware
├── models/           # Data models
├── utils/            # Helper functions
├── types/            # TypeScript types
├── __tests__/        # Integration tests
└── server.ts         # Entry point (< 200 lines)
```

### Frontend Structure

```
frontend/src/
├── components/       # React components
│   ├── layout/
│   ├── orders/
│   └── __tests__/
├── hooks/            # Custom hooks
├── services/         # API services
├── utils/            # Helper functions
├── types/            # TypeScript types
├── pages/            # Page components
└── App.tsx           # Main app (< 300 lines)
```

---

## 🎨 Design System & Theming

### Matrix Theme Requirements

**ALL UI components MUST use the Matrix cyberpunk/hacker theme.**

### Primary Style Files

1. **`frontend/src/MatrixTheme.css`** - Main Matrix theme
2. **`frontend/src/Mobile.css`** - Mobile-first responsive design
3. **`frontend/src/index.css`** - Base styles

### Matrix Color Palette (CSS Variables)

```css
--matrix-black: #000000;
--matrix-bright-green: #30ff30;
--matrix-green: #00ff00;
--matrix-border: #00aa00;
```

### Visual Requirements

- Dark backgrounds (`var(--matrix-black)`)
- Green text (`var(--matrix-bright-green)`)
- Glow effects (`text-shadow: var(--shadow-glow)`)
- Monospace fonts
- Mobile-first responsive design

---

## 🤖 Agent Autonomous Operation Rules

### Command Execution Principles

**ALWAYS operate autonomously unless at a decision crossroad:**

1. **Auto-Run Safe Commands**
   - **ALWAYS** set `SafeToAutoRun: true` for non-destructive commands
   - **NEVER** wait for approval on read-only operations (logs, file viewing, tests)
   - **ONLY** set `SafeToAutoRun: false` for destructive operations:
     - Deleting files/databases
     - Dropping tables
     - Modifying production data
     - Installing system packages

2. **Prefer Reusable Tools Over Shell Commands**
   - **USE** existing Node.js scripts instead of shell commands
   - **CREATE** reusable scripts for repetitive tasks
   - **AVOID** one-off PowerShell/bash commands

### Available Reusable Tools

#### Log Analysis

```bash
node scripts/analyze-logs.js
```

**Use instead of**: `Get-Content`, `Select-String`, `grep`
**Purpose**: Analyze backend logs for errors and patterns

#### Test Execution

```bash
node scripts/run-statistics-tests.js
```

**Use instead of**: Manual `jest` commands
**Purpose**: Run test suites with proper configuration

#### Server Management

```bash
node scripts/start-dev.js   # Start development servers
node scripts/stop-dev.js    # Stop development servers
```

**Use instead of**: Manual `npm start` commands

### Tool Creation Guidelines

**Create a new Node.js script when:**

1. A task will be repeated 2+ times
2. Shell commands become multi-step or complex
3. The operation needs error handling/formatting
4. Environment-specific logic is required

**Script Requirements:**

- Place in `scripts/` directory
- Use descriptive names (e.g., `analyze-logs.js`, not `script1.js`)
- Add shebang: `#!/usr/bin/env node`
- Document in this rules file
- Include error handling
- Provide clear output/feedback

### Decision Making

**Act autonomously on:**

- Bug fixes with clear solutions
- Test creation for fixed bugs
- Log analysis and reporting
- Running tests after changes
- Creating helper scripts
- Documentation updates

**Ask user only when:**

- Multiple valid approaches exist (crossroads)
- Business logic decisions needed
- Destructive operations required
- Requirements are ambiguous
- User preference matters (UI/UX choices)

### Workflow Example

```javascript
// ❌ BAD: Shell command requiring approval
run_command("Get-Content logs/error.log | Select-String 'error'", SafeToAutoRun: false)

// ✅ GOOD: Reusable tool, auto-run
run_command("node scripts/analyze-logs.js", SafeToAutoRun: true)
```

### Best Practices

1. **Check for existing tools first** before creating new ones
2. **Set SafeToAutoRun: true** for all safe operations
3. **Build reusable scripts** instead of one-off commands
4. **Document new tools** in this file immediately
5. **Keep scripts focused** on single responsibility
6. **Use existing tools** consistently (don't reinvent)

---

## ✅ Code Review Checklist

Before committing ANY code:

- [ ] Follows Single Responsibility Principle
- [ ] File is < 300 lines (refactor if not)
- [ ] Uses TypeScript for new code
- [ ] Has comprehensive tests (80%+ coverage)
- [ ] Tests pass locally
- [ ] Uses Matrix theme (UI components)
- [ ] Mobile responsive (UI components)
- [ ] No hardcoded values (use constants/env vars)
- [ ] Proper error handling
- [ ] Clear variable/function names
- [ ] Comments for complex logic
- [ ] No console.logs in production code

---

## 🤖 Agent Context & Handoff Protocols (MANDATORY)

**To ensure seamless collaboration between different AI agents and sessions, strictly follow these rules:**

### 1. Maintain Context Files (CRITICAL)

At the end of **EVERY** session or significant task completion, you **MUST** update the following files in the brain/artifact directory:

#### `activity_log.md`

- **Purpose**: A chronological record of actions taken, issues encountered, and decisions made.
- **Format**: Bulleted list with timestamps (or relative order).
- **Content**:
  - What started (User Request)
  - What was investigated (Findings)
  - What was changed (Files modified)
  - What was fixed/verified (outcomes)
  - Non-obvious blockers or environment quirks discovered.

#### `context.md`

- **Purpose**: A snapshot of the _current state_ of the project relative to the active task.
- **Content**:
  - **Current Goal**: What is the main objective right now?
  - **Recent Changes**: Summary of code changes.
  - **Active Issues**: What is currently broken or pending?
  - **Next Steps**: Explicit instructions for the next agent/session.
  - **Environment Notes**: Any transient states (e.g., "DB is currently dirty", "Server running on port 5000").

### 2. Handoff Procedure

Before finishing your turn or reporting "Task Complete":

1.  **Read** the current `context.md` (if it exists) to see what came before.
2.  **Update** `activity_log.md` with your contributions.
3.  **Overwrite/Update** `context.md` with the _new_ state, removing resolved issues and adding new ones.
4.  **Verify** that a future agent reading `context.md` has enough info to resume work immediately without re-investigating everything.

### 3. Artifact Usage

- **task.md**: Keep the checklist up-to-date. Mark items as `[x]` only when verified.
- **implementation_plan.md**: Create/update this _before_ making complex changes.
- **walkthrough.md**: Update this _after_ verification to prove success.

**FAILURE TO UPDATE THESE FILES LEADS TO MEMORY LOSS AND WASTED EFFORT.**
