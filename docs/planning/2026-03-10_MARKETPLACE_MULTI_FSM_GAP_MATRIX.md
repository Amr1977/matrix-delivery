# Marketplace Multi-FSM Gap Matrix and Execution Plan

## Purpose

This document identifies the current drift between:

- verbose multi-FSM design docs
- marketplace API docs
- BDD feature files
- step definitions
- controller routes
- service/orchestrator implementation
- Jest integration tests

It also defines the recommended source of truth and the implementation order to bring the system back into alignment.

## Recommended Source Of Truth

Use the verbose multi-FSM design as the behavioral source of truth:

- `DOCS/ORDER_FSM_DOCUMENTATION.md`
- `tests/features/backend/verbose_multi_fsm_order_lifecycle.feature`

Use the simplified marketplace API as the public transport layer only if it can be expressed as a thin facade over the multi-FSM service.

## Current State Summary

### What already exists

- A partial multi-FSM orchestrated marketplace service exists in `backend/services/marketplaceOrderService.js`.
- A `MultiFSMOrchestrator` exists in `backend/fsm/MultiFSMOrchestrator.js`.
- Convenience service methods exist for vendor accept/reject, payment confirmation, driver assignment, pickup, delivery, and customer receipt confirmation.
- Timeout scheduling infrastructure exists in `backend/services/timeoutScheduler.js`.

### What is currently broken or misaligned

- Controller routes expose a narrower legacy API than the service layer supports.
- API docs describe the legacy endpoint contract, not the real multi-FSM contract.
- Integration tests target endpoints and verbs that do not exist.
- Marketplace BDD step definitions use stale payloads and stale routes.
- Verbose multi-FSM BDD steps mix real assertions with placeholders and `console.log` assertions.
- Some action names differ across service mapping, feature files, and underlying FSMs.

## Gap Matrix

| Layer | Current Behavior | Intended Behavior | Gap | Required Action |
|---|---|---|---|---|
| Design docs | Verbose vendor/payment/delivery FSMs with event orchestration and backward-compatible API | Same | Mostly aligned | Keep as primary design source, but fix naming inconsistencies |
| API docs | Legacy status lifecycle and endpoint-driven transitions | Public API should either map cleanly to FSM actions or be updated to a generic FSM action contract | Out of date | Rewrite API docs after deciding facade strategy |
| Controller | Vendor-only `PATCH /:id/status` with `accept` / `reject`; separate endpoints for payment, assign, pickup, deliver, receipt | Must faithfully map public API actions to multi-FSM service methods | Partial alignment only | Refactor controller to be an explicit facade over service actions |
| Service | Multi-FSM-aware `updateOrderStatus(action, userId, role, metadata)` plus convenience wrappers | Same | Partial implementation, but action names and auth mapping are inconsistent | Normalize action names and side effects |
| Orchestrator | In-memory orchestration with event emission and snapshots | Event-driven orchestration with persistence-aware behavior | Partial | Keep, but integrate persistence and timeout/event wiring more explicitly |
| Timeout scheduler | Can persist and emit timeouts | Should drive real timeout transitions and status updates | Not fully connected to marketplace API behavior | Wire scheduler events to orchestrator/service flows and add tests |
| BDD feature files | Two competing models: simple marketplace lifecycle and verbose multi-FSM lifecycle | One consistent contract with a public API facade | Divergent | Keep verbose feature as behavior source; rewrite simple marketplace feature to facade language |
| API step definitions | Use stale route shapes and stale request bodies | Must reflect actual public contract | Broken | Rewrite around decided controller contract |
| Backend verbose FSM steps | Some real service/orchestrator assertions, many placeholder assertions | Fully executable integration behavior | Partial / misleading | Replace placeholders with real assertions or demote to design notes |
| Jest integration tests | Fake tokens, wrong verbs, nonexistent routes, wrong mocked methods | Real authenticated HTTP integration tests against real controller contract | Broken | Rewrite from scratch after controller contract is settled |

## Concrete Mismatches

### 1. Public API contract mismatch

Current controller contract:

