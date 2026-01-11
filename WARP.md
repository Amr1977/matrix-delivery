# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project overview & key docs

Matrix Delivery ("Matrix Heroes") is a full-stack delivery and ride-hailing platform built with a React frontend, Node.js/Express backend, PostgreSQL, and heavy focus on security, testing, and BDD.

Key high-level docs you should skim before large changes:

- `README.md` – public project overview and basic structure.
- `AGENTS.md` – primary guide for AI coding assistants (architecture, testing strategy, conventions).
- `DOCS/PLANNING/REFACTORING_PLAN.md` – long-term refactor from monoliths (`backend/server.js`, `frontend/src/App.js`) into modular layers.
- `DOCS/ARCHITECTURE/ARCHITECTURE_ANALYSIS.md` – deeper analysis of current architecture and pain points.
- `DOCS/` under `PLANNING`, `LEARNING`, `API`, `ADR` – design docs, learning plans, and architecture decisions referenced from `AGENTS.md` and `.agent/rules.md`.
- `.agent/rules.md` – security-first, TypeScript-first, testing, and autonomous-agent rules (treat as binding project policy).

## Core commands

All commands below are intended to be run from the repo root unless noted.

### Install & environment

- Install root dependencies (Jest, Cucumber, tooling, shared deps):
  - `npm install`
- Install app dependencies (if needed):
  - Backend: `cd backend && npm install`
  - Frontend: `cd frontend && npm install`

### Backend: run, build, and test

Backend entrypoint is `backend/server.js` (large but being refactored into `routes/`, `controllers/`, `services/`, `middleware/`, `models/`). Use these commands during development:

From **repo root** (preferred wrappers):

- Start backend in dev mode (Express + nodemon):
  - `npm run dev` → runs `cd backend && npm run dev`
- Start backend in plain node (no nodemon):
  - `npm start` → runs `cd backend && node server.js`

From **`backend/`** (more granular):

- `npm run dev` – dev server with nodemon, Redis pre-start if available.
- `npm run start` – production-like start with memory flags.
- `npm run prod` – explicitly set `NODE_ENV=production` and start.

Backend Jest-based testing (from `backend/`):

- Run full backend test suite with coverage (Jest):
  - `npm test`
- Unit tests only:
  - `npm run test:unit`
- Integration tests (API/DB, run in-band):
  - `npm run test:integration`
  - DB-heavy focused: `npm run test:integration:db`
- Watch mode while working on backend code:
  - `npm run test:watch`
- Coverage report:
  - `npm run test:coverage`

Backend Jest single-test examples:

- By filename pattern:
  - `npm test -- --testPathPattern=orderService`
- By explicit path:
  - `npm test -- backend/__tests__/orders/orderService.test.ts`

Backend BDD (Cucumber, API-level):

- From `backend/` when Cucumber tests are wired there:
  - `npm run test:bdd` – run all backend BDD specs; see `features/` & `step-definitions/` under backend if present.

### Frontend: run, build, and test

Frontend is a CRA-based React app in `frontend/`, incrementally migrating to TypeScript.

Run dev UI server (from `frontend/`):

- Default dev server (localhost):
  - `npm start`
- LAN-accessible dev server (uses `.env.lan`):
  - `npm run start:lan`

Build variants (from `frontend/`):

- Generic production build (uses current `.env`):
  - `npm run build`
- Build against specific env files:
  - `npm run build:dev` – copy `.env.develop` → `.env`, build
  - `npm run build:lan` – copy `.env.lan` → `.env`, build
  - `npm run build:staging` – copy `.env.staging` → `.env`, build
  - `npm run build:test` – copy `.env.testing` → `.env`, build
  - `npm run build:prod` – generate git info, copy `.env.production` → `.env`, production build

Frontend tests (Jest + React Testing Library; from `frontend/`):

- Run frontend tests interactively:
  - `npm test`
- Run once with coverage (CI-like):
  - (via root) `npm run test:frontend:ci`
- Run build verification scripts:
  - `npm run test:build` – scripted build sanity checks.
  - `npm run test:build:quick` – build `production` and serve on port 3001 for manual smoke testing.

