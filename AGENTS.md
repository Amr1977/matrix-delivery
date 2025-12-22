# Matrix Delivery Platform - AI Agent Guide

> **Purpose**: This document provides context and guidelines for AI coding assistants working on the Matrix Delivery project.

---

## 📋 Project Overview

**Matrix Delivery** (also known as Matrix Heroes) is an open-source delivery and ride-hailing platform that empowers drivers and customers through fair, transparent, and decentralized mobility services.

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React (JavaScript/TypeScript) |
| Backend | Node.js (Express) |
| Database | PostgreSQL |
| Testing | Jest + React Testing Library |
| Hosting | Firebase (Frontend), VPS (Backend) |

### Architecture
- **Pattern**: Model-View-Controller (MVC)
- **Frontend**: Component-based React architecture
- **Backend**: RESTful API with Express routes/controllers/models
- **Real-time**: Socket.IO for live updates

> [!IMPORTANT]
> **Refactoring in Progress**: The project is undergoing a comprehensive architectural refactoring to address monolithic code issues. See [docs/REFACTORING_PLAN.md](docs/REFACTORING_PLAN.md) for details.

**Current Architectural Issues**:
- `backend/server.js`: 6,009 lines (being refactored)
- `frontend/src/App.js`: 2,921 lines (being refactored)
- See [docs/ARCHITECTURE_ANALYSIS.md](docs/ARCHITECTURE_ANALYSIS.md) for full analysis

---

## 🗂️ Project Structure

```
matrix-delivery/
├── backend/
│   ├── server.js                 # Main server entry point
│   ├── routes/                   # API route definitions
│   ├── controllers/              # Business logic
│   ├── models/                   # Database models
│   └── middleware/               # Auth, validation, etc.
├── frontend/
│   ├── src/
│   │   ├── App.js               # Main app component
│   │   ├── components/          # Reusable components
│   │   │   ├── balance/         # Balance management module
│   │   │   ├── payments/        # Payment components
│   │   │   └── ...
│   │   ├── hooks/               # Custom React hooks
│   │   ├── services/            # API clients
│   │   └── pages/               # Page components
│   └── public/
└── docs/
```

---

## 🎯 Key Modules

### 1. Balance Management (`frontend/src/components/balance/`)
**Purpose**: Handle driver/customer balance, deposits, withdrawals, transactions, and statements.

**Components**:
- `BalanceDashboard.tsx` - Main balance overview
- `DepositModal.tsx` - Deposit flow (multi-step)
- `WithdrawalModal.tsx` - Withdrawal flow (multi-step)
- `TransactionHistory.tsx` - Transaction list with filters
- `BalanceStatement.tsx` - Generate/download statements

**Key Features**:
- Multi-step modals with validation
- Real-time balance updates
- Transaction filtering and search
- PDF/CSV statement generation
- Driver vs customer role differences

### 2. Authentication
- JWT-based authentication
- Secure httpOnly cookies (migrated from localStorage)
- Role-based access control (customer, driver, admin)

### 3. Order Management
- Bidding system between drivers and customers
- Real-time order tracking
- 25+ vehicle types support

---

## 💻 Development Guidelines

### Code Conventions

#### TypeScript/JavaScript
```typescript
// ✅ CRITICAL: Always prefer TypeScript (.ts/.tsx) for NEW files
// Use JavaScript (.js) only when editing existing legacy files.

interface BalanceProps {
  userId: number;
  userRole: 'customer' | 'driver';
}

// ✅ Use functional components with hooks
const BalanceDashboard: React.FC<BalanceProps> = ({ userId, userRole }) => {
  const { balance, loading } = useBalance(userId);
  // ...
};

// ...
```

#### File Naming
- Components: `PascalCase.tsx`
- Hooks: `camelCase.ts`
- Tests: `ComponentName.test.tsx`
- Utilities: `camelCase.ts`

---

## 🤖 Agent Communication Standards

When generating responses, Agents must:
1.  **Header**: Start every response with the Model Name and Date/Time on a separate line.
    *   Example: `Model: Claude 3.5 Sonnet | Date: 2025-12-22 10:00:00`
2.  **Conciseness**: Keep artifacts and summaries brief.
3.  **Transparency**: Explicitly state tool usage and rationale.

---

#### Component Structure
```tsx
// 1. Imports
import React, { useState, useEffect } from 'react';
import { useBalance } from '../../hooks/useBalance';

// 2. Types/Interfaces
interface Props { ... }

// 3. Component
const MyComponent: React.FC<Props> = ({ ... }) => {
  // 4. Hooks
  const [state, setState] = useState();
  const { data } = useCustomHook();
  
  // 5. Effects
  useEffect(() => { ... }, []);
  
  // 6. Handlers
  const handleClick = () => { ... };
  
  // 7. Render
  return ( ... );
};

// 8. Export
export default MyComponent;
```

