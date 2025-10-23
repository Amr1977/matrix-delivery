@driver_operations
Feature: Driver Operations and Order Fulfillment
  As a driver
  I want to manage assigned orders and complete deliveries
  So that I can provide excellent delivery service

  Background:
    Given the P2P delivery platform is running
    And the database is clean

  @DB-001
  Scenario: Driver places bid on order
    Given there is an available order "ORD-001"
    When I view the order details as a driver
    And I place a bid with:
      | field | value |
      | bid_amount | $25 |
      | estimated_pickup_time | 2025-10-19 14:00 |
      | estimated_delivery_time | 2025-10-19 16:00 |
      | message | I can pick up immediately |
    Then my bid should be submitted successfully
    And the customer should be notified of the new bid

  @DB-002
  Scenario: Customer accepts driver bid
    Given driver "Jane Driver" has placed a bid on order "ORD-001"
    When the customer accepts the bid
    Then the order status should change to "accepted"
    And Jane Driver should be assigned to the order
    And Jane Driver should be notified of acceptance

  @DB-003
  Scenario: Driver completes delivery
    Given I am assigned to order "ORD-001"
    And I have picked up the package
    When I mark the delivery as completed
    Then the order status should change to "delivered"
    And the customer should be notified
    And payment should be processed
