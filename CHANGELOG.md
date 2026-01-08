# Changelog

## [Unreleased]

### Fixed

- **[2026-01-08]** Review submission null user_id error
  - Fixed `null value in column "user_id"` error preventing review submissions
  - Added missing `user_id` column to reviews INSERT statement in `orderService.js`
  - Removed dead code from `app.js` (shadowed review handler)
  - Verified with E2E tests (commit: `37c1961`)
  - See: [DOCS/FEATURES/order-review-system.md](DOCS/FEATURES/order-review-system.md)

### Documentation

- **[2026-01-08]** Added comprehensive order review system documentation
  - Database schema and column descriptions
  - API endpoints and request/response examples
  - Authorization rules and business logic
  - Implementation details and troubleshooting guide
  - Recent fix documentation with before/after code examples

## Previous Changes

For older changelog entries, see git commit history.
