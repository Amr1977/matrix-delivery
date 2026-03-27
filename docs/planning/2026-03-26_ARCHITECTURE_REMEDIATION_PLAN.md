# Architecture Remediation Plan (Phased, No Rewrite)

Date: 2026-03-26  
Scope: Matrix Delivery platform (backend + frontend + database lifecycle)  
Strategy: Strangler refactor with strict safety gates, not a full rebuild

## 1) Program Intent

Modernize architecture safely while preserving delivery velocity and production stability.

Primary hotspots:
- `backend/app.js`
- `frontend/src/App.js`
- `backend/database/startup.js`
- `backend/server.js`

## 2) Program Outcomes

- Eliminate duplicated route ownership and startup drift.
- Enforce one database evolution model.
- Decompose monolithic app layers into testable modules.
- Improve security, observability, and release confidence.

## 3) Phase Plan (16 Weeks)

## Phase 0: Program Setup (Week 1)
Objective:
- Lock scope and architecture target.

Deliverables:
- ADR pack (target boundaries, migration order, non-goals).
- Risk register and mitigation ownership.
- Branch and release policy.

Exit Criteria:
- Architecture target approved.
- Module migration sequence approved.

## Phase 1: Safety Net First (Weeks 2-3)
Objective:
- Build reliable protection against regressions.

Deliverables:
- CI quality gates for unit, contract, smoke.
- Contract tests for `auth`, `orders`, `admin`.
- Baseline coverage and flaky-test list.

Exit Criteria:
- Required gates block merges on failure.
- Reproducible test run from clean clone.

KPIs:
- 100% PRs run required checks.
- No untested changes in critical modules.

## Phase 2: Bootstrap and Config Unification (Week 4)
Objective:
- Remove startup/config duplication and side effects.

Deliverables:
- Single env loading path.
- Single DB initialization entrypoint.
- Consistent logging (replace ad-hoc console output where needed).

Exit Criteria:
- One authoritative app/bootstrap lifecycle.

KPIs:
- Zero duplicated env-load logic.
- No hidden side effects during module import.

## Phase 3: Backend Strangler Step 1 (Weeks 5-7)
Objective:
- Remove route duplication and clarify ownership.

Deliverables:
- `orders` and `admin` served by dedicated route/controller/service paths only.
- Inline legacy handlers removed after parity tests pass.
- API behavior parity report.

Exit Criteria:
- Singular owner for each endpoint.
- No duplicate route execution paths.

KPIs:
- 100% `orders/admin` endpoints migrated to module ownership.

## Phase 4: Data and Migration Governance (Weeks 8-9)
Objective:
- Establish one source of truth for schema changes.

Deliverables:
- Migration governance policy.
- Startup DDL minimized to orchestration.
- Upgrade + rollback validation scripts for critical migrations.

Exit Criteria:
- Schema changes happen only via migrations.

KPIs:
- Fresh setup and upgrade path both pass in CI.

## Phase 5: Frontend Decomposition (Weeks 10-12)
Objective:
- Reduce `App.js` to orchestration only.

Deliverables:
- App shell plus feature modules.
- Isolated hooks/services for auth, orders, notifications, maps.
- Simplified route-level composition.

Exit Criteria:
- Major state/effect clusters extracted from `App.js`.

KPIs:
- Clear feature ownership and reduced coupling.

## Phase 6: Cross-Cutting Hardening (Weeks 13-14)
Objective:
- Harden platform after structural moves.

Deliverables:
- Strict CORS policy for HTTP and Socket.IO.
- Structured logs with correlation IDs.
- Security policy checks for auth/rate limits/input handling.

Exit Criteria:
- Security and observability checklist passed.

KPIs:
- Reduced noisy logs.
- Improved p95 latency on core flows.

## Phase 7: Stabilization and Release Readiness (Weeks 15-16)
Objective:
- Release safely with controlled risk.

Deliverables:
- Full regression pack.
- Rollback runbook and incident playbook.
- Canary rollout checklist and dashboards.

Exit Criteria:
- Go-live gate signed off with rollback tested.

KPIs:
- Zero Sev-1 regressions during canary and initial full rollout.

## 4) Parallel Workstreams

1. Backend modularization and API contracts.
2. Frontend decomposition and state isolation.
3. DB migration governance and environment consistency.
4. CI/CD quality gates and reliability.
5. Security and observability hardening.

## 5) Governance Cadence

1. Weekly architecture review with Go/No-Go decision per phase gate.
2. Daily short blocker sync.
3. Biweekly migration demo with before/after metrics.
4. Feature freeze rule for modules under active migration (except critical fixes).

## 6) Definition of Done (Per Migrated Slice)

1. Behavior parity validated by tests.
2. Legacy duplicate path removed.
3. Logging and metrics instrumentation present.
4. Docs and operational runbook updated.
5. Rollback path validated.

## 7) First 10-Day Backlog

1. Freeze risky feature changes in `orders/admin/auth`.
2. Add contract tests for top traffic endpoints.
3. Unify env loading and DB init path.
4. Migrate `admin` to single route ownership and remove duplicates.
5. Enforce CI gate with contract + smoke suites.
6. Publish schema ownership and migration policy.

## 8) Guardrails

- No full rewrite.
- No schema-breaking changes without migration + rollback.
- No endpoint migration without parity tests.
- No phase advancement without gate signoff.

## 9) Success Criteria

- Architecture consistency improves without delivery freeze.
- Critical modules are modular, testable, and observable.
- Release confidence is based on gates, not manual luck.

