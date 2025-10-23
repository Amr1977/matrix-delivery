@bidding
Feature: Driver Bidding and Order Acceptance
  As a driver
  I want to bid on available orders and complete deliveries
  So that I can earn money from deliveries

  Background:
    Given there is a registered customer account
    And there is a registered driver account

  @BID-001
  Scenario: View available orders as driver
    Given there are open customer orders available
    When I am logged in as a driver
    Then I should see the available orders for bidding
    And each order should show pickup and delivery locations
    And each order should show the offered price

  @BID-002
  Scenario: Place a bid on an order
    Given there is an open customer order
    And I am logged in as a driver
    When I place a bid of "$20.00" on the order
    Then I should see my bid listed in my active bids
    And the bid amount should be "$20.00"
    And the customer should be able to see my bid

  @BID-003
  Scenario: Customer accepts driver bid
    Given a driver has placed a bid on a customer order
    When I am logged in as the customer
    And I accept the driver's bid
    Then the order should be assigned to the driver
    And the order status should change to "accepted"
    And the driver should see the order in their accepted deliveries

  @BID-004
  Scenario: Complete assigned delivery
    Given a driver has an accepted order assigned to them
    When the driver marks the order as completed
    Then the order status should change to "completed"
    And the driver should get credited for the delivery
    And the delivery count should increase for the driver

  @BID-005
  Scenario: Multiple drivers bidding on same order
    Given there is an open customer order
    And multiple drivers are registered
    When multiple drivers place bids on the same order
    Then all bids should be visible to the customer
    And the customer can choose any bid to accept
    And other drivers should be notified their bids are not accepted

  @BID-006
  Scenario: Driver withdraws bid before acceptance
    Given a driver has placed a bid on an order
    When the driver withdraws their bid
    Then the bid should be removed from the order
    And the bid should not appear in active bids
    And the customer should not see the withdrawn bid

  @BID-007
  Scenario: Driver views their bidding history
    Given a driver has placed multiple bids
    When the driver views their bid history
    Then they should see all their previous bids
    And each bid should show the order details
    And bid status should be shown (active, accepted, withdrawn, rejected)

  @BID-008
  Scenario: Customer cannot accept bid after order is taken
    Given an order has been accepted by one driver
    When another driver tries to interact with the same order
    Then the order should not be available for new bids
    And the second driver should not see the option to bid
