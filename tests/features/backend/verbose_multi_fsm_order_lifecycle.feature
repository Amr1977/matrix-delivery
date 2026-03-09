Feature: Verbose Multi-FSM Order Lifecycle
  As a marketplace user (customer, vendor, or courier)
  I want to participate in the complete order lifecycle
  So that marketplace transactions are processed with detailed state management

  Background:
    Given a customer user exists
    And a vendor owner user exists for that vendor
    And the vendor owner creates a marketplace store named "Test Store"
    And the vendor owner creates a marketplace item named "Test Product" with price "50.00" and inventory "10"
    And the multi-FSM orchestrator is initialized

  @verbose-fsm @order-lifecycle @marketplace
  Scenario: Complete verbose multi-FSM order lifecycle with successful delivery
    Given the customer adds 2 quantity of "Test Product" to their cart
    When the customer creates an order with delivery address "123 Test Street, Cairo, Egypt"
    Then the order should be created successfully
    And the vendor FSM should be in state "awaiting_order_availability_vendor_confirmation"
    And the payment FSM should not be initialized yet
    And the delivery FSM should not be initialized yet

    When the vendor accepts the order with preparation time "30 minutes"
    Then the vendor FSM should transition to "awaiting_vendor_start_preparation"
    And the payment FSM should be initialized in state "payment_pending_for_customer"
    And the delivery FSM should be initialized in state "delivery_request_created_waiting_for_courier_acceptance"
    And a VENDOR_CONFIRMED event should be emitted

    When the customer completes payment with method "card" and amount "110.00"
    Then the payment FSM should transition to "payment_successfully_received_and_verified_for_order"
    And a PAYMENT_SUCCESSFUL event should be emitted
    And a vendor payout should be created for the order

    When the vendor starts preparing the order
    Then the vendor FSM should transition to "vendor_is_actively_preparing_order"
    And a PREPARATION_STARTED event should be emitted

    When the vendor marks the order as fully prepared
    Then the vendor FSM should transition to "order_is_fully_prepared_and_ready_for_delivery"
    And a PREPARATION_COMPLETE event should be emitted

    When a courier accepts the delivery request
    Then the delivery FSM should transition to "courier_has_been_assigned_to_deliver_the_order"
    And a COURIER_ASSIGNED event should be emitted

    When the courier arrives at the vendor pickup location
    Then the delivery FSM should transition to "courier_has_arrived_at_vendor_pickup_location"
    And a COURIER_AT_VENDOR event should be emitted

    When the courier confirms receipt of the order from vendor
    Then the delivery FSM should transition to "courier_is_actively_transporting_order_to_customer"
    And an ORDER_PICKED_UP event should be emitted

    When the courier arrives at the customer drop-off location
    Then the delivery FSM should transition to "courier_has_arrived_at_customer_drop_off_location"
    And a COURIER_AT_CUSTOMER event should be emitted

    When the courier marks the order as delivered to customer
    Then the delivery FSM should transition to "awaiting_customer_confirmation_of_order_delivery"
    And an ORDER_DELIVERED_TO_CUSTOMER event should be emitted

    When the customer confirms receipt of the order
    Then the delivery FSM should transition to "order_delivery_successfully_completed_and_confirmed_by_customer"
    And a DELIVERY_CONFIRMED event should be emitted
    And the order should be marked as completed
    And the vendor payout should be processed

  @verbose-fsm @vendor-rejection @edge-case
  Scenario: Vendor rejects order after payment - late rejection scenario
    Given the customer successfully creates and pays for an order
    And the payment FSM is in state "payment_successfully_received_and_verified_for_order"
    When the vendor rejects the order due to "item out of stock"
    Then the vendor FSM should transition to "order_rejected_by_vendor"
    And the payment FSM should automatically initiate a refund
    And the payment FSM should transition to "payment_has_been_refunded_to_customer"
    And the delivery FSM should be cancelled if initialized
    And a PAYMENT_REFUNDED event should be emitted
    And the customer should receive a refund notification

  @verbose-fsm @payment-failure @edge-case
  Scenario: Payment fails after vendor preparation - complex edge case
    Given the customer creates an order and vendor confirms acceptance
    And the vendor starts and completes preparation
    When the customer's payment fails with reason "insufficient funds"
    Then the payment FSM should transition to "payment_attempt_failed_for_order"
    And the delivery actions should be blocked
    And an admin notification should be triggered for manual intervention
    And the order should be flagged for admin review

  @verbose-fsm @customer-dispute @edge-case
  Scenario: Customer disputes delivery after courier marks as delivered
    Given the order is delivered and awaiting customer confirmation
    And the delivery FSM is in state "awaiting_customer_confirmation_of_order_delivery"
    When the customer reports a problem with reason "wrong item received"
    Then the delivery FSM should transition to "delivery_disputed_by_customer_and_requires_resolution"
    And a DELIVERY_DISPUTED event should be emitted
    And an admin review should be triggered
    And the vendor payout should be held pending resolution

  @verbose-fsm @state-synchronization
  Scenario: FSM state synchronization across multiple transitions
    Given the customer creates an order
    When multiple rapid state transitions occur across FSMs
    Then all FSM states should remain synchronized
    And no race conditions should occur
    And the audit log should record all transitions in correct order
    And the order should maintain data consistency

  @verbose-fsm @terminal-states
  Scenario: Terminal state validation prevents further transitions
    Given an order reaches a terminal state
    When any actor attempts to perform further actions
    Then all transition attempts should be rejected
    And appropriate error messages should be returned
    And the terminal state should be preserved

  @verbose-fsm @event-emission
  Scenario: Event-driven orchestration between FSMs
    Given an order in initial vendor confirmation state
    When the vendor accepts the order
    Then VENDOR_CONFIRMED event should trigger Payment and Delivery FSM initialization
    When payment is successful
    Then PAYMENT_SUCCESSFUL event should trigger payout creation
    When vendor completes preparation
    Then PREPARATION_COMPLETE event should enable delivery pickup
    When delivery is confirmed
    Then DELIVERY_CONFIRMED event should complete the order

  @verbose-fsm @tracking-info
  Scenario: Real-time delivery tracking information
    Given an order with an assigned courier
    When the delivery FSM is in different states
    Then appropriate tracking information should be provided:
      | State | Description | Terminal | Courier Info |
      | awaiting_courier | Waiting for courier assignment | false | Not assigned |
      | courier_assigned | Courier assigned to deliver | false | Courier details |
      | in_transit | Order in transit to customer | false | Courier + ETA |
      | delivered | Order delivered, awaiting confirmation | false | Courier details |
      | disputed | Delivery disputed, under review | true | Courier details |
      | completed | Order delivered and confirmed | true | Courier details |

  @verbose-fsm @guard-validation
  Scenario: Guard condition validation across FSM transitions
    When invalid transitions are attempted
    Then appropriate guard failures should occur:
      | Scenario | Guard Type | Expected Failure |
      | Wrong vendor accepts order | Vendor ownership | Access denied |
      | Inactive vendor accepts | Vendor active status | Guard failed |
      | Expired order acceptance | Order validity | Guard failed |
      | Courier wrong zone | Delivery zone match | Guard failed |
      | Customer retries payment | Retry limits | Guard failed |
      | Wrong role attempts action | Actor role validation | Access denied |
