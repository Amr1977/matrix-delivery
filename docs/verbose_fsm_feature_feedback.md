# Review Feedback: Verbose Multi-FSM Order Lifecycle Feature File

## Overview

The feature file is very strong and already close to production-ready.\
However, there are several architectural and logical issues that should
be addressed before implementation.

Below are the identified issues explained clearly.

------------------------------------------------------------------------

# 1. Payment FSM Timing Issue

## Problem

Some scenarios imply that the **payment FSM can exist or payment can
occur before the vendor confirms the order**.

Example scenario:

Scenario: Vendor rejects order after payment Given the customer
successfully creates and pays for an order

But according to the system design:

-   Payment FSM **should only start after the vendor confirms order
    availability**.
-   Therefore payment **cannot occur before vendor confirmation**.

## Recommended Fix

Rewrite the scenario like this:

Given the vendor accepted the order And the payment FSM is in state
"payment_successfully_received_and_verified_for_order"

------------------------------------------------------------------------

# 2. Courier Pickup Before Vendor Preparation

## Problem

The current scenarios allow the courier to: 1. Accept delivery 2. Arrive
at vendor 3. Pick up order

Even if the vendor **has not started preparing the order yet**.

## Recommended Guard Condition

Courier pickup should only be allowed if the vendor is already preparing
or finished preparing.

Allowed vendor states:

-   vendor_is_actively_preparing_order
-   order_is_fully_prepared_and_ready_for_delivery

------------------------------------------------------------------------

# 3. Payment Failure After Vendor Preparation

## Problem

If the vendor has already: - started preparation - consumed
ingredients - invested labor

Then payment failure creates a **financial loss for the vendor**.

## Recommended Solution

IF vendor preparation has already started AND payment fails THEN order
must be flagged for admin review AND vendor compensation logic must be
triggered

Also enforce:

delivery actions must remain blocked until payment success

------------------------------------------------------------------------

# 4. Delivery Tracking Table Uses Different State Names

Tracking table uses simplified states:

-   awaiting_courier
-   courier_assigned
-   in_transit
-   delivered
-   completed

But the FSM uses verbose states.

## Recommended Solution

Provide explicit mapping:

  ----------------------------------------------------------------------------------------------------------
  FSM State                                                         Tracking Label
  ----------------------------------------------------------------- ----------------------------------------
  delivery_request_created_waiting_for_courier_acceptance           awaiting_courier

  courier_has_been_assigned_to_deliver_the_order                    courier_assigned

  courier_is_actively_transporting_order_to_customer                in_transit

  awaiting_customer_confirmation_of_order_delivery                  delivered

  order_delivery_successfully_completed_and_confirmed_by_customer   completed
  ----------------------------------------------------------------------------------------------------------

------------------------------------------------------------------------

# 5. Missing Timeout Behavior

Real-world systems require timeout handling.

Examples:

Vendor confirmation timeout

awaiting_order_availability_vendor_confirmation → timeout →
order_cancelled_vendor_unresponsive

Payment timeout

payment_pending_for_customer → timeout →
payment_attempt_failed_for_order

Customer confirmation timeout

awaiting_customer_confirmation_of_order_delivery → timeout →
auto_confirm_delivery

------------------------------------------------------------------------

# 6. Missing Courier Reassignment Scenario

Example:

Scenario: Courier cancels delivery after accepting

Given a courier accepted delivery When the courier cancels the
assignment Then the delivery FSM should return to
delivery_request_created_waiting_for_courier_acceptance

------------------------------------------------------------------------

# 7. Race Condition Handling

All FSM transitions should run inside **atomic database transactions**
and use:

-   optimistic locking OR
-   row-level locking

This ensures state integrity.

------------------------------------------------------------------------

# 8. Vendor Payout Lifecycle

Recommended payout lifecycle:

payment_successful → payout_created →
payout_held_until_delivery_confirmation →
payout_released_after_delivery_confirmation

------------------------------------------------------------------------

# 9. Event Bus Requirement

All FSM transitions must emit domain events through a **centralized
event bus**.

Example events:

-   VENDOR_CONFIRMED
-   PAYMENT_SUCCESSFUL
-   PREPARATION_STARTED
-   PREPARATION_COMPLETE
-   COURIER_ASSIGNED
-   ORDER_PICKED_UP
-   ORDER_DELIVERED_TO_CUSTOMER
-   DELIVERY_CONFIRMED

------------------------------------------------------------------------

# 10. Optional Naming Improvement

Current state:

order_delivery_successfully_completed_and_confirmed_by_customer

Suggested alternative:

order_delivery_completed_and_confirmed_by_customer

------------------------------------------------------------------------

# Final Assessment

The feature file is **very well designed and close to production
quality**.

Strengths:

-   Clear multi-FSM architecture
-   Event-driven orchestration
-   Good edge case coverage
-   Guard condition validation
-   Terminal state protection
-   Concurrency awareness

## Improvements Needed

1.  Fix payment-before-vendor-confirmation scenario
2.  Add courier pickup guard conditions
3.  Define timeout transitions
4.  Add courier reassignment scenarios
5.  Specify transaction locking mechanism
6.  Map tracking states to FSM states
7.  Clarify vendor payout lifecycle
8.  Explicitly define event bus requirement