---

## 🧪 Testing Requirements

### Critical: Test ID Convention

**All testable elements MUST use `data-testid` attributes for i18n-ready testing.**

#### Naming Patterns

| Pattern | Example | Usage |
|---------|---------|-------|
| `{component}-{element}` | `deposit-modal`, `balance-dashboard` | Component containers |
| `{action}-button` | `continue-button`, `confirm-deposit-button` | Action buttons |
| `{data}-{type}` | `available-balance-amount`, `current-balance-value` | Data displays |
| `{state}-{element}` | `loading-spinner`, `error-message` | State indicators |
| `{collection}-{item}` | `transactions-list`, `transaction-row` | Lists and items |

#### Test Writing Guidelines

```tsx
// ✅ GOOD - Use test IDs
expect(screen.getByTestId('deposit-button')).toBeInTheDocument();
expect(screen.getByTestId('available-balance-amount')).toHaveTextContent('5000.00 EGP');
fireEvent.click(screen.getByTestId('continue-button'));

// ❌ BAD - Avoid text-based selectors (breaks with localization)
expect(screen.getByText('Deposit')).toBeInTheDocument();
fireEvent.click(screen.getByText('Continue'));

// ⚠️ EXCEPTION - Use getByLabelText only for dynamic form fields without test IDs
expect(screen.getByLabelText('Account Holder Name')).toBeInTheDocument();
```

#### Test Structure
```tsx
describe('ComponentName', () => {
  // Setup
  beforeEach(() => { /* mock setup */ });
  afterEach(() => { jest.clearAllMocks(); });
  
  describe('Rendering', () => {
    test('renders main elements', () => { ... });
  });
  
  describe('Interactions', () => {
    test('handles button click', () => { ... });
  });
  
  describe('States', () => {
    test('shows loading state', () => { ... });
    test('shows error state', () => { ... });
  });
});
```

