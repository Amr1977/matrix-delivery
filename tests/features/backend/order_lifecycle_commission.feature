Feature: Order Lifecycle and Commission Deduction
  As a platform owner
  I want to ensure commission is deducted only when the customer confirms delivery
  So that drivers are not charged prematurely and the platform revenue is accurate

  Background:
    Given the platform commission rate is 15%
    And a driver with balance of 100.00 EGP
    And a customer exists

  Scenario: Full Order Lifecycle Commission Verification
    Given the driver has accepted an order worth 100.00 EGP
    And the order is in "in_transit" status
    When the driver marks the order as "delivered"
    Then the order status should be "delivered_pending"
    And the driver balance should still be 100.00 EGP
    And no commission should be deducted yet
    When the customer confirms the delivery
    Then the order status should be "delivered"
    And the platform should deduct 15.00 EGP commission
    And the driver balance should be 85.00 EGP
