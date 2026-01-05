---
description: Standard workflow for implementing production-ready fixes and features
---

# Production-Ready Fix Workflow

Follow this workflow for every fix or feature to ensure production readiness and prevent regressions.

## 1. Database Changes

If your change involves schema modifications:

1.  **NEVER** modify an existing migration file.
2.  **ALWAYS** create a new `.sql` migration file in `backend/migrations/` with a timestamp prefix (e.g., `YYYYMMDD_description.sql`).
3.  **VERIFY** the migration by running `node backend/setup-test-db.js`. This script now automatically applies all migrations to the test database.

## 2. Backend Implementation

1.  Implement the fix/feature in the codebase.
2.  Ensure all SQL queries match the current schema.
3.  Use `safeDelete` patterns in test cleanup logic if tables might be missing or renamed.

## 3. Test Updates

1.  **Unit Tests:** Update or add Jest unit tests (`npm run test:backend`).
2.  **BDD API Tests:** Update Cucumber steps if API contracts change. Ensure `test:bdd:api` passes.
3.  **E2E Tests:** Update Playwright scenarios if UI flows change.

## 4. Verification Checklist

Before marking a task as complete, verify:

- [ ] `npm run test:backend` passes (Unit Tests).
- [ ] `npm run test:bdd:api` passes (API Contract/Flow Tests).
- [ ] `npm run test:e2e` passes (End-to-End User Flow Tests).
- [ ] No console errors or "relation does not exist" logs in the test output.

## 5. Artifacts

1.  Update `task.md` to reflect completed items.
2.  Update `walkthrough.md` with proof of verification (screenshots or logs).
