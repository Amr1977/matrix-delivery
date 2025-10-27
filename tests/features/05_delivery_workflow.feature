@delivery_workflow @implemented
Feature: Complete Delivery Workflow
  As a driver
  I want to complete the full delivery lifecycle
  So that I can fulfill orders and earn money

  Background:
    Given the P2P delivery platform is running
    And the database is clean and initialized
    And test customer "John Customer" with email "john@example.com" exists
    And test driver "Jane Driver" is logged in with email "jane@example.com"
    And driver has placed bid of "$20.00" on order "ORD-001"
    And customer has accepted the bid
    And order "ORD-001" status is "accepted"
    And the system time is "2025-10-19T12:00:00Z"

  @DEL-001 @smoke @critical_path
  Scenario: Complete full delivery workflow
    # Initial state
    Given I am on "Active Orders" tab
    Then I should see order "ORD-001" with status "Accepted"
    And I should see "Mark as Picked Up" button
    
    # Pickup
    When I arrive at pickup location
    And I click "Mark as Picked Up" button
    Then order status should change to "picked_up"
    And I should see success message "Order picked up successfully"
    And customer should receive notification "Jane Driver has picked up your package for order ORD-001"
    And pickup timestamp should be recorded
    And I should now see "Mark as In Transit" button
    
    # In Transit
    When I click "Mark as In Transit" button
    Then order status should change to "in_transit"
    And customer should receive notification "Your package for order ORD-001 is now in transit"
    And I should now see "Mark as Delivered" button
    
    # Delivery
    When I arrive at delivery location
    And I click "Mark as Delivered" button
    Then order status should change to "delivered"
    And customer should receive notification "Your order ORD-001 has been delivered successfully!"
    And delivery timestamp should be recorded
    And my completed deliveries count should increase by 1
    And the order should move to "My History" tab
    And the order should disappear from "Active Orders"

  @DEL-002 @validation
  Scenario: Cannot pick up order if not accepted
    Given order "ORD-001" status is "pending_bids"
    When I attempt to mark order as "picked_up"
    Then I should receive error "Order must be accepted before pickup"
    And order status should remain "pending_bids"

  @DEL-003 @validation
  Scenario: Cannot mark in transit without pickup
    Given order "ORD-001" status is "accepted"
    When I attempt to mark order as "in_transit"
    Then I should receive error "Order must be picked up before marking as in transit"
    And order status should remain "accepted"

  @DEL-004 @validation
  Scenario: Cannot complete without pickup or transit
    Given order "ORD-001" status is "accepted"
    When I attempt to mark order as "delivered"
    Then I should receive error "Order must be picked up or in transit before completion"
    And order status should remain "accepted"

  @DEL-005 @validation
  Scenario: Only assigned driver can update order status
    Given another driver "Bob Driver" is logged in
    And order "ORD-001" is assigned to "Jane Driver"
    When Bob attempts to update order status
    Then Bob should receive error "Only assigned driver can mark pickup"
    And order status should not change

  @DEL-006 @ui
  Scenario: Status progression buttons appear contextually
    Given order status is "accepted"
    Then I should see only "Mark as Picked Up" button
    
    When I mark order as "picked_up"
    Then I should see "Mark as In Transit" button
    And I should also see "Mark as Delivered" button
    And I should not see "Mark as Picked Up" button
    
    When I mark order as "in_transit"
    Then I should see only "Mark as Delivered" button

  @DEL-007 @ui
  Scenario: Order card shows current status prominently
    When order status is "accepted"
    Then status badge should be blue with text "Accepted"
    
    When order status is "picked_up"
    Then status badge should be orange with text "Picked Up"
    
    When order status is "in_transit"
    Then status badge should be purple with text "In Transit"
    
    When order status is "delivered"
    Then status badge should be green with text "Delivered"

  @DEL-008 @integration
  Scenario: Customer sees real-time status updates
    Given customer "John Customer" is viewing order "ORD-001"
    When driver marks order as "picked_up"
    Then customer should see status update to "Picked Up"
    And customer should see pickup timestamp
    
    When driver marks as "in_transit"
    Then customer should see status "In Transit"
    
    When driver marks as "delivered"
    Then customer should see status "Delivered"
    And customer should see delivery timestamp

  @DEL-009 @notifications
  Scenario: Each status change triggers notification
    When driver marks order as "picked_up"
    Then customer receives notification with title "Package Picked Up"
    And notification should play sound
    And notification should use text-to-speech to announce
    
    When driver marks order as "in_transit"
    Then customer receives notification with title "Package In Transit"
    
    When driver marks order as "delivered"
    Then customer receives notification with title "Order Delivered"

  @DEL-010 @data_persistence
  Scenario: All status transitions are timestamped
    Given order starts in "accepted" state at "2025-10-19T12:00:00Z"
    When driver marks as "picked_up" at "2025-10-19T12:30:00Z"
    Then picked_up_at should be "2025-10-19T12:30:00Z"
    
    When driver marks as "in_transit" at "2025-10-19T12:35:00Z"
    Then order should record in_transit timestamp
    
    When driver marks as "delivered" at "2025-10-19T13:30:00Z"
    Then delivered_at should be "2025-10-19T13:30:00Z"
    
    And all timestamps should be persisted in database

  @DEL-011 @ui
  Scenario: Order in History tab shows completion details
    Given order "ORD-001" has been delivered
    When I view "My History" tab
    Then I should see order "ORD-001"
    And order should show:
      | field          | value                  |
      | status         | Delivered              |
      | delivered_at   | 2025-10-19 13:30:00    |
      | agreed_price   | $20.00                 |
      | customer_name  | John Customer          |
    And status badge should be green
    And I should see option to view reviews

  @DEL-012 @ui
  Scenario: Loading states for status updates
    Given I am updating order status
    When I click "Mark as Picked Up"
    Then button should show "Marking..." with spinner
    And button should be disabled during update
    When update completes
    Then button should return to normal state
    And success message should appear

  @DEL-013 @performance
  Scenario: Status updates are processed quickly
    When driver updates order status
    Then the update should complete within 2 seconds
    And customer notification should be sent immediately
    And UI should update without page refresh

  @DEL-014 @api
  Scenario: Mark order as picked up via API
    Given I am authenticated as assigned driver
    When I POST to "/api/orders/ORD-001/pickup"
    Then I should receive success response
    And response should include:
      | _id         | ORD-001    |
      | orderNumber | ORD-001    |
      | status      | picked_up  |
      | pickedUpAt  | timestamp  |

  @DEL-015 @api
  Scenario: Mark order in transit via API
    Given order status is "picked_up"
    When I POST to "/api/orders/ORD-001/in-transit"
    Then I should receive success response
    And order status should be "in_transit"

  @DEL-016 @api
  Scenario: Complete order via API
    Given order status is "in_transit"
    When I POST to "/api/orders/ORD-001/complete"
    Then I should receive success response
    And order status should be "delivered"
    And my completed_deliveries count should increment

  @DEL-017 @business_logic
  Scenario: Driver earnings updated after completion
    Given agreed price is "$20.00"
    When order is marked as "delivered"
    Then driver's completed_deliveries should increase by 1
    And driver rating should remain available for updates
    And order should be available for review

  @DEL-018 @ui
  Scenario: Direct delivery without in-transit step
    Given order status is "picked_up"
    When I click "Mark as Delivered" directly
    Then order should transition to "delivered"
    And customer should be notified
    And I should not be required to mark "in_transit" first

  @DEL-019 @error_handling
  Scenario: Handle API error during status update
    Given API is temporarily unavailable
    When I attempt to update order status
    Then I should see error message
    And order status should not change
    And I should be able to retry the operation

  @DEL-020 @integration
  Scenario: Multiple status updates in quick succession
    Given order status is "accepted"
    When I mark as "picked_up"
    And immediately mark as "in_transit"
    And immediately mark as "delivered"
    Then all status changes should be recorded
    And all timestamps should be sequential
    And customer should receive all notifications

  @DEL-021 @ui
  Scenario: Order details show full workflow history
    Given order has been delivered
    When I view order details
    Then I should see complete timeline:
      | event         | timestamp              |
      | Created       | 2025-10-19 12:00:00    |
      | Accepted      | 2025-10-19 12:15:00    |
      | Picked Up     | 2025-10-19 12:30:00    |
      | In Transit    | 2025-10-19 12:35:00    |
      | Delivered     | 2025-10-19 13:30:00    |

  @DEL-022 @validation
  Scenario: Cannot change status of delivered order
    Given order status is "delivered"
    When I attempt any status update
    Then the operation should be rejected
    And order should remain "delivered"

  @DEL-023 @ui
  Scenario: Confirmation dialog for delivery completion
    Given order status is "in_transit"
    When I click "Mark as Delivered"
    Then I should see confirmation "Are you sure the package has been delivered?"
    When I confirm
    Then order should be marked as delivered

  @DEL-024 @integration
  Scenario: Order tracking shows current location
    Given order is "in_transit"
    When customer views order tracking
    Then customer should see driver's current status
    And customer should see estimated delivery time
    And customer should see delivery address

  @DEL-025 @ui
  Scenario: Empty state for history shows meaningful message
    Given I am a new driver with no completed deliveries
    When I view "My History" tab
    Then I should see:
      """
      📦
      No order history
      Complete your first delivery to see it here!
      """

  @DEL-026 @business_logic
  Scenario: Order moves through complete lifecycle correctly
    # Create
    Given customer creates order "ORD-002"
    Then order status should be "pending_bids"
    
    # Bid and Accept
    When driver bids on order
    And customer accepts bid
    Then order status should be "accepted"
    
    # Pickup
    When driver marks as picked up
    Then order status should be "picked_up"
    
    # Transit
    When driver marks as in transit
    Then order status should be "in_transit"
    
    # Deliver
    When driver marks as delivered
    Then order status should be "delivered"
    
    # Verify final state
    And order should be in customer's completed orders
    And order should be in driver's history
    And order should be ready for review
    And order should be ready for payment confirmation

  @DEL-027 @ui
  Scenario: Status buttons have appropriate colors
    Then "Mark as Picked Up" button should be orange
    And "Mark as In Transit" button should be purple
    And "Mark as Delivered" button should be green
    And all buttons should have consistent styling

  @DEL-028 @accessibility
  Scenario: Status updates are accessible
    Given I am using screen reader
    When order status changes
    Then status change should be announced
    And buttons should have descriptive labels
    And keyboard navigation should work correctly

  @DEL-029 @data_validation
  Scenario: Status transitions follow correct sequence
    Given valid status transitions are:
      | from         | to           |
      | accepted     | picked_up    |
      | picked_up    | in_transit   |
      | picked_up    | delivered    |
      | in_transit   | delivered    |
    Then only these transitions should be allowed
    And invalid transitions should be rejected

  @DEL-030 @integration
  Scenario: Customer and driver see synchronized order state
    Given both customer and driver are viewing order
    When driver updates status to "picked_up"
    Then both users should see updated status
    And no synchronization delay should occur
    And both should see same timestamps