### Running Tests
```bash
# Run all tests
npm test

# Run specific module
npm test -- --testPathPattern=balance

# Run with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

---

## 🧪 BDD Dual-Mode Testing Strategy

We follow a **BDD-First** approach where every feature is defined in Gherkin first, then implemented and tested in two modes:

### 1. Structure
```
tests/features/*.feature          # Source of truth (Behavior)
tests/step_definitions/
├── backend/                      # Integration Tests
│   └── *_steps.js                # Direct Service/DB calls
└── frontend/                     # UI Automation Tests
    └── *_steps.js                # Playwright Browser Automation
```

### 2. Workflow
1.  **Define Feature**: Create/Update `tests/features/my_feature.feature`.
2.  **Implement Backend**: Write `tests/step_definitions/backend/my_feature_steps.js`.
    *   Goal: Verify business logic, DB constraints, and API responses.
    *   Run: `npx cucumber-js -p backend`
3.  **Implement Frontend**: Write `tests/step_definitions/frontend/my_feature_steps.js`.
    *   Goal: Verify UI flows, dashboard rendering, and user notifications.
    *   Run: `npx cucumber-js -p frontend`

### 3. Mandates
*   **Dual Coverage**: All new features MUST have both backend and frontend step definitions.
*   **Shared Feature Files**: Do NOT create separate feature files for backend vs frontend. The *same* scenarios must run in both modes.
*   **Mocking**:
    *   Backend steps should interact with the *real* test database.
    *   Frontend steps should ideally use the same test database or mock API responses if necessary (prefer full stack testing when possible).

---

## 🎨 UI/UX Patterns

### Modal Pattern
All modals follow a consistent multi-step pattern:
1. **Amount/Input Step** - User enters data with validation
2. **Confirmation Step** - Review and confirm
3. **Processing Step** - Loading state
4. **Success/Error Step** - Final result

**Key Elements**:
- Close button (X) - `close-button`
- Back button - `back-button`
- Continue button - `continue-button`
- Cancel button - `cancel-button`
- Confirm button - `confirm-{action}-button`

### State Management
- Use `useState` for local component state
- Use custom hooks (`useBalance`, `useAuth`) for shared state
- Use `useEffect` for side effects and data fetching

### Error Handling
```tsx
// Always provide user-friendly error messages
{error && (
  <div data-testid="error-message" className="error">
    {error}
    <button data-testid="retry-button" onClick={handleRetry}>
      Retry
    </button>
  </div>
)}
```

---

## 🔐 Security Practices

1. **Authentication**
   - Use httpOnly cookies for tokens (NOT localStorage)
   - Validate JWT on every protected route
   - Implement role-based access control

2. **Input Validation**
   - Validate all user inputs on both frontend and backend
   - Sanitize data before database operations
   - Use parameterized queries to prevent SQL injection

3. **API Security**
   - CORS configuration for allowed origins
   - Rate limiting on sensitive endpoints
   - Proper error messages (don't leak sensitive info)

---

## 🌍 Internationalization (i18n)

### Current Status
- **Balance Module**: ✅ Fully i18n-ready with test IDs
- **Other Modules**: ⏳ In progress

### When Adding New Components
1. Add `data-testid` to all interactive elements
2. Avoid hardcoded text in test assertions
3. Use test IDs instead of text-based selectors
4. Follow naming conventions from Testing section

---

## 🚀 Common Tasks

### Adding a New Balance Component
1. Create component in `frontend/src/components/balance/`
2. Add comprehensive `data-testid` attributes
3. Create corresponding test file
4. Update `useBalance` hook if needed
5. Add to `BalancePages.tsx` if it's a page

### Updating API Endpoints
1. Update route in `backend/routes/`
2. Update controller in `backend/controllers/`
3. Update model if schema changes
4. Update frontend API client in `frontend/src/services/api/`
5. Update tests

### Adding New Tests
1. Follow test ID conventions
2. Mock `useBalance` hook for balance components
3. Test all states: loading, error, success, empty
4. Test user interactions with `fireEvent`
5. Use `waitFor` for async operations

---

## ⚠️ Common Pitfalls

### 1. Text-Based Test Selectors
```tsx
// ❌ DON'T - Breaks with localization
fireEvent.click(screen.getByText('Submit'));

// ✅ DO - Use test IDs
fireEvent.click(screen.getByTestId('submit-button'));
```

### 2. Missing Test IDs
```tsx
// ❌ DON'T
<button onClick={handleClick}>Submit</button>

// ✅ DO
<button data-testid="submit-button" onClick={handleClick}>
  Submit
</button>
```

### 3. Inconsistent Naming
```tsx
// ❌ DON'T - Inconsistent
<button data-testid="btn-submit">Submit</button>
<button data-testid="cancelButton">Cancel</button>

// ✅ DO - Follow convention
<button data-testid="submit-button">Submit</button>
<button data-testid="cancel-button">Cancel</button>
```

### 4. Not Mocking Hooks
```tsx
// ❌ DON'T - Tests will fail
import { useBalance } from '../../../hooks/useBalance';

// ✅ DO - Mock the hook
jest.mock('../../../hooks/useBalance');
const mockUseBalance = useBalance as jest.MockedFunction<typeof useBalance>;
mockUseBalance.mockReturnValue({ balance: mockData, ... });
```

---

## 📚 Key Files Reference

### Frontend
- `frontend/src/App.js` - Main application entry
- `frontend/src/hooks/useBalance.ts` - Balance state management
- `frontend/src/services/api/balance.ts` - Balance API client
- `frontend/src/components/balance/` - Balance module components

### Backend
- `backend/server.js` - Server entry point
- `backend/routes/balance.js` - Balance API routes
- `backend/controllers/balanceController.js` - Balance business logic
- `backend/models/Balance.js` - Balance database model

### Configuration
- `frontend/package.json` - Frontend dependencies
- `backend/package.json` - Backend dependencies
- `.env` - Environment variables (not in git)

### Documentation
- `docs/REFACTORING_PLAN.md` - Test-first refactoring strategy (12-week plan)
- `docs/ARCHITECTURE_ANALYSIS.md` - Comprehensive architectural review
- `docs/README.md` - Documentation index

---

## 🔄 Git Workflow

### Commit Message Format
```
type: brief description

Detailed explanation if needed

Examples:
- feat: add withdrawal modal with multi-step flow
- fix: resolve validation error in deposit form
- refactor: update BalanceDashboard tests to use test IDs
- docs: add test ID conventions to README
- test: add missing test cases for TransactionHistory
```

### Types
- `feat` - New feature
- `fix` - Bug fix
- `refactor` - Code refactoring
- `docs` - Documentation
- `test` - Test updates
- `chore` - Maintenance tasks

---

## 🎯 Current Priorities

1. **Refactoring** - Establish comprehensive test coverage before refactoring monolithic files
2. **I18n Readiness** - Ensure all components use test IDs
3. **Test Coverage** - Achieve 85% backend, 80% frontend coverage
4. **Security** - httpOnly cookies, input validation
5. **Performance** - Optimize database queries, lazy loading
6. **Documentation** - Keep this file updated as the project evolves

---

## 📚 Learning Resources

### Free Learning Library

We maintain a comprehensive collection of **100% FREE learning resources** for mastering this project:

**Quick Access**:
- ⭐ **[INTENSIVE STUDY PLAN](file:///d:/matrix-delivery/docs/INTENSIVE_STUDY_PLAN.md)** - 8h/day, 21-day program
- 📖 [Complete Free Resources Guide](file:///d:/matrix-delivery/docs/FREE_RESOURCES_ONLY.md)
- 📥 [Download Script](file:///d:/matrix-delivery/scripts/download-free-learning-resources.ps1)
- 📋 [All Resources (Paid + Free)](file:///d:/matrix-delivery/docs/CLEAN_CODE_STARTUP_RESOURCES.md)
- 📚 [Docs README](file:///d:/matrix-delivery/docs/README.md)

### Download All Resources

Run this command to download ~2-3 GB of free learning materials:

```powershell
cd d:\matrix-delivery\scripts
.\download-free-learning-resources.ps1
```

**What You'll Get** ($500+ value, 100% FREE):
- 🔐 **Security Engineering** (1,000-page textbook)
- 🧪 **BDD/TDD** (Cucumber, Jest, Testing Best Practices)
- 📚 **Clean Code** (JavaScript, TypeScript, Refactoring)
- 📊 **Project Management** (Shape Up, Getting Real, Scrum)
- 🚀 **Startup Resources** (Indie Hackers, YC Startup School)
- 📖 **Node.js/JavaScript** (You Don't Know JS, Best Practices)
- ⚛️ **React** (Official Docs, TypeScript Cheatsheet)
- 🏗️ **Architecture** (System Design Primer, Design Patterns)
- 🗄️ **PostgreSQL** (Official Docs, Awesome Postgres)
- 📚 **1,000+ Free Programming Books**

### Recommended Learning Path

**Month 1: Security & Testing** (Critical for production)
1. OWASP Top 10 + API Security Top 10
2. Security Engineering (Chapters 1-5)
3. Cucumber Documentation
4. JavaScript Testing Best Practices
5. Practice: OWASP Juice Shop

**Month 2: Code Quality & Architecture**
1. Clean Code JavaScript + TypeScript
2. You Don't Know JS (Scope, this, Async)
3. TypeScript Deep Dive
4. System Design Primer
5. Node.js Best Practices

**Month 3: Project Management & Growth**
1. Shape Up (6-week cycles)
2. Getting Real (Lean development)
3. React Documentation
4. Indie Hackers (Founder stories)
5. Apply: Implement learnings in Matrix Delivery

### Key Resources by Topic

**For Current BDD Refactoring**:
- Cucumber Official Docs
- JavaScript Testing Best Practices
- Jest Documentation
- Playwright Documentation

**For Security Hardening**:
- OWASP Cheat Sheet Series
- Security Engineering (Free PDF)
- Node.js Security Best Practices
- OWASP Testing Guide

**For TypeScript Migration**:
- TypeScript Deep Dive (Free book)
- Clean Code TypeScript
- React TypeScript Cheatsheet

**For Solo Development**:
- Shape Up (Project management)
- Indie Hackers (Revenue strategies)
- Startup School (Product-market fit)

### Study Tips

1. **Daily Habit**: 1 hour/day = complete in 3 months
2. **Apply Immediately**: Implement learnings in this codebase
3. **Use Obsidian**: Organize notes and create knowledge graph
4. **Practice**: Use OWASP Juice Shop for security testing
5. **Community**: Join Indie Hackers, r/webdev, r/node

---

*Last Updated: 2025-12-22*

---

## 💡 Best Practices Summary

✅ **DO**:
- Use TypeScript for new components
- Add `data-testid` to all testable elements
- Follow naming conventions
- Write comprehensive tests
- Mock external dependencies
- Handle loading/error states
- Validate user inputs
- Use semantic HTML
- Keep components focused and reusable

❌ **DON'T**:
- Use text-based test selectors
- Hardcode text in tests
- Skip error handling
- Store tokens in localStorage
- Commit sensitive data
- Create overly complex components
- Ignore TypeScript errors
- Skip test coverage

---

## 📞 Getting Help

- **README.md** - Project overview and setup
- **Testing Guide** - Detailed testing documentation
- **Test ID Migration Guide** - Complete test ID reference
- **GitHub Issues** - Report bugs or request features

---

**Last Updated**: December 20, 2025  
**Version**: 1.1  
**Maintained by**: Matrix Delivery Team
