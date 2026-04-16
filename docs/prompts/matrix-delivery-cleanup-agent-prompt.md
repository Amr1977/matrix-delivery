# Agent Task: Clean Up matrix-delivery GitHub Repository for Open-Source Launch

## Context

You are working on the GitHub repository: https://github.com/Amr1977/matrix-delivery

This is an open-source delivery & ride-hailing platform (React + Node.js + PostgreSQL).
The repo is being prepared for public launch. Your job is to clean it up so it looks
professional and trustworthy to new contributors and users.

You have been granted write access to this repository. Work on the `master` branch
unless instructed otherwise.

---

## STEP 1 — SAFETY CHECK (Do this before anything else)

### 1a. Scan for real user data in SQL dump files

Check the following files for any real user data (names, emails, phone numbers,
passwords, tokens, payment info, or any PII):

- `schema_with_data.sql`
- `schema_dump.sql`
- `schema_dump_neon.sql`
- `schema_dump_neon_clean.sql`
- `matrix_delivery_develop_schema.sql`
- `database_dump/` (entire folder)

**If any file contains real user data:**
- Remove the file from the repository entirely
- Add the filename to `.gitignore`
- Run `git filter-repo` or `BFG Repo Cleaner` to purge it from git history
- Report exactly which file(s) were affected and what type of data was found

**If files contain only schema/structure (no real data):**
- Move them all to a new folder: `database/schema/`
- Keep only the most recent/clean version; delete older duplicates
- Recommended: keep `matrix_delivery_develop_schema.sql` renamed to `database/schema/schema.sql`

---

## STEP 2 — Delete Internal Working Documents

These files are internal development notes that should not be public.
**Delete each of the following files from the repository:**

```
AUDIT-BACKEND.md
AUDIT-FRONTEND.md
FRONTEND_ERROR_FIX.md
REACT_ERROR_SOLUTION.md
P0-FIXES-SUMMARY.md
QUICK_FIX_INSTRUCTIONS.md
WARP.md
AGENTS.md
README_FAILOVER.md
patch_express.diff
patch_rate_limit.diff
```

After deleting, commit with message:
```
chore: remove internal working documents before open-source launch
```

---

## STEP 3 — Move Root-Level Debug Scripts to scripts/