- `PATCH /api/marketplace/orders/:id/status` only supports `accept` and `reject`
- `POST /api/marketplace/orders/:id/confirm-payment`
- `POST /api/marketplace/orders/:id/assign-driver`
- `POST /api/marketplace/orders/:id/pickup`
- `POST /api/marketplace/orders/:id/deliver`
- `POST /api/marketplace/orders/:id/confirm-receipt`

Current broken tests and steps assume:

- `PUT /api/marketplace/orders/:id/status`
- generic FSM actions on that route
- nonexistent `POST /api/marketplace/orders/:id/timeout`

Decision required:

- Option A: keep endpoint-specific public API and map each endpoint to service actions
- Option B: expose a generic FSM action endpoint and deprecate the endpoint-specific API

Recommendation:

- Choose Option A for now.
- It preserves the documented public API shape better and minimizes frontend churn.
- Internally, controller methods should translate endpoint intent to canonical FSM action names.

### 2. Action name mismatch

The service maps these action names:

- `vendor_accepts_order`
- `vendor_rejects_order`
- `customer_completes_payment`
- `courier_accepts_delivery_request`
- `courier_confirms_receipt`
- `courier_marks_delivered`
- `customer_confirms_receipt`

But other service code and validation still refer to different names:

- `vendor_starts_preparing_order` is used in verbose steps
- `mapActionToFSMType` expects `vendor_starts_preparing`
- `vendor_marks_order_as_fully_prepared` is used in verbose steps
- `mapActionToFSMType` expects `vendor_marks_prepared`
- `validateActionAuthorization` still refers to unrelated legacy names like `accept_order`, `confirm_payment`, `pickup_order`

Required action:

- Define one canonical action vocabulary in one place.
- Update service wrappers, controller translation, FSM classes, and tests to use only that vocabulary.

### 3. FSM state naming mismatch

Docs and feature files disagree on terminal delivery state naming:

- docs use `order_delivery_successfully_completed_and_confirmed_by_customer`
- feature file sometimes uses `order_delivery_completed_and_confirmed_by_customer`

Required action:

- Standardize on one delivery terminal state string.
- Update docs, feature files, and FSM implementation together.

Recommendation:

- Keep `order_delivery_successfully_completed_and_confirmed_by_customer` because it already appears in service status mapping.

### 4. Timeout flow mismatch

The timeout scheduler can schedule and emit timeout events, but:

- the public API has no timeout endpoint
- verbose backend steps fake timeout behavior with `console.log`
- current HTTP integration tests expect a timeout endpoint that does not exist

Required action:

- Treat timeout handling as internal orchestration, not public API.
- Test it at service/integration level by driving the scheduler or orchestrator directly.
- Add a maintenance/admin endpoint only if operationally necessary.

### 5. Payout lifecycle mismatch

Docs and verbose features expect:

- payout created on payment success
- payout held until delivery confirmation
- payout released after delivery confirmation

Current service behavior is inconsistent:

- `createOrder` creates a vendor payout twice
- `PAYMENT_SUCCESSFUL` also creates a payout

Required action:

- Decide when payout records are created.
- Recommendation: create payout record once on payment success, not on order creation.
- If a placeholder payout record is needed earlier, use a distinct pre-payment status and do not duplicate records.

### 6. Authentication mismatch in tests

Current Jest integration tests use hardcoded fake bearer tokens.

Required action:

- Introduce a shared test auth helper for marketplace integration tests.
- Generate real JWTs matching middleware requirements.
- Use seeded users for customer, vendor, admin, and driver roles.

### 7. Race condition coverage mismatch

Verbose docs and features require row-level locking and atomic transactions.

Current implementation:

- service orchestration does not clearly show transaction boundaries around multi-step transitions
- controller maps unexpected errors to `400`
- verbose tests simulate concurrency without proving database locking

Required action:

- add repository-level transactional transition methods
- add optimistic versioning or row-level locking
- map concurrency failures to `409 Conflict`
- write real concurrent integration tests against database-backed transitions

## Recommended Public API Facade

Keep endpoint-specific routes, but make each controller method a thin translation layer to canonical service actions.

