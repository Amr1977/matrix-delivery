@order_management
Feature: Detailed Order Management
  As a customer
  I want to create and track delivery orders in detail
  So that I can have full control over my package deliveries

  Background:
    Given the P2P delivery platform is running
    And the database is clean

  @OM-001
  Scenario: Create a new delivery order
    When I am on the "Create Order" page
    And I fill in the order details:
      | field | value |
      | pickup_address | 123 Main St, City A |
      | delivery_address | 456 Oak Ave, City B |
      | package_description | Electronics |
      | package_weight | 2.5 kg |
      | estimated_value | $150 |
      | delivery_date | 2025-10-20 |
      | special_instructions | Handle with care |
    And I submit the order
    Then I should see a success message "Order created successfully"
    And I should see order ID "ORD-001"
    And the order status should be "pending_bids"

  @OM-002
  Scenario: View order details
    Given I have created order "ORD-001"
    When I navigate to order details
    Then I should see:
      | field | value |
      | order_id | ORD-001 |
      | status | pending_bids |
      | pickup_address | 123 Main St, City A |
      | delivery_address | 456 Oak Ave, City B |
      | created_date | 2025-10-19 |
      | estimated_delivery | 2025-10-20 |

  @OM-003
  Scenario: Track order status
    Given I have order "ORD-001" with status "in_transit"
    When I check order tracking
    Then I should see current status "in_transit"
    And I should see location updates
    And I should see estimated delivery time