The following files are one-off debug/dev scripts that do not belong in the root.
Move them all to `scripts/db/` (create the folder if it doesn't exist):

```
check_migrations.js
check_table_structure.js
find_balance_column.js
fix_controller.js
list_users.js
list_users_enhanced.js
mark_migrations_applied.js
promote_to_admin.js
reproduce_issue.js
run_fsm_migration.js
temp-test.js
temp_append.js
test-basic.js
test-cors.js
test-cors-local.js
test_db.js
test_db_connection.js
```

Also move these test result/config files if they're not needed at the root:
```
test-results.json
test-suites.json
```
→ Move to `scripts/db/` or delete if they are stale output files.

After moving, commit with message:
```
chore: move debug scripts from root to scripts/db/
```

---

## STEP 4 — Delete Junk / Backup Files

Delete these backup and noise files:

```
.gitignore.bak-20260310-131843
.gitignore.bak-20260310-132153
.gitignore.bak-20260310-132718
```

Commit with message:
```
chore: delete .gitignore backup files
```

---

## STEP 5 — Consolidate SQL Schema Files

After Step 1, if SQL files remain and were moved to `database/schema/`:

1. Review and keep only the most up-to-date clean schema file.
2. Rename it to `database/schema/schema.sql`.
3. Add a `database/schema/README.md` with this content:

```markdown
# Database Schema

This folder contains the PostgreSQL schema for the Matrix Heroes platform.

## schema.sql

The canonical schema file. To initialize a fresh database:

```bash
psql -U your_db_user -d your_db_name -f database/schema/schema.sql
```

See the root `.env.example` for database configuration options.
```

Commit with message:
```
chore: consolidate schema files into database/schema/
```

---

## STEP 6 — Add Missing docker-compose.yml

The README references `docker-compose up` but no `docker-compose.yml` exists.

Create a `docker-compose.yml` at the root with this content:

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=development
    env_file:
      - .env
    depends_on:
      - db
      - redis
    volumes:
      - ./backend:/app
      - /app/node_modules

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_API_URL=http://localhost:5000
    depends_on:
      - backend
    volumes:
      - ./frontend:/app
      - /app/node_modules

  db:
    image: postgres:15-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: matrix
      POSTGRES_USER: matrix_user
      POSTGRES_PASSWORD: matrix_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/schema/schema.sql:/docker-entrypoint-initdb.d/schema.sql

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

Commit with message:
```
feat: add docker-compose.yml for local development
```

---

## STEP 7 — Create ROADMAP.md

The README references `ROADMAP.md` but it doesn't exist. Create it at the root:

```markdown
# Roadmap

This document outlines the planned milestones and features for the Matrix Heroes platform.

## Current Status: v1.0 (Stable)

Core delivery and ride-hailing functionality is live at matrix-delivery.com.

---

## Near-term (v1.1)

- [ ] Driver earnings dashboard improvements
- [ ] Multi-language support (i18n) — Arabic, French
- [ ] Mobile-responsive UI improvements
- [ ] Improved onboarding flow for new heroes (drivers)

## Medium-term (v1.2)

- [ ] Public API for third-party integrations
- [ ] Driver rating and review system
- [ ] Scheduled delivery bookings
- [ ] Zone-based surge pricing controls

## Long-term (v2.0)

- [ ] Native mobile apps (iOS + Android via React Native / Capacitor)
- [ ] Decentralized driver co-op governance tools
- [ ] Marketplace for hero services
- [ ] White-label / self-hosted deployment wizard

---

## Completed

- [x] Core delivery platform
- [x] Ride-hailing integration
- [x] Real-time WebSocket tracking
- [x] Redis-based failover architecture
- [x] PostgreSQL database with migrations
- [x] Push notifications (Firebase)
- [x] Open-source release

---

Want to influence the roadmap? Open a [GitHub Discussion](https://github.com/Amr1977/matrix-delivery/discussions)
or upvote existing feature requests in [Issues](https://github.com/Amr1977/matrix-delivery/issues).
```

Commit with message:
```
docs: add ROADMAP.md
```

---

## STEP 8 — Tag an Initial Release

Create a git tag for the initial open-source release:

```bash
git tag -a v1.0.0 -m "Initial open-source release"
git push origin v1.0.0
```

Then create a GitHub Release on the tag with:
- **Title:** `v1.0.0 — Initial Open Source Release`
- **Body:**
```
🎉 Matrix Heroes is now open source!

This is the first public release of the Matrix Heroes delivery and ride-hailing platform.

### What's included
- Full delivery management system
- Ride-hailing support
- Real-time WebSocket tracking
- Redis-based failover architecture
- Admin dashboard
- React frontend + Node.js/Express backend
- PostgreSQL database

### Getting started
See the [README](https://github.com/Amr1977/matrix-delivery#readme) for setup instructions.
```

---

## STEP 9 — Final Verification Checklist

After all steps are complete, confirm:

- [ ] No real user data exists anywhere in the repository or git history
- [ ] Root folder contains only project-relevant files (no debug scripts)
- [ ] All internal working docs are deleted
- [ ] `.gitignore.bak` files are deleted
- [ ] `docker-compose.yml` is present and valid
- [ ] `ROADMAP.md` is present
- [ ] SQL schema files are consolidated in `database/schema/`
- [ ] `v1.0.0` release tag exists on GitHub
- [ ] All commits have clear, conventional commit messages

---

## Commit Summary (in order)

1. `chore: remove internal working documents before open-source launch`
2. `chore: move debug scripts from root to scripts/db/`
3. `chore: delete .gitignore backup files`
4. `chore: consolidate schema files into database/schema/`
5. `feat: add docker-compose.yml for local development`
6. `docs: add ROADMAP.md`

Then tag: `v1.0.0`

---

## Notes for the Agent

- Do not modify any application source code (`backend/`, `frontend/`, `android/`)
- Do not change `README.md`, `CONTRIBUTING.md`, `LICENSE.md`, `SECURITY.md`, or `CODE_OF_CONDUCT.md`
- If you are unsure whether a file contains sensitive data, flag it for human review rather than deleting it
- Always check `.gitignore` to make sure deleted sensitive files are listed there to prevent re-commit
