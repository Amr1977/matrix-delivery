@emergency_transfer
Feature: Emergency Order Transfer
  As a courier who cannot complete an order
  I want to transfer the order to another courier
  So that the customer still receives their delivery

  Background:
    Given the system is running
    And a customer "emergency_customer" exists with balance 500 EGP
    And a driver "original_driver" exists with order in progress
    And driver "new_driver" exists nearby with 200 EGP available cash

  # ========================================
  # Emergency Trigger
  # ========================================

  @emergency_trigger
  Scenario: Driver triggers emergency transfer
    Given "original_driver" has an order in "picked_up" status
    And the order has 100 EGP upfront payment
    When "original_driver" triggers emergency with reason "vehicle_breakdown"
    Then the order status should be "emergency_transfer"
    And the driver's GPS location should be captured
    And a transfer record should be created

  @emergency_trigger
  Scenario: Cannot trigger emergency before pickup
    Given "original_driver" has an order in "accepted" status
    When "original_driver" tries to trigger emergency
    Then the operation should fail with "Use withdraw instead for accepted orders"

  # ========================================
  # Courier Notification & Filtering
  # ========================================

  @emergency_notification
  Scenario: Nearby couriers filtered by cash and distance
    Given an emergency transfer with 100 EGP upfront
    And "new_driver" has 200 EGP available cash and is 2 km away
    And "poor_driver" has 50 EGP available cash and is 1 km away
    And "far_driver" has 200 EGP available cash and is 10 km away
    When system notifies nearby couriers
    Then "new_driver" should receive notification
    And "poor_driver" should NOT receive notification
    And "far_driver" should NOT receive notification

  @emergency_notification
  Scenario: Emergency order shows on top of order list
    Given an emergency transfer exists
    And "new_driver" has been notified
    When "new_driver" views available orders
    Then the emergency transfer should be at the TOP of the list
    And it should have visual emphasis (red theme)

  # ========================================
  # First-Come-First-Served Acceptance
  # ========================================

  @fcfs_acceptance
  Scenario: First courier to accept gets the transfer
    Given an emergency transfer exists
    And "new_driver" and "another_driver" are both eligible
    When "new_driver" accepts the transfer first
    Then "new_driver" should be assigned to the transfer
    And "another_driver" should see "Already accepted by another courier"

  @fcfs_acceptance
  Scenario: Cannot accept without sufficient cash
    Given an emergency transfer with 150 EGP upfront
    And "new_driver" has only 100 EGP available cash
    When "new_driver" tries to accept the transfer
    Then the acceptance should fail with "Insufficient cash"

  # ========================================
  # Handoff Process
  # ========================================

  @handoff
  Scenario: Both couriers confirm handoff
    Given "new_driver" has accepted an emergency transfer
    And they have met at the original driver's location
    When both couriers confirm the handoff
    Then the transfer status should be "completed"
    And "original_driver" should receive distance compensation
    And "new_driver" should continue with the delivery

  @handoff
  Scenario: Upfront payment exchanged at handoff
    Given an emergency transfer with 100 EGP upfront
    And "new_driver" has accepted
    When handoff is confirmed
    Then "new_driver" is recorded as taking over upfront liability
    And "original_driver" receives upfront reimbursement

  # ========================================
  # Timeout & Escalation
  # ========================================

  @timeout
  Scenario: Admin escalation after 30 minutes
    Given an emergency transfer was created 30 minutes ago
    And no courier has accepted
    When the timeout is reached
    Then the transfer status should be "escalated"
    And admin should be notified

  # ========================================
  # Fee Calculation
  # ========================================

  @emergency_fees
  Scenario: New courier receives original fee plus bonus
    Given an emergency transfer with original delivery fee 50 EGP
    And emergency bonus is 20%
    When "new_driver" completes the delivery
    Then "new_driver" should receive 60 EGP (50 + 10 bonus)
    And the 10 EGP bonus should be paid from Takaful fund

  @emergency_fees
  Scenario: Original courier receives distance compensation
    Given an emergency transfer
    And "original_driver" traveled 3 km before the emergency
    And base compensation is 10 EGP + 3 EGP/km
    When handoff is completed
    Then "original_driver" should receive 19 EGP compensation
    And compensation should be paid from Takaful fund