Frontend single-test examples (React Testing Library):

- By filename pattern (as in `README.md`/`AGENTS.md`):
  - `npm test -- --testPathPattern=BalanceDashboard`
  - `npm test -- --testPathPattern=balance`

### Root-level test workflows

The root `package.json` orchestrates combined test flows and Cucumber profiles.

Common root commands:

- Run **backend-only** unit tests (fast default):
  - `npm test` → alias for `npm run test:backend`
- Run backend unit tests explicitly:
  - `npm run test:backend`
- Run the full CI suite (backend unit, frontend CI tests, E2E BDD):
  - `npm run test:all`
  - CI entrypoint: `npm run test:ci`
- Frontend tests from root:
  - `npm run test:frontend` – one-off run of CRA tests.
  - `npm run test:frontend:ci` – frontend tests with coverage.

Jest from root (uses `tests/**/*.{test,spec}.{js,ts}`):

- All Jest tests matching root `jest` config:
  - `npm run test:backend`
- Single root Jest test file:
  - `npm run test:backend -- tests/unit/path/to/file.test.ts`

### BDD / E2E (Cucumber, Playwright)

Cucumber-based BDD is a core part of this repo. Feature files live under `tests/features/` with step definitions split by backend vs E2E.

Key root scripts:

- Full E2E suite (Cucumber, likely using Playwright/Puppeteer):
  - `npm run test:e2e` → `cross-env NODE_ENV=testing cucumber-js -c tests/cucumber.config.js`
- Backend/API-focused BDD using shared `.feature` files and `TEST_MODE=api`:
  - `npm run test:bdd:api`
- E2E UI-focused BDD using shared `.feature` files and `TEST_MODE=e2e`:
  - `npm run test:bdd:e2e`

Tag-based subsets (handy for narrowing to a feature area):

- `npm run test:map` – scenarios tagged `@map-location-picker`.
- `npm run test:auth` – scenarios tagged `@authentication`.
- `npm run test:orders` – scenarios tagged `@orders`.
- `npm run test:bidding` – scenarios tagged `@bidding`.

Debugging Cucumber runs:

- Run headed, not headless:
  - `npm run test:headed`
- Slower and fully headed for step debugging:
  - `npm run test:debug`

To run an arbitrary single scenario or tag set, mirror the patterns in these scripts using `--tags`, e.g. (from root):

- `npx cucumber-js -c tests/cucumber.config.js --tags "@some-tag"`

### Linting & formatting

Root ESLint is configured for JS/TS in both backend and frontend:

- Lint everything:
  - `npm run lint`
- Lint and auto-fix:
  - `npm run lint:fix`

Backend-only lint (from `backend/`):

- `npm run lint`

Pre-commit / pre-deploy checks:

- Full test gate used before deployment:
  - `npm run pre-deploy`
- Pre-commit style gate:
  - `npm run test:pre-commit`

### Logs and deployment helpers

Root scripts expose some reusable operational helpers:

- Sync production logs from remote (see script for details):
  - `npm run logs:sync`
- Analyze logs locally:
  - `npm run logs:analyze`
- Watch logs continuously:
  - `npm run logs:watch`
  - Manage watcher via pm2: `logs:watch:start`, `logs:watch:stop`, `logs:watch:restart`, `logs:watch:status`.

Deployment (PowerShell-based, see `scripts/deploy.ps1`):

- Full deploy with tests:
  - `npm run deploy`
- Targeted deploys:
  - `npm run deploy:backend`
  - `npm run deploy:frontend`
- Skip tests when explicitly requested:
  - `npm run deploy:skip-tests`
  - `npm run deploy:backend:skip-tests`

## High-level architecture & code structure

### Overall layout

Monorepo-style Node project:

- `backend/` – Node.js/Express API and real-time backend.
- `frontend/` – React SPA (CRA) for drivers/customers/admins.
- `tests/` – backend Jest tests and cross-cutting Cucumber features/config.
- `scripts/` – operational scripts (logs, deployment helpers, synthetic data, etc.).
- `DOCS/` – architecture, planning, learning, and API docs.
- `.agent/` – repo-specific rules for security, architecture, testing, TypeScript, and agent workflows.

