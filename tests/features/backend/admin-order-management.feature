Feature: Admin Order Management
  As an administrator
  I want to manage orders
  So that I can resolve issues and maintain service quality

  Background:
    Given I am authenticated as an admin user

  Scenario: View all orders with pagination
    Given the system has 100 orders
    When I request the order list with page 1 and limit 20
    Then I should receive a successful response
    And the response should contain 20 orders
    And each order should include customer and driver information

  Scenario: Filter orders by status
    Given the system has orders with statuses:
      | status      | count |
      | delivered   | 30    |
      | in_transit  | 10    |
      | pending     | 15    |
    When I filter orders by status "delivered"
    Then I should receive 30 orders
    And all orders should have status "delivered"

  Scenario: Search orders by order number
    Given there is an order with number "ORD-12345"
    When I search for orders with term "ORD-12345"
    Then I should receive the matching order
    And the order details should be complete

  Scenario: View detailed order information
    Given there is an order "order-123" with:
      | field          | value           |
      | status         | in_transit      |
      | customer       | john@example.com|
      | driver         | jane@example.com|
      | bid_count      | 5               |
    When I request detailed information for the order
    Then I should receive complete order details
    And the details should include all bids
    And the details should include location updates
    And the details should include payment information

  Scenario: Cancel an order
    Given there is an active order "order-456"
    When I cancel the order with reason "Customer request"
    Then the order status should be "cancelled"
    And the customer should be notified
    And the driver should be notified if assigned
    And payment should be refunded if applicable
    And the admin action should be logged as "CANCEL_ORDER"

  Scenario: Cancel order with refund
    Given there is a paid order "order-789"
    When I cancel the order with refund
    Then the order should be cancelled
    And the payment should be refunded
    And the refund should be recorded in payment history

  Scenario: View order location history
    Given there is an order "order-999" with 20 location updates
    When I request the order details
    Then the location updates should be included
    And the updates should be ordered by timestamp
    And each update should include coordinates and timestamp

  Scenario: Monitor active orders
    Given there are 15 orders in active status
    When I request orders filtered by active statuses
    Then I should receive all active orders
    And the orders should include real-time status

  Scenario: Generate order report
    Given there are orders in the last 30 days
    When I request an order report for the period
    Then I should receive aggregated statistics
    And the report should include total orders
    And the report should include completion rate
    And the report should include average delivery time
