@backend @order_cancellation
Feature: Order Cancellation
  As a platform user
  I want to be able to cancel orders under specific conditions
  So that I can manage my orders flexibly

  Background:
    Given the platform is ready
    And a customer "Alice" exists
    And a driver "Bob" exists
    And a registered admin user exists

  # Customer Cancellation Scenarios
  @customer @cancel
  Scenario: Customer cancels order before any bids are placed
    Given "Alice" has created an order "Documents Delivery" priced at "50.00"
    And the order status is "pending_bids"
    When "Alice" cancels the order "Documents Delivery"
    Then the order status should be "cancelled"
    And no refunds should be processed

  @customer @cancel
  Scenario: Customer cancels order after accepting a bid
    Given "Alice" has created an order "Urgent Package" priced at "100.00"
    And "Bob" has placed a bid of "90.00" on order "Urgent Package"
    And "Alice" has accepted the bid from "Bob"
    When "Alice" cancels the order "Urgent Package"
    Then the order status should be "cancelled"
    And "Bob" should receive a cancellation notification

  # Driver Withdrawal Scenarios
  @driver @withdraw
  Scenario: Driver withdraws from an accepted order
    Given "Alice" has created an order "Fragile Items" priced at "75.00"
    And "Bob" has placed a bid of "70.00" on order "Fragile Items"
    And "Alice" has accepted the bid from "Bob"
    And the order is assigned to "Bob"
    When "Bob" withdraws from order "Fragile Items"
    Then the order status should be "pending_bids"
    And "Alice" should receive a notification about the driver withdrawal

  @driver @withdraw @in_transit
  Scenario: Driver cannot withdraw from an in-transit order
    Given "Alice" has created an order "Time-Sensitive Documents" priced at "80.00"
    And "Bob" has been assigned to order "Time-Sensitive Documents"
    And "Bob" has picked up the order
    And the order status is "in_transit"
    When "Bob" attempts to withdraw from order "Time-Sensitive Documents"
    Then the withdrawal should be rejected
    And the order status should still be "in_transit"

  # Admin Cancellation Scenarios
  @admin @cancel
  Scenario: Admin cancels a pending order
    Given "Alice" has created an order "Standard Delivery" priced at "45.00"
    And the order status is "pending_bids"
    When an admin cancels the order "Standard Delivery" with reason "Customer request"
    Then the order status should be "cancelled"
    And "Alice" should receive a cancellation notification with the reason
