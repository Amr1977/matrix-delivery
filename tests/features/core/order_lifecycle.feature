@core @order_lifecycle
Feature: Core Order Lifecycle
  As a system stakeholder
  I want to verify the complete order lifecycle (Create -> Bid -> Accept -> Deliver)
  So that I can ensure business value is delivered regardless of the interface (API or UI)

  Background:
    Given the platform is ready
    And a customer "Alice" exists
    And a driver named "Bob" exists

  @happy_path
  Scenario: Customer creates order, driver bids, customer accepts, driver delivers
    # 1. Creation
    When "Alice" publishes an order for "Urgent Documents" priced at "50.00"
    Then the order "Urgent Documents" should be available in the marketplace

    # 2. Bidding
    When "Bob" places a bid of "45.00" on order "Urgent Documents"
    Then "Alice" should see a bid of "45.00" from "Bob"

    # 3. Acceptance
    When "Alice" accepts the bid from "Bob"
    Then the order status should be "ACCEPTED"
    And "Bob" should see the order in their "Active" list

    # 4. Fulfillment
    When "Bob" picks up the order
    Then the order status should be "IN_TRANSIT"

    When "Bob" delivers the order
    Then the order status should be "DELIVERED_PENDING"

    When "Alice" confirms the delivery
    Then the order status should be "DELIVERED"
    And "Bob" wallet should be credited with "45.00" less commission
    And "Alice" wallet should be "955.00"

    # 5. Reviews
    When "Bob" reviews "Alice" with "5" stars and comment "Great customer, easy pickup."
    Then the review should be submitted successfully

    When "Alice" reviews "Bob" with "5" stars and comment "Excellent driver, very fast."
    Then the review should be submitted successfully
