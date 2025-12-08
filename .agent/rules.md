# Matrix Delivery Project Rules

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
  role: 'customer' | 'driver' | 'admin';
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

### Test Coverage Rules
**EVERY feature and bug fix MUST include comprehensive tests:**

1. **Required Test Types**
   - **Unit Tests**: Test individual functions/methods
   - **Integration Tests**: Test API endpoints and component interactions
   - **E2E Tests**: Test critical user flows (optional but recommended)

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
import { createOrder } from '../orderService';

describe('OrderService', () => {
  describe('createOrder', () => {
    it('should create order with valid data', async () => {
      const orderData = { /* ... */ };
      const result = await createOrder(orderData);
      
      expect(result).toHaveProperty('id');
      expect(result.status).toBe('pending_bids');
    });

    it('should throw error for invalid data', async () => {
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
import request from 'supertest';
import app from '../../app';

describe('POST /api/orders', () => {
  it('creates order with authenticated user', async () => {
    const response = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send(orderData)
      .expect(201);

    expect(response.body).toHaveProperty('id');
  });

  it('returns 401 for unauthenticated request', async () => {
    await request(app)
      .post('/api/orders')
      .send(orderData)
      .expect(401);
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
--matrix-bright-green: #30FF30;
--matrix-green: #00FF00;
--matrix-border: #00AA00;
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