| Public Endpoint | Canonical Internal Action |
|---|---|
| `PATCH /orders/:id/status` with `action=accept` | `vendor_accepts_order` |
| `PATCH /orders/:id/status` with `action=reject` | `vendor_rejects_order` |
| `POST /orders/:id/confirm-payment` | `customer_completes_payment` |
| `POST /orders/:id/assign-driver` | `courier_accepts_delivery_request` with admin metadata |
| `POST /orders/:id/pickup` | `courier_confirms_receipt` |
| `POST /orders/:id/deliver` | `courier_marks_delivered` |
| `POST /orders/:id/confirm-receipt` | `customer_confirms_receipt` |

Optional future extension:

- add internal-only service methods for `vendor_starts_preparing`, `vendor_marks_prepared`, `courier_arrives_at_vendor`, `courier_arrives_at_customer`, `customer_reports_problem`, and timeout-driven actions
- expose them publicly only if the frontend actually needs dedicated APIs

## Execution Plan

### Phase 1. Settle the canonical contract

1. Standardize action names in the service and FSM layers.
2. Standardize verbose state names in docs and feature files.
3. Decide which transitions are public API and which are internal orchestration only.

Definition of done:

- one action vocabulary
- one state vocabulary
- one table mapping public endpoints to internal actions

### Phase 2. Fix the service layer

1. Normalize `mapActionToFSMType`.
2. Rewrite `validateActionAuthorization` to use canonical action names.
3. Fix status mapping from verbose FSM states to legacy order statuses.
4. Remove duplicate vendor payout creation.
5. Make timeout handling update the correct order status and payout/inventory side effects.

Definition of done:

- service methods use one action vocabulary end to end
- payout creation is single-path
- side effects are deterministic

### Phase 3. Refactor controller facade

1. Keep public endpoint-specific routes.
2. Translate each route to a canonical service action.
3. Add consistent error mapping:
   - `400` invalid transition / validation
   - `401` authentication
   - `403` authorization
   - `404` missing order
   - `409` concurrency conflict
4. Return `fsm_states` in responses where relevant.

Definition of done:

- controller is a thin adapter
- API shape is documented and testable

### Phase 4. Rewrite tests

1. Replace `tests/integration/fsm-api.integration.test.js` entirely.
2. Use real JWT test helpers.
3. Test the public HTTP contract, not internal fantasy routes.
4. Add service-level tests for timeout and event orchestration.
5. Add repository/service concurrency tests for lock handling.

Definition of done:

- HTTP tests hit real routes with real auth
- timeout tests use internal orchestration hooks
- concurrency tests prove `409` behavior

### Phase 5. Repair BDD suite

1. Update `tests/features/backend/marketplace_order_management.feature` to match the public facade.
2. Keep `tests/features/backend/verbose_multi_fsm_order_lifecycle.feature` as deeper behavior coverage.
3. Rewrite `tests/step_definitions/api/marketplace_order_steps.js` to match actual routes.
4. Replace placeholder assertions in `tests/step_definitions/backend/verbose_multi_fsm_steps.js` with real checks or remove those scenarios until implemented.

Definition of done:

- feature files no longer conflict
- steps are executable
- no `console.log`-only pass conditions remain

## Immediate Priorities

### Highest priority

- canonical action-name cleanup
- controller facade alignment
- removal of duplicate payout creation
- rewrite of broken Jest FSM API test file

### Second priority

- timeout integration wiring
- real audit-log assertions
- concurrency transaction support

### Third priority

- event bus replay semantics
- operational/admin timeout endpoints if needed
- analytics-grade event persistence

## Proposed File Touch Order

1. `backend/services/marketplaceOrderService.js`
2. `backend/controllers/marketplaceOrderController.js`
3. `backend/fsm/*` as needed for action/state name alignment
4. `DOCS/api/marketplace-orders.md`
5. `tests/integration/fsm-api.integration.test.js`
6. `tests/features/backend/marketplace_order_management.feature`
7. `tests/step_definitions/api/marketplace_order_steps.js`
8. `tests/step_definitions/backend/verbose_multi_fsm_steps.js`

## Recommendation

Do not reimplement the marketplace order multi-FSM system from zero.

Do this instead:

- preserve the current multi-FSM service/orchestrator direction
- declare the verbose multi-FSM docs as the behavior source
- keep a stable public API facade
- rewrite tests and steps to that facade
- finish the missing transaction, timeout, payout, and event assertions

This is a realignment project, not a greenfield rewrite.
