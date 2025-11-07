@order_creation
Feature: Order Creation E2E
  As a customer
  I want to create delivery orders through the UI
  So that I can request delivery services

  Background:
    Given the P2P delivery platform is running
    And there is a registered customer account

  @ORD-001
  Scenario: Customer creates a complete delivery order
    Given I am logged in as a customer
    When I click the "Create New Order" button
    Then I should see the order creation form

    When I fill in the order details:
      | field             | value                    |
      | title             | Test Package Delivery   |
      | description       | Fragile electronics     |
      | package_desc      | Laptop and accessories  |
      | weight            | 2.5                     |
      | value             | 1500.00                 |
      | price             | 25.00                   |

    And I set the pickup location to:
      | country   | United States |
      | city      | New York      |
      | area      | Manhattan     |
      | street    | 5th Avenue    |
      | building  | 123           |
      | person    | John Doe      |

    And I set the delivery location to:
      | country   | United States |
      | city      | New York      |
      | area      | Brooklyn      |
      | street    | Atlantic Ave   |
      | building  | 456           |
      | person    | Jane Smith    |

    When I submit the order
    Then I should see a success message
    And the order should appear in my orders list
    And the order should have status "Pending Bids"

  @ORD-002
  Scenario: Order creation validation - missing required fields
    Given I am logged in as a customer
    When I click the "Create New Order" button
    And I try to submit an empty order form
    Then I should see validation errors for required fields:
      | field         |
      | title         |
      | price         |
      | pickup map    |
      | delivery map  |
      | pickup person |
      | delivery person |

  @ORD-003
  Scenario: Order creation validation - different countries
    Given I am logged in as a customer
    When I click the "Create New Order" button
    And I fill in valid order details
    And I set pickup location in "United States"
    And I set delivery location in "Canada"
    Then I should see an error "Pickup and delivery locations must be in the same country"

  @ORD-004
  Scenario: Order creation with map selection
    Given I am logged in as a customer
    When I click the "Create New Order" button
    And I click on the pickup location map
    Then I should be able to select a location on the map
    And the coordinates should be populated automatically
    And reverse geocoding should fill the address fields
