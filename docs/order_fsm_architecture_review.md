# Architecture Review: Order FSM Documentation

## Overall Assessment

Quality: High\
Clarity: Very good\
Architecture maturity: Strong

The document is well structured and close to production-grade system
documentation. It correctly identifies the core architectural problem:
**status name collisions across two FSMs**.

### Strengths

-   Clear FSM modeling
-   Explicit transition tables
-   Actor/event separation
-   Strong conflict analysis section
-   Practical SQL and code examples

------------------------------------------------------------------------

# Key Architectural Feedback

## 1. Avoid Status Namespacing

The proposed solution suggests namespacing statuses such as:

-   marketplace_accepted\
-   traditional_accepted

While this avoids collisions, it introduces unnecessary coupling between
**state semantics and system type**.

### Recommended Pattern

Statuses should represent **state only**, while the **order type
determines the FSM**.

Preferred schema:

orders\
- id\
- order_type\
- status

Example records:

  id   order_type    status
  ---- ------------- ----------
  1    marketplace   accepted
  2    delivery      accepted

This keeps the domain model cleaner and avoids redundant state names.

### Correct Query Pattern

Instead of querying:

WHERE status = 'marketplace_accepted'

Use:

WHERE order_type = 'marketplace'\
AND status = 'accepted'

------------------------------------------------------------------------

## 2. Define FSM per Order Type

Both order flows are **distinct FSMs** and should be implemented as
separate state machines.

Recommended structure:

OrderFSMRegistry\
- marketplace → MarketplaceOrderFSM\
- delivery → DeliveryOrderFSM

Example usage:

const fsm = OrderFSMRegistry.getFSM(order.order_type)\
fsm.validateTransition(currentState, event)

Benefits:

-   Clear separation of business logic
-   Easier testing
-   Easier future expansion
-   Prevents cross-FSM status misuse

------------------------------------------------------------------------

## 3. Explicit Terminal State Rules

Terminal states should be explicitly defined to prevent invalid
transitions.

Example:

terminal_states =\
- completed\
- canceled\
- refunded\
- failed

Once a terminal state is reached, **no further transitions should be
allowed**.

------------------------------------------------------------------------

## 4. Add Transition Guards

FSM transitions should include **preconditions (guards)** to prevent
invalid state changes.

Example:

Transition: paid → accepted

Guards: - vendor_is_active - vendor_has_inventory - payment_captured

Another example:

Transition: accepted → assigned

Guards: - driver_available - delivery_zone_supported

This ensures business invariants are maintained and prevents invalid
transitions.

------------------------------------------------------------------------

## 5. Consistency Improvements

### Standardize spelling

Current document mixes:

-   cancelled\
-   canceled

Choose one convention.

Recommended standard:

-   canceled

------------------------------------------------------------------------

### Improve Actor Column

Current examples include:

customer/admin

Prefer:

customer \| admin

or simply:

system

This improves readability and avoids ambiguity.

------------------------------------------------------------------------

### Event Naming Consistency

Some events are inconsistent.

Current examples:

-   start_delivery\
-   complete_delivery

Suggested pattern:

-   start_transit\
-   complete_delivery

Maintain **consistent verb-based naming** for all events.

------------------------------------------------------------------------

## 6. Add Lifecycle Diagrams

FSM tables are excellent for developers but difficult for non-technical
stakeholders.

Include simplified lifecycle diagrams.

### Marketplace Lifecycle

pending\
↓\
paid\
↓\
accepted\
↓\
assigned\
↓\
picked_up\
↓\
delivered\
↓\
completed

### Traditional Delivery Lifecycle

pending_bids\
↓\
accepted\
↓\
picked_up\
↓\
in_transit\
↓\
delivered\
↓\
completed

These diagrams help product managers and stakeholders quickly understand
the order process.

------------------------------------------------------------------------

## 7. Optional: Database-Level FSM Enforcement

Consider enforcing transitions in the database using a **transition
table**.

Example schema:

order_state_transitions

-   from_state\
-   event\
-   to_state

Example rows:

  from_state   event             to_state
  ------------ ----------------- ----------
  pending      confirm_payment   paid
  paid         accept_order      accepted
  accepted     assign_driver     assigned

Backend logic can validate transitions against this table.

Benefits:

-   Prevents invalid state transitions
-   Centralized FSM definition
-   Enables auditing
-   Simplifies testing

------------------------------------------------------------------------

# Final Recommendation

The document is strong and nearly production-ready with minor
adjustments.

Primary architectural recommendation:

**Do not namespace statuses.**

Instead use:

order_type + status

This approach:

-   preserves domain semantics
-   avoids redundant state names
-   scales better for future order types
-   keeps the database schema clean

------------------------------------------------------------------------

# Suggested Architecture Layout

Database structure:

orders\
- id\
- order_type\
- status

Code structure:

fsm/\
- marketplace_fsm.ts\
- delivery_fsm.ts\
- registry.ts

Usage:

OrderFSMRegistry.getFSM(order_type)

Each FSM handles its own:

-   transitions\
-   guards\
-   terminal states
