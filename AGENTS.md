# Matrix Delivery — Agent Context

## Quick Facts

- **Stack**: React 18 + Express 4 + PostgreSQL 15 + Redis 7
- **Monorepo**: `/backend` (Express API), `/frontend` (React SPA), `/tests` (BDD + integration)
- **Lang**: JavaScript (legacy) + TypeScript (~40%, migrating)
- **Auth**: JWT (httpOnly cookie + Bearer), CSRF double-submit cookie
- **Real-time**: Socket.IO with Redis adapter
- **Testing**: Jest + Cucumber (BDD) + Playwright (E2E) + fast-check (property)
- **CI/CD**: GitHub Actions → PM2 (backend VPS) + Firebase Hosting (frontend)

## Key Conventions

- All rules in `.agent/rules.md` — read it before editing.
- i18n: `t('key')` via `useI18n()` context. 12 languages in `frontend/src/i18n/locales.js`.
- API client: use `services/api/` (TypeScript), NOT legacy `api.js`.
- DB: raw SQL via `pg` pool (parameterized). No ORM.
- Migrations in `backend/migrations/` (auto-applied on startup). Root `/migrations/` is untracked.

## Critical Architecture Notes

- `backend/app.js` (~3600 lines) and `frontend/src/App.js` (~4000 lines) are **monoliths** — refactor targets.
- Dual API clients exist (legacy `api.js` + modern `services/api/`). Use modern.
- 3x `verifyAdmin` implementations — consolidate into one.
- ~8 duplicate DB index pairs on balance_transactions/messages/balance_holds/location_updates.
- 30-day JWT expiry — too long; target 7d + refresh.

## Test Commands

```sh
npm run test:backend    # Jest backend
npm run test:frontend   # Jest frontend (CI)
npm run test:e2e        # Cucumber BDD
npm run lint            # ESLint
```

## Quick Links

- Full architectural review: `docs/architecture/ARCHITECTURAL_REVIEW.md`
- DB schema: `database/schema/schema.sql` (pg_dump)
- Backend entry: `backend/server.js` → `backend/app.js`
- Frontend entry: `frontend/src/index.js` → `frontend/src/App.js`
- PM2 config: `backend/ecosystem.config.js`
- Nginx config: `matrix-delivery-nginx.conf`
