@integration @end_to_end @critical_path
Feature: End-to-End Platform Integration
  As a stakeholder
  I want to ensure the complete platform works together seamlessly
  So that users have a smooth experience from order creation to completion

  Background:
    Given the P2P delivery platform is running
    And the database is clean and initialized
    And the system time is "2025-10-19T10:00:00Z"

  @E2E-001 @smoke
  Scenario: Complete delivery lifecycle from customer registration to review
    # Customer Registration
    Given I am a new user on registration page
    When I register as customer with:
      | name     | John Customer      |
      | email    | john@test.com      |
      | password | SecurePass123!     |
      | phone    | +1234567890        |
    Then I should be logged in as customer
    And I should see customer dashboard
    
    # Create Order
    When I click "Create New Order"
    And I fill in order details:
      | title  | Laptop Delivery |
      | price  | 25.00          |
    And I select pickup location at (40.7128, -74.0060)
    And I fill pickup address for "John Customer" at "5th Avenue, Manhattan"
    And I select delivery location at (40.7580, -73.9855)
    And I fill delivery address for "Jane Recipient" at "Broadway, Upper West Side"
    And I publish the order
    Then I should see success message
    And order should appear in my orders with status "Pending Bids"
    
    # Driver Registration and Bid
    Given another user registers as driver with:
      | name         | Jane Driver    |
      | email        | jane@test.com  |
      | password     | SecurePass123! |
      | phone        | +1234567891    |
      | vehicle_type | bike           |
    Then driver should be logged in
    
    When driver updates location to (40.7128, -74.0060)
    And driver views "Available Bids" tab
    Then driver should see the order "Laptop Delivery"
    
    When driver places bid:
      | amount  | 20.00                      |
      | message | I can pick up immediately  |
    Then customer should receive notification "New Bid Received"
    
    # Customer Accepts Bid
    When I log back in as customer
    And I view order details
    Then I should see 1 bid from "Jane Driver"
    
    When I accept Jane's bid
    Then order status should change to "Accepted"
    And Jane should receive notification "Bid Accepted!"
    And order should show assigned driver "Jane Driver"
    And agreed price should be "$20.00"
    
    # Driver Completes Delivery
    When I log in as driver "Jane"
    And I view "Active Orders" tab
    Then I should see order "Laptop Delivery"
    
    When I mark order as "Picked Up"
    Then customer receives notification "Package Picked Up"
    And order status should be "Picked Up"
    
    When I update location to (40.7400, -73.9700)
    And I mark order as "In Transit"
    Then customer receives notification "Package In Transit"
    
    When I update location to (40.7580, -73.9855)
    And I mark order as "Delivered"
    Then customer receives notification "Order Delivered"
    And order status should be "Delivered"
    And my completed deliveries count should be 1
    
    # Payment Confirmation
    When I confirm cash payment received
    Then payment should be recorded as completed
    And customer receives notification "Payment Confirmed"
    And my earnings should show "$20.00"
    
    # Reviews
    When I log in as customer
    And I view completed order
    And I submit review for driver:
      | rating | 5                                          |
      | comment| Excellent service! Very professional.      |
    Then driver receives notification "New Review Received"
    And driver's rating should be updated
    
    When I log in as driver
    And I submit review for customer:
      | rating | 5                               |
      | comment| Great customer, clear instructions |
    Then customer's rating should be updated
    
    # Verify Final State
    When I log in as customer
    Then I should see order in completed orders
    And order should show all timestamps
    And I should see payment confirmed
    And I should see reviews submitted
    
    When I log in as driver
    Then order should be in "My History"
    And earnings should reflect the payment
    And I should see customer's review

  @E2E-002 @multiple_drivers
  Scenario: Multiple drivers bid on same order
    Given customer "John" creates order "ORD-001"
    And 3 drivers are registered:
      | name        | email           | vehicle |
      | Jane Driver | jane@test.com   | bike    |
      | Bob Driver  | bob@test.com    | car     |
      | Alice Driver| alice@test.com  | van     |
    
    When all 3 drivers place bids:
      | driver | amount |
      | Jane   | 20.00  |
      | Bob    | 22.00  |
      | Alice  | 18.00  |
    
    Then customer should receive 3 notifications
    And customer should see 3 bids on order
    
    When customer accepts Alice's bid ($18.00)
    Then order should be assigned to Alice
    And Alice should receive "Bid Accepted" notification
    And Jane should see bid marked as "Rejected"
    And Bob should see bid marked as "Rejected"
    And order should disappear from "Available Bids" for all drivers

  @E2E-003 @order_cancellation
  Scenario: Customer deletes order before acceptance
    Given customer creates order "ORD-001"
    And 2 drivers have placed bids
    
    When customer deletes the order
    Then order should be removed from database
    And drivers should not see the order anymore
    And bids should be cascade deleted

  @E2E-004 @concurrent_access
  Scenario: Customer and driver view same order simultaneously
    Given customer and driver are both viewing order "ORD-001"
    And order status is "In Transit"
    
    When driver updates location
    Then customer should see updated location within 30 seconds
    
    When driver marks as delivered
    Then customer should see status update to "Delivered"
    And both users should see synchronized state

  @E2E-005 @notification_chain
  Scenario: Complete notification flow
    Given order exists with all parties involved
    
    When driver places bid
    Then customer receives "New Bid" notification with sound and TTS
    
    When customer accepts bid
    Then driver receives "Bid Accepted" notification with sound and TTS
    
    When driver picks up order
    Then customer receives "Package Picked Up" notification
    
    When driver marks in transit
    Then customer receives "Package In Transit" notification
    
    When driver delivers order
    Then customer receives "Order Delivered" notification
    
    When driver confirms payment
    Then customer receives "Payment Confirmed" notification
    
    When customer submits review
    Then driver receives "New Review" notification
    
    And all notifications should be stored in database
    And all should appear in notification dropdown
    And unread count should increment with each notification

  @E2E-006 @location_filtering
  Scenario: Driver location-based order filtering
    Given driver is at location (40.7128, -74.0060)
    And there are orders at various distances:
      | order    | pickup_lat | pickup_lng | distance_km |
      | ORD-001  | 40.7128    | -74.0060   | 0.0         |
      | ORD-002  | 40.7200    | -74.0000   | 1.2         |
      | ORD-003  | 40.7500    | -73.9800   | 4.8         |
      | ORD-004  | 40.8000    | -73.9500   | 10.5        |
    
    When driver updates location
    And driver views "Available Bids" tab
    Then driver should see orders: ORD-001, ORD-002, ORD-003
    And driver should NOT see: ORD-004 (outside 5km radius)
    And each visible order should show distance

  @E2E-007 @payment_flow
  Scenario: Complete payment workflow
    Given order is delivered
    And agreed price is "$20.00"
    
    When driver confirms COD payment
    Then payment record should be created with:
      | amount          | 20.00     |
      | payment_method  | cash      |
      | status          | completed |
      | platform_fee    | 0.00      |
      | driver_earnings | 20.00     |
    
    And driver should see payment in earnings summary
    And customer should see payment in history
    And order should show "Payment Confirmed" badge

  @E2E-008 @driver_workflow
  Scenario: Driver tab navigation and order visibility
    Given driver has:
      | 2 active orders (accepted, in_transit)    |
      | 5 available orders for bidding            |
      | 10 completed orders in history            |
    
    When driver clicks "Active Orders" tab
    Then driver should see exactly 2 orders
    And all should have status "Accepted" or "In Transit"
    
    When driver clicks "Available Bids" tab
    Then driver should see 5 orders
    And all should have status "Pending Bids"
    And driver should see "Place Bid" button on each
    
    When driver clicks "My History" tab
    Then driver should see 10 orders
    And all should have status "Delivered"

  @E2E-009 @review_workflow
  Scenario: Mutual review system
    Given order is delivered between John and Jane
    
    When John submits driver review with detailed ratings:
      | overall         | 5 |
      | professionalism | 5 |
      | communication   | 4 |
      | timeliness      | 5 |
      | condition       | 5 |
    Then Jane's rating should be recalculated
    And John should not be able to review Jane again
    
    When Jane submits customer review:
      | overall | 5 |
      | comment | Excellent customer |
    Then John's rating should be recalculated
    
    When anyone views order reviews
    Then they should see both reviews
    And each review should show all details

  @E2E-010 @error_recovery
  Scenario: System handles errors gracefully
    Given API temporarily fails
    
    When customer attempts to create order
    Then customer should see error message
    And form data should be preserved
    And customer can retry after API recovers
    
    When driver attempts to place bid during outage
    Then driver should see error message
    And bid form should retain entered data
    And driver can retry successfully after recovery

  @E2E-011 @mobile_responsive
  Scenario: Platform works on mobile devices
    Given I am on a mobile device with 375px width
    
    When I register as customer
    Then registration form should fit screen
    And all fields should be accessible
    
    When I create order
    Then order form should be scrollable
    And map selector should work with touch
    And all buttons should be touch-friendly
    
    When I view orders list
    Then orders should stack vertically
    And all information should be readable
    
    When I open tracking modal
    Then modal should fit mobile screen
    And I should be able to scroll content

  @E2E-012 @performance
  Scenario: Platform performs well under load
    Given 100 orders exist in system
    And 50 drivers are active
    
    When customer views orders list
    Then page should load within 2 seconds
    And scrolling should be smooth
    
    When driver views available bids
    Then orders should render within 1 second
    And filtering by location should be instant
    
    When customer opens notification dropdown
    Then notifications should appear within 500ms

  @E2E-013 @data_consistency
  Scenario: Data remains consistent across operations
    Given order "ORD-001" exists with all data
    
    When multiple users access the order simultaneously
    Then all users should see same order data
    And timestamps should be consistent
    And status should be synchronized
    
    When driver updates status
    Then change should be reflected immediately for all users
    And no race conditions should occur

  @E2E-014 @authentication_flow
  Scenario: Complete authentication workflow
    # Registration
    Given I register new account
    Then I should receive auth token
    And token should be stored in localStorage
    And I should be logged in
    
    # Session persistence
    When I refresh the page
    Then I should still be logged in
    And my user data should be loaded
    
    # Logout
    When I click logout
    Then I should be redirected to login page
    And auth token should be removed
    And I should not be able to access protected routes
    
    # Login
    When I login with correct credentials
    Then I should receive new auth token
    And I should access dashboard
    
    # Invalid login
    When I login with wrong password
    Then I should see error "Invalid email or password"
    And I should remain on login page

  @E2E-015 @order_tracking_complete
  Scenario: Complete tracking workflow
    Given order is in transit
    And driver is updating location regularly
    
    When customer opens tracking modal
    Then customer should see:
      | Current status        |
      | Timeline of events    |
      | Current driver location |
      | Location history      |
      | Pickup address        |
      | Delivery address      |
      | Estimated delivery    |
    
    When driver updates location
    Then customer should see updated coordinates
    And location history should grow
    
    When driver delivers order
    Then tracking should show "Delivered" status
    And final delivery timestamp should appear

  @E2E-016 @bidding_competition
  Scenario: Competitive bidding scenario
    Given order has offered price "$25.00"
    
    When Driver A bids "$22.00"
    Then customer sees bid from Driver A
    
    When Driver B bids "$20.00"
    Then customer sees both bids
    And Driver B's bid is lower
    
    When Driver A updates bid to "$18.00"
    Then Driver A's bid should replace previous
    And Driver A now has lowest bid
    
    When customer accepts Driver A's bid
    Then Driver A gets the order
    And final price is "$18.00"

  @E2E-017 @notification_preferences
  Scenario: Notification system complete flow
    Given user has browser notifications enabled
    
    When important event occurs
    Then user should receive:
      | Visual notification in dropdown |
      | Sound notification (beep)       |
      | Text-to-speech announcement     |
      | Notification badge update       |
    
    When user clicks notification
    Then notification should be marked as read
    And badge count should decrease
    And user should navigate to relevant content

  @E2E-018 @driver_earnings
  Scenario: Driver earnings tracking
    Given driver completes 5 orders:
      | order   | amount |
      | ORD-001 | 20.00  |
      | ORD-002 | 15.00  |
      | ORD-003 | 25.00  |
      | ORD-004 | 30.00  |
      | ORD-005 | 18.00  |
    
    When driver views earnings page
    Then driver should see:
      | Total Deliveries    | 5      |
      | Total Earnings      | 108.00 |
      | Platform Fee        | 0.00   |
      | Net Earnings        | 108.00 |
    
    And driver should see list of recent payments
    And each payment should show order details

  @E2E-019 @customer_order_management
  Scenario: Customer manages multiple orders
    Given customer creates 3 orders
    
    When customer views orders list
    Then customer should see all 3 orders
    And each should show current status
    
    When customer deletes one pending order
    Then customer should see 2 orders remaining
    
    When customer views delivered order
    Then customer should see complete details
    And customer should see payment status
    And customer should have option to review

  @E2E-020 @security_validation
  Scenario: Security measures are enforced
    # Unauthorized access
    Given I am not logged in
    When I attempt to access "/api/orders"
    Then I should receive 401 Unauthorized
    
    # Invalid token
    Given I have expired token
    When I attempt to access protected resource
    Then I should receive 401 Invalid token
    
    # Authorization checks
    Given I am customer "John"
    When I attempt to access driver-only endpoint
    Then I should receive 403 Forbidden
    
    # Data isolation
    Given order belongs to customer "John"
    And I am logged in as customer "Alice"
    When I attempt to view John's order
    Then I should receive 403 or 404 error

  @E2E-021 @api_integration
  Scenario: All API endpoints work together
    # Auth endpoints
    Given I POST to "/api/auth/register"
    Then I receive token
    
    When I POST to "/api/auth/login"
    Then I receive token
    
    When I GET "/api/auth/me" with token
    Then I receive user data
    
    # Order endpoints
    When I POST to "/api/orders" with token
    Then order is created
    
    When I GET "/api/orders" with token
    Then I receive orders list
    
    When I GET "/api/orders/:id" with token
    Then I receive order details
    
    # Bidding endpoints
    When I POST to "/api/orders/:id/bid"
    Then bid is recorded
    
    When I POST to "/api/orders/:id/accept-bid"
    Then order is assigned
    
    # Delivery endpoints
    When I POST to "/api/orders/:id/pickup"
    Then status updates to picked_up
    
    When I POST to "/api/orders/:id/in-transit"
    Then status updates to in_transit
    
    When I POST to "/api/orders/:id/complete"
    Then status updates to delivered
    
    # Payment endpoints
    When I POST to "/api/orders/:id/payment/cod"
    Then payment is recorded
    
    # Review endpoints
    When I POST to "/api/orders/:id/review"
    Then review is saved
    
    # Tracking endpoints
    When I GET "/api/orders/:id/tracking"
    Then I receive tracking data

  @E2E-022 @database_integrity
  Scenario: Database maintains referential integrity
    Given order "ORD-001" exists
    And driver is assigned to order
    And payment is recorded
    And reviews are submitted
    
    When order is deleted
    Then bids should be cascade deleted
    And notifications should be cascade deleted
    And location_updates should be cascade deleted
    And payment should be cascade deleted
    And reviews should be cascade deleted
    
    But users should not be deleted
    And driver's completed_deliveries count should remain

  @E2E-023 @ui_consistency
  Scenario: UI elements are consistent across platform
    When I view any page as customer
    Then header should always show:
      | Logo                  |
      | Notification bell     |
      | User name             |
      | Logout button         |
    
    When I view any page as driver
    Then I should additionally see:
      | Update Location button |
      | Tab navigation         |
    
    And all buttons should have consistent styling
    And all modals should have consistent appearance
    And all forms should follow same design patterns

  @E2E-024 @real_time_updates
  Scenario: Real-time data updates work correctly
    Given customer and driver both logged in
    And both viewing same order
    
    When driver places bid
    Then customer should see new bid within 30 seconds
    
    When customer accepts bid
    Then driver should see acceptance within 30 seconds
    
    When driver updates status
    Then customer should see status change within 30 seconds
    
    And all updates should happen without page refresh

  @E2E-025 @validation_complete
  Scenario: All form validations work correctly
    # Registration validation
    Given I am registering
    When I submit with missing fields
    Then I see appropriate error messages
    
    # Order creation validation
    When I create order without required fields
    Then I see field-specific errors
    
    # Bid validation
    When I bid with invalid amount
    Then I see "Enter a valid bid price"
    
    # Location validation
    When I update location with invalid coordinates
    Then I see "Invalid coordinates"
    
    And all validations should prevent invalid data submission

  @E2E-026 @accessibility_complete
  Scenario: Platform is accessible
    Given I am using keyboard only
    
    When I navigate through application
    Then I can access all functionality with Tab/Enter/Escape
    
    Given I am using screen reader
    When I navigate pages
    Then all content should be announced properly
    And all buttons should have descriptive labels
    And all forms should have proper labels
    
    And color contrast should meet WCAG standards
    And focus indicators should be visible

  @E2E-027 @error_messages
  Scenario: Meaningful error messages are displayed
    When operation fails with network error
    Then I see "Connection error. Please check your network."
    
    When server returns 500 error
    Then I see "Server error. Please try again later."
    
    When authentication fails
    Then I see "Invalid email or password"
    
    When authorization fails
    Then I see "You don't have permission for this action"
    
    And all errors should be user-friendly
    And all errors should suggest next steps

  @E2E-028 @loading_states
  Scenario: Loading states are properly displayed
    When I submit any form
    Then submit button shows "Loading..." with spinner
    And button is disabled during processing
    
    When I load data
    Then loading spinner is displayed
    And placeholder content shows loading state
    
    When operation completes
    Then loading indicators disappear
    And actual content is displayed

  @E2E-029 @success_feedback
  Scenario: Success feedback is clear
    When I complete any action successfully
    Then I see success message
    And message disappears after 5 seconds
    And I can manually dismiss message
    
    And success messages should be encouraging
    And success messages should confirm what happened

  @E2E-030 @complete_user_journey
  Scenario: Complete user journey from signup to completion
    # This is the ultimate integration test
    Given platform is running
    
    # Step 1: Registration
    When customer registers
    And driver registers
    Then both should have accounts created
    
    # Step 2: Order Creation
    When customer creates detailed order
    Then order should be in system
    
    # Step 3: Discovery
    When driver updates location
    Then driver should see the order
    
    # Step 4: Bidding
    When driver places competitive bid
    Then customer should see the bid
    
    # Step 5: Acceptance
    When customer accepts best bid
    Then order should be assigned
    
    # Step 6: Pickup
    When driver arrives and picks up
    Then customer should be notified
    
    # Step 7: Transit
    When driver travels with package
    And driver updates location regularly
    Then customer can track progress
    
    # Step 8: Delivery
    When driver delivers package
    Then customer should be notified
    
    # Step 9: Payment
    When driver confirms cash received
    Then payment should be recorded
    
    # Step 10: Reviews
    When both parties submit reviews
    Then ratings should be updated
    
    # Step 11: Verification
    Then order should be complete
    And all parties should be satisfied
    And all data should be correctly stored
    And platform should be ready for next order