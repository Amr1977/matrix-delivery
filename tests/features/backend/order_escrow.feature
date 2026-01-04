@order_escrow
Feature: Order Escrow System
  As a platform
  I want to hold customer funds when bids are accepted
  So that drivers are guaranteed payment and cancellations are properly compensated

  Background:
    Given the system is running
    And a customer "escrow_customer" exists with balance 500 EGP
    And a driver "escrow_driver" exists with 200 EGP available cash

  # ========================================
  # Order Creation - Balance Check
  # ========================================

  @escrow_creation @ESC-001
  Scenario: Customer cannot create order without sufficient balance
    Given customer "escrow_customer" has balance 30 EGP
    When customer creates an order with upfront 50 EGP and estimated fee 20 EGP
    Then the order creation should fail with "Insufficient balance"

  @escrow_creation @ESC-002
  Scenario: Customer can create order with sufficient balance
    Given customer "escrow_customer" has balance 100 EGP
    When customer creates an order with upfront 50 EGP and estimated fee 20 EGP
    Then the order should be created successfully
    And the customer balance should still be 100 EGP
    And no hold should be applied yet

  # ========================================
  # Bid Acceptance - Balance Hold
  # ========================================

  @escrow_hold @ESC-003
  Scenario: Hold applied on bid acceptance
    Given customer "escrow_customer" has balance 200 EGP
    And an order exists with upfront 100 EGP
    And driver "escrow_driver" has placed a bid of 45 EGP
    When customer accepts the bid
    Then 145 EGP should be held from customer balance
    And customer available balance should be 55 EGP
    And customer held balance should be 145 EGP

  @escrow_hold @ESC-004
  Scenario: Cannot accept bid exceeding balance
    Given customer "escrow_customer" has balance 100 EGP
    And an order exists with upfront 80 EGP
    And driver "escrow_driver" has placed a bid of 50 EGP
    When customer tries to accept the bid
    Then the acceptance should fail with "Insufficient balance for this bid"

  # ========================================
  # Delivery Complete - Hold Release
  # ========================================

  @escrow_release @ESC-005
  Scenario: Hold released on successful delivery
    Given an order with 145 EGP held from customer
    And the order is in "delivered_pending" status
    When customer confirms delivery
    Then the hold should be released
    And driver should receive delivery fee minus commission

  # ========================================
  # Cancellation - Hold Forfeit
  # ========================================

  @escrow_forfeit @ESC-006
  Scenario: Cancellation before driver moves - full refund
    Given an order with 145 EGP held from customer
    And the order is in "accepted" status
    And driver has not traveled any distance
    When customer cancels the order
    Then the full hold should be returned to customer
    And driver receives no compensation

  @escrow_forfeit @ESC-007
  Scenario: Cancellation after driver traveled - compensation deducted
    Given an order with 145 EGP held from customer
    And the order is in "accepted" status
    And driver has traveled 3 km
    When customer cancels the order
    Then driver compensation should be calculated
    And compensation should be deducted from hold
    And remainder should be returned to customer

  @escrow_forfeit @ESC-008
  Scenario: Cancellation after driver paid upfront - full upfront reimbursed
    Given an order with 145 EGP held (100 upfront + 45 delivery)
    And the order is in "picked_up" status
    And driver has paid 100 EGP upfront for purchase
    When admin cancels the order
    Then driver should receive full 100 EGP upfront reimbursement
    And driver should receive distance compensation
    And remaining hold returned to customer