The architecture pattern everywhere is **MVC + layered services**, plus a **dual-layer BDD** testing strategy.

### Backend architecture (Express + PostgreSQL + Socket.IO)

Backend is currently migrating from a large monolithic `backend/server.js` into a layered structure, as described in `AGENTS.md` and `.agent/rules.md`:

- **Entry point**: `backend/server.js` configures Express, middleware, database, sockets, and routes.
- **HTTP layer**:
  - `backend/routes/` – define HTTP endpoints and basic request wiring (kept thin).
  - `backend/controllers/` – map HTTP requests to service calls and handle high-level response shaping.
  - `backend/middleware/` – authentication/authorization, validation, rate limiting, logging, etc.
- **Business logic**:
  - `backend/services/` (goal state; some behavior may still live in controllers or `server.js`) – core domain logic like balance handling, order lifecycle, bidding, payments.
- **Data access**:
  - `backend/models/` – PostgreSQL-facing data models and query helpers, using parameterized SQL via `pg` or a query builder.
- **Real-time and infrastructure**:
  - Socket.IO server (with optional Redis adapter) for live order/bid updates, driver location, etc.
  - Redis-backed rate limiting, session-like caching and pub/sub channels.

Domain-wise, expect the following modules and concepts (see `AGENTS.md` and backend docs for concrete file paths):

- **Auth** – JWT-based login/registration, httpOnly cookie handling, role-based access.
- **Balance** – balance dashboard, deposits/withdrawals, transaction history, statements; tied to PostgreSQL tables and exposed via `/balance/*` routes.
- **Orders & bidding** – order creation, matching, bidding flow between drivers and customers, vehicle type constraints, pricing logic.
- **Payments** – Stripe/PayPal integrations and settlement flows.

Security is not an afterthought: `.agent/rules.md` defines detailed patterns for JWT handling, SQL injection prevention (parameterized queries only), rate limiting, helmet-based headers, strong CORS, and secure error handling. When touching backend code, treat these as non-negotiable architectural constraints.

### Frontend architecture (React + TypeScript-first)

Frontend is a CRA app evolving toward a well-typed, modular React architecture:

- **App shell**:
  - `frontend/src/App.js` – main app entry; currently large and subject to the same refactor plan as `server.js` (extract pages, routes, layout components).
- **UI composition** (approximate layout from `AGENTS.md`):
  - `frontend/src/components/` – reusable UI components.
    - Domain-focused subfolders such as `balance/`, `payments/`, `orders/`, etc.
  - `frontend/src/pages/` – page-level components mapped to routes.
  - `frontend/src/hooks/` – shared React hooks (e.g. `useBalance`, `useAuth`).
  - `frontend/src/services/` – API client modules (e.g. `services/api/client.ts`, `services/api/orders.ts`, `services/api/balance.ts`).
  - `frontend/src/types/` (goal) – shared TS types and interfaces.
- **Styling & theming** (see `.agent/rules.md`):
  - `frontend/src/MatrixTheme.css` – main “Matrix” cyberpunk theme.
  - `frontend/src/Mobile.css` – mobile-first layout and responsiveness.
  - `frontend/src/index.css` – base styles.

The design system requires:

- Dark backgrounds, bright green text/borders, and glow effects.
- Monospace-leaning typography and Matrix-like visual language.
- Mobile-first layouts for all new components.

When adding or modifying frontend code:

- Prefer **TypeScript `.tsx/.ts` for new files**; only touch `.js` for legacy changes.
- Keep file sizes modest and extract reusable logic into hooks/services.
- Use `data-testid` attributes per the conventions in `README.md`/`AGENTS.md` for anything that will be tested.

### Testing architecture (Jest + React Testing Library + Cucumber)

Testing is central to this repo and tightly coupled with architecture.

**Unit & integration tests (Jest):**

