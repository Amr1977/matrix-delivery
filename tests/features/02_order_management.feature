@order_management @implemented
Feature: Order Creation and Management
  As a customer
  I want to create and manage delivery orders with detailed address information
  So that I can send packages reliably

  Background:
    Given the P2P delivery platform is running
    And the database is clean and initialized
    And test customer "John Customer" is logged in with email "john@example.com"
    And customer has location permission granted
    And customer's current location is coordinates:
      | lat | 40.7128 |
      | lng | -74.0060 |
    And the system time is "2025-10-19T12:00:00Z"

  @OM-001 @smoke @critical_path
  Scenario: Create new order with complete address details
    Given I am on the "Create Order" page
    When I click "Create New Order" button
    Then I should see the order creation form
    
    # Fill basic order info
    When I fill in basic order details:
      | field               | value                        |
      | title               | Laptop Delivery              |
      | description         | Dell XPS 15 in original box  |
      | package_description | Electronics - Laptop         |
      | package_weight      | 2.5                          |
      | estimated_value     | 1500.00                      |
      | special_instructions| Handle with care, fragile    |
      | price               | 25.00                        |
    
    # Select pickup location on map
    When I click "Select Location on Map" for pickup
    Then I should see the map modal centered on my current location
    When I click on map coordinates:
      | lat | 40.7128 |
      | lng | -74.0060 |
    Then I should see a marker at the selected location
    When I click "Confirm Location"
    Then the pickup location coordinates should be set
    And I should see confirmation "Map location selected"
    
    # Fill pickup address details
    When I fill in pickup address:
      | field           | value                |
      | country         | USA                  |
      | city            | New York             |
      | area            | Manhattan            |
      | street          | 5th Avenue           |
      | buildingNumber  | 350                  |
      | floor           | 12                   |
      | apartmentNumber | 1205                 |
      | personName      | John Customer        |
    
    # Select delivery location on map
    When I click "Select Location on Map" for delivery
    Then I should see the map modal
    When I click on map coordinates:
      | lat | 40.7580 |
      | lng | -73.9855 |
    And I click "Confirm Location"
    Then the delivery location coordinates should be set
    
    # Fill delivery address details
    When I fill in delivery address:
      | field           | value                |
      | country         | USA                  |
      | city            | New York             |
      | area            | Upper West Side      |
      | street          | Broadway             |
      | buildingNumber  | 2250                 |
      | floor           | 8                    |
      | apartmentNumber | 805                  |
      | personName      | Jane Recipient       |
    
    # Submit order
    When I click "Publish Order" button
    Then I should see success message "Order published successfully! Waiting for drivers in your area."
    And a new order should be created with status "pending_bids"
    And the order should have a unique order number starting with "ORD-"
    And I should see the order in my orders list
    And the order should contain:
      | field               | value                        |
      | title               | Laptop Delivery              |
      | status              | pending_bids                 |
      | price               | 25.00                        |
      | customerName        | John Customer                |
      | packageDescription  | Electronics - Laptop         |
      | packageWeight       | 2.5                          |
      | estimatedValue      | 1500.00                      |
    And the pickup address should be formatted as:
      """
      John Customer, 5th Avenue, Building 350, Floor 12, Apartment 1205, Manhattan, New York, USA
      """
    And the delivery address should be formatted as:
      """
      Jane Recipient, Broadway, Building 2250, Floor 8, Apartment 805, Upper West Side, New York, USA
      """

  @OM-002 @validation
  Scenario: Order creation fails without required fields
    Given I am on the "Create Order" page
    When I click "Create New Order" button
    And I attempt to publish order without filling required fields
    Then I should see error message containing "Please fill all required fields"
    And the error should list missing fields:
      | Order title           |
      | Price                 |
      | Pickup location on map|
      | Pickup country        |
      | Pickup city           |
      | Pickup area           |
      | Pickup street         |
      | Pickup contact person |
      | Dropoff location on map|
      | Dropoff country       |
    And no order should be created

  @OM-003 @validation
  Scenario: Order creation fails without map location selection
    Given I am on the "Create Order" page
    When I fill in all address details but skip map selection
    And I attempt to publish the order
    Then I should see error message "Pickup location on map"
    And I should see error message "Dropoff location on map"
    And no order should be created

  @OM-004 @validation
  Scenario: Order creation fails with invalid price
    Given I am on the "Create Order" page
    When I fill in valid order details
    But I enter price as "0"
    And I attempt to publish the order
    Then I should see error message "Price must be greater than 0"
    And no order should be created

  @OM-005 @ui
  Scenario: View all customer orders
    Given I have created 3 orders with different statuses:
      | orderNumber | title           | status        | price |
      | ORD-001     | Laptop Delivery | pending_bids  | 25.00 |
      | ORD-002     | Books Delivery  | accepted      | 15.00 |
      | ORD-003     | Food Delivery   | delivered     | 10.00 |
    When I navigate to "My Orders" section
    Then I should see all 3 orders
    And orders should be sorted by creation date (newest first)
    And each order should display:
      | field        |
      | Order number |
      | Title        |
      | Status badge |
      | Price        |
      | Pickup address |
      | Delivery address |
      | Created date |

  @OM-006 @ui
  Scenario: View detailed order information
    Given I have an order "ORD-001" with status "pending_bids"
    When I click on the order
    Then I should see complete order details including:
      | field                  | value                        |
      | orderNumber            | ORD-001                      |
      | title                  | Laptop Delivery              |
      | status                 | pending_bids                 |
      | packageDescription     | Electronics - Laptop         |
      | packageWeight          | 2.5 kg                       |
      | estimatedValue         | $1500.00                     |
      | specialInstructions    | Handle with care, fragile    |
      | price                  | $25.00                       |
    And I should see formatted pickup address
    And I should see formatted delivery address
    And I should see pickup and delivery coordinates
    And I should see "Pending Bids" status badge in yellow
    And I should see list of bids (if any)

  @OM-007 @ui
  Scenario: Cancel order creation
    Given I am filling out the order creation form
    When I click "Cancel" button
    Then the order form should close
    And I should return to the orders list
    And no order should be created

  @OM-008 @ui
  Scenario: Map selector shows current location
    Given I am on the order creation page
    And I have location permission granted
    When I click "Select Location on Map" for pickup
    Then the map should be centered on my current location
    And I should see my current coordinates displayed
    And I should be able to click anywhere to select location

  @OM-009 @ui
  Scenario: Map selector without location permission
    Given I am on the order creation page
    And I have not granted location permission
    When I click "Select Location on Map"
    Then the map should center on default coordinates (New York)
    And I should be able to select any location by clicking
    And I should see coordinates of clicked location

  @OM-010 @data_validation
  Scenario: Order with optional fields omitted
    Given I am on the order creation page
    When I create order with only required fields:
      | title           | Simple Delivery |
      | price           | 20.00          |
    And I select valid pickup and delivery locations with addresses
    But I leave optional fields empty:
      | description         |
      | package_weight      |
      | estimated_value     |
      | special_instructions|
    And I publish the order
    Then the order should be created successfully
    And optional fields should be null or empty in the order

  @OM-011 @ui
  Scenario: View order status badge colors
    Given I have orders with different statuses
    When I view my orders list
    Then order with status "pending_bids" should have yellow badge
    And order with status "accepted" should have blue badge
    And order with status "picked_up" should have purple badge
    And order with status "in_transit" should have pink badge
    And order with status "delivered" should have green badge
    And order with status "cancelled" should have red badge

  @OM-012 @critical_path
  Scenario: Delete order in pending_bids status
    Given I have an order "ORD-001" with status "pending_bids"
    When I click "Delete" button on the order
    And I confirm the deletion
    Then the order should be removed from my orders list
    And I should see success message "Order deleted successfully"
    And the order should be removed from the database

  @OM-013 @validation
  Scenario: Cannot delete order after it's been accepted
    Given I have an order "ORD-001" with status "accepted"
    When I attempt to delete the order
    Then I should see error message "Cannot delete order that has been accepted"
    And the order should remain in my orders list
    And the order should not be deleted from database

  @OM-014 @ui
  Scenario: Real-time order list updates
    Given I am viewing my orders list
    When a driver places a bid on my order "ORD-001"
    Then the order should show updated bid count
    And I should see the new bid in the order details
    And the order card should indicate "New Bid" status

  @OM-015 @ui
  Scenario: Empty state when no orders exist
    Given I am a new customer with no orders
    When I view my orders list
    Then I should see empty state message:
      """
      📦
      No orders available
      """
    And I should see "Create New Order" button prominently

  @OM-016 @ui
  Scenario: Order form validation shows errors inline
    Given I am on the order creation page
    When I attempt to publish without filling title
    Then I should see inline error below title field
    When I fill in title but leave price empty
    And I attempt to publish
    Then I should see inline error below price field
    And previous title error should be cleared

  @OM-017 @ui
  Scenario: Address fields are clearly organized
    Given I am on the order creation page
    Then pickup address section should be clearly labeled "Pickup Location"
    And delivery address section should be clearly labeled "Delivery Location"
    And each section should have "Select Location on Map" button
    And required fields should be marked with asterisk (*)
    And optional fields should be clearly indicated

  @OM-018 @data_persistence
  Scenario: Order data persists correctly in database
    Given I create an order with all details
    When I logout and login again
    Then I should see my order in the list
    And all order details should be preserved
    And pickup and delivery locations should be correct
    And timestamps should be recorded

  @OM-019 @ui
  Scenario: Order creation form is mobile responsive
    Given I am on a mobile device
    When I access the order creation form
    Then all fields should be accessible
    And the map selector should work on mobile
    And I should be able to scroll through all sections
    And buttons should be appropriately sized for touch

  @OM-020 @ui
  Scenario: Estimated delivery date is optional
    Given I am creating an order
    When I provide an estimated delivery date "2025-10-20T14:00:00"
    And I publish the order
    Then the order should include the estimated delivery date
    
    When I create another order without estimated delivery date
    Then the order should be created successfully
    And estimated delivery date should be null