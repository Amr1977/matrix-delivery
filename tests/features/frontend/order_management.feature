@orders
Feature: Order Management
  As a customer
  I want to manage my delivery orders
  So that I can send and track my packages

  Background:
    Given there is a registered customer account
    And I am logged in as a customer

  @ORD-001
  Scenario: Create a new delivery order
    When I click on "Publish New Order"
    And I fill in the order details:
      | title         | description         | fromLocation   | toLocation       | price |
      | Test Order    | Test delivery       | New York       | Los Angeles      | 25.00 |
    And I submit the order form
    Then I should see the order in my orders list
    And the order should have status "open"

  @ORD-002
  Scenario: View order details
    Given there is an existing customer order
    When I view the order details
    Then I should see the complete order information
    And I should see the order status

  @ORD-003
  Scenario: Edit order details
    Given there is an existing customer order
    When I edit the order details:
      | title           | description           | price |
      | Updated Order   | Updated delivery      | 30.00 |
    And I save the order changes
    Then the order should be updated successfully
    And I should see the updated order information

  @ORD-004
  Scenario: Delete an order
    Given there is an existing customer order
    When I delete the order
    And I confirm the deletion
    Then the order should be removed from my orders list

  @ORD-005
  Scenario: View order history
    Given there are multiple customer orders with different statuses
    When I view my order history
    Then I should see all my orders
    And orders should be sorted by creation date
    And each order should show correct status and details

  @ORD-006
  Scenario: Filter orders by status
    Given there are multiple customer orders with different statuses
    When I filter orders by status "open"
    Then I should only see orders with status "open"
    When I filter orders by status "accepted"
    Then I should only see orders with status "accepted"