- Root Jest config lives in `package.json` and targets `tests/**/*.test.{js,ts}` and related patterns.
- Backend-specific Jest config/scripts are in `backend/package.json` (unit vs integration split, coverage, watch mode).
- Frontend uses CRA’s Jest setup plus React Testing Library, configured via `frontend/package.json` and `eslintConfig` in that file.

**Key testing conventions:**

- All testable UI elements should use `data-testid` selectors:
  - Patterns like `deposit-modal`, `balance-dashboard`, `available-balance-amount`, `continue-button`, etc.
  - Avoid `getByText` for assertions; use `getByTestId` to keep tests stable under localization.
- Component test structure generally follows nested `describe` blocks for Rendering / Interactions / States.

**BDD dual-mode strategy (critical):**

- Shared `.feature` files live under `tests/features/*.feature` and describe **behavior only**.
- Step definitions are split into two layers but consume the same features:
  - Backend/API steps – exercise the Express API and database directly.
  - Frontend/UI steps – exercise the React UI (Playwright/Puppeteer/RTL) with mocked or real backend.
- Root scripts `test:bdd:api`, `test:bdd:e2e`, plus tag-based scripts (`test:map`, `test:auth`, etc.) orchestrate which layer runs.

When implementing a new feature or changing behavior:

- Add/update a shared `.feature` file.
- Implement **both** backend and frontend step definitions for the same scenarios unless the scenario is explicitly tag-limited to one layer.
- Ensure Jest tests and BDD scenarios are aligned (Jest can cover internal behaviors; Cucumber asserts end-to-end flows).

## Repository-specific constraints and expectations

### Security-first policy

`.agent/rules.md` defines a detailed security policy which should drive backend and frontend design:

- Treat **all input as untrusted**; validate and sanitize on the server.
- Use **parameterized SQL** exclusively (no string-concatenated queries).
- Enforce **JWT-based auth** with httpOnly cookies, strong secrets, expirations, and role-based authorization checks on every sensitive route.
- Apply **helmet**, strict CORS, HSTS, rate limiting (especially on auth endpoints), and secure error responses (generic messages to clients, detailed logs server-side).
- Keep secrets in `.env` files (ignored by git), never hardcoded in code or logs.

Any change that touches authentication, authorization, payments, orders, or balance logic should be reviewed against the checklists in `.agent/rules.md`.

### TypeScript-first and clean architecture

From `.agent/rules.md` and `AGENTS.md`:

- New code **must be written in TypeScript** (`.ts`/`.tsx`); do not introduce new `.js` files.
- Avoid `any`; use proper interfaces, type guards, and generics.
- Keep files under the size guidelines (generally <300 lines; refactor large modules into `services/`, `utils/`, smaller components, or hooks).
- All non-trivial functions should have clear naming and, where appropriate, TSDoc-style comments, especially in shared services and backend modules.

### Testing & coverage expectations

- Every new feature should include **unit, integration, and BDD coverage** where applicable.
- Critical paths (auth, payments, balance, orders) are expected to have near-complete coverage; `.agent/rules.md` calls out an 80%+ target for new code and higher for core flows.
- Bug fixes should include regression tests.

When adding or modifying significant behavior, plan to:

- Add/extend Jest tests (backend and/or frontend).
- Add/extend Cucumber scenarios and step definitions.
- Run the relevant focused commands (e.g. `npm run test:backend`, a module-specific Jest pattern, or a tag-specific Cucumber command) before considering the change stable.

### Agent workflows & handoff

The `.agent/rules.md` file also defines expectations for autonomous agents working in this repo:

- Prefer **reusable Node scripts** in `scripts/` or existing npm scripts over ad-hoc shell commands, especially for logs, tests, and dev server orchestration.
- For multi-step or repeated operations, consider adding/updating a script under `scripts/` and wiring it into `package.json` rather than relying on long inline commands.
- When working as part of a multi-session AI workflow, keep any dedicated context or log files (such as `activity_log.md`, `context.md`, `task.md`, `implementation_plan.md`, `walkthrough.md` if present) up to date so a later agent can resume without re-discovering context.

These constraints are specific to this repository and should be treated as part of the contract when making architecture or code changes.
