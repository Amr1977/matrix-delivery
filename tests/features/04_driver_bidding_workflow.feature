@driver_bidding @implemented
Feature: Driver Bidding and Order Acceptance
  As a driver
  I want to view and bid on available orders
  So that I can secure delivery jobs

  Background:
    Given the P2P delivery platform is running
    And the database is clean and initialized
    And test customer "John Customer" with email "john@example.com" exists
    And test driver "Jane Driver" is logged in with email "jane@example.com"
    And driver has updated location to:
      | lat | 40.7128 |
      | lng | -74.0060 |
    And customer has created order "ORD-001" with:
      | title           | Laptop Delivery       |
      | price           | 25.00                 |
      | status          | pending_bids          |
      | pickup_lat      | 40.7128               |
      | pickup_lng      | -74.0060              |
      | delivery_lat    | 40.7580               |
      | delivery_lng    | -73.9855              |
    And the system time is "2025-10-19T12:00:00Z"

  @BID-001 @smoke @critical_path
  Scenario: Driver views available orders in bidding tab
    Given I am on the driver dashboard
    When I click "Available Bids" tab
    Then I should see order "ORD-001" in the list
    And the order should display:
      | field           | value                |
      | title           | Laptop Delivery      |
      | price           | $25.00               |
      | status          | Pending Bids         |
      | pickup_address  | displayed            |
      | delivery_address| displayed            |
    And I should see "Place Bid" button
    And the order should not show in "Active Orders" tab

  @BID-002 @smoke @critical_path
  Scenario: Driver places a bid with basic information
    Given I am viewing order "ORD-001" in "Available Bids"
    When I enter bid amount "20.00"
    And I click "Place Bid" button
    Then I should see success message "Bid placed successfully!"
    And my bid should appear in the customer's bid list
    And customer "John Customer" should receive notification "Jane Driver placed a bid of $20.00 on your order ORD-001"
    And the order should move to my active bids section

  @BID-003 @critical_path
  Scenario: Driver places bid with detailed information
    Given I am viewing order "ORD-001"
    When I fill in bid details:
      | field                   | value                      |
      | bid_amount              | 20.00                      |
      | estimated_pickup_time   | 2025-10-19T13:00:00        |
      | estimated_delivery_time | 2025-10-19T15:00:00        |
      | message                 | I can pick up immediately  |
    And I click "Place Bid"
    Then my bid should be submitted with all details
    And customer should see my estimated times
    And customer should see my message

  @BID-004 @validation
  Scenario: Bid fails without amount
    Given I am viewing order "ORD-001"
    When I leave bid amount empty
    And I click "Place Bid"
    Then I should see error "Enter a valid bid price"
    And no bid should be created

  @BID-005 @validation
  Scenario: Bid fails with zero or negative amount
    Given I am viewing order "ORD-001"
    When I enter bid amount "0"
    And I click "Place Bid"
    Then I should see error "Enter a valid bid price"
    
    When I enter bid amount "-10"
    And I click "Place Bid"
    Then I should see error "Enter a valid bid price"

  @BID-006 @validation
  Scenario: Driver cannot bid on their own order
    Given I am a customer-driver hybrid user
    And I created order "ORD-002" as customer
    When I switch to driver mode
    And I attempt to bid on "ORD-002"
    Then I should see error "Cannot bid on your own order"
    And no bid should be created

  @BID-007 @validation
  Scenario: Driver cannot bid on non-open order
    Given order "ORD-001" has been accepted by another driver
    When I attempt to place a bid on "ORD-001"
    Then I should see error "Order is no longer available for bidding"
    And the order should not be visible in "Available Bids"

  @BID-008 @ui
  Scenario: Update existing bid
    Given I have already placed bid of "$20.00" on order "ORD-001"
    When I view the order again
    And I enter new bid amount "18.00"
    And I click "Place Bid"
    Then my previous bid should be replaced
    And customer should see only my latest bid of "$18.00"
    And I should see success message "Bid placed successfully!"

  @BID-009 @critical_path
  Scenario: Customer views all bids on their order
    Given customer "John Customer" is logged in
    And 3 drivers have placed bids on order "ORD-001":
      | driver_name  | bid_price | message                    |
      | Jane Driver  | 20.00     | I can pick up immediately  |
      | Bob Driver   | 22.00     | Available all day          |
      | Alice Driver | 18.00     | Experienced with fragile items |
    When customer views order "ORD-001" details
    Then customer should see "Bids Received (3)"
    And all 3 bids should be displayed
    And each bid should show:
      | field                   |
      | driver_name             |
      | bid_price               |
      | estimated_pickup_time   |
      | estimated_delivery_time |
      | message                 |
      | "Accept" button         |

  @BID-010 @smoke @critical_path
  Scenario: Customer accepts a bid
    Given driver "Jane Driver" has bid "$20.00" on order "ORD-001"
    And customer "John Customer" is viewing the order
    When customer clicks "Accept" on Jane's bid
    Then order status should change to "accepted"
    And Jane Driver should be assigned to the order
    And the agreed price should be "$20.00"
    And Jane should receive notification "Your bid of $20.00 has been accepted for order ORD-001"
    And other drivers' bids should be marked as "rejected"
    And the order should appear in Jane's "Active Orders" tab
    And the order should disappear from "Available Bids" for all drivers

  @BID-011 @ui
  Scenario: Customer sees bid details clearly
    Given driver has placed detailed bid on order "ORD-001"
    When customer views the bid
    Then bid should be displayed in a card format
    And driver name should be prominent
    And bid price should be in large, bold text
    And estimated times should be clearly formatted
    And message should be in italic style
    And "Accept" button should be visually distinct

  @BID-012 @validation
  Scenario: Only order owner can accept bids
    Given order "ORD-001" belongs to customer "John Customer"
    And driver "Jane Driver" has placed a bid
    When another customer attempts to accept the bid
    Then they should receive error "Only customer can accept bids"
    And the bid should remain pending

  @BID-013 @validation
  Scenario: Cannot accept non-existent bid
    Given order "ORD-001" exists
    And no bids have been placed
    When customer attempts to accept a bid
    Then they should receive error "Bid not found"

  @BID-014 @ui
  Scenario: Rejected bids are clearly marked
    Given 3 drivers bid on order "ORD-001"
    And customer accepted Jane's bid
    When other drivers view their bid history
    Then they should see their bid marked as "rejected"
    And the bid card should have visual indication of rejection
    And they should see which driver's bid was accepted

  @BID-015 @integration
  Scenario: Driver receives notification when bid is accepted
    Given driver "Jane Driver" has placed bid on order "ORD-001"
    And driver is viewing their dashboard
    When customer accepts Jane's bid
    Then Jane should hear notification sound
    And Jane should see notification "Your bid of $20.00 has been accepted for order ORD-001"
    And notification should have visual indicator (unread badge)

  @BID-016 @ui
  Scenario: Driver views tab navigation
    Given I am on the driver dashboard
    Then I should see 3 tabs:
      | tab_name         |
      | Active Orders    |
      | Available Bids   |
      | My History       |
    
    When I click "Active Orders" tab
    Then I should see orders I'm assigned to
    
    When I click "Available Bids" tab
    Then I should see orders I can bid on
    
    When I click "My History" tab
    Then I should see my completed deliveries

  @BID-017 @ui
  Scenario: Empty state in Available Bids
    Given there are no orders available for bidding
    When I view "Available Bids" tab
    Then I should see empty state:
      """
      📦
      No available bids found
      """

  @BID-018 @ui
  Scenario: Empty state in Active Orders
    Given I have not been assigned any orders
    When I view "Active Orders" tab
    Then I should see empty state:
      """
      📦
      No active orders found
      """

  @BID-019 @integration
  Scenario: Order disappears from Available Bids after I bid
    Given I am viewing order "ORD-001" in "Available Bids"
    When I place a bid on the order
    Then the order should remain visible in "Available Bids"
    And I should still see my bid information
    And I should be able to update my bid

  @BID-020 @ui
  Scenario: Bid form has clear labels and placeholders
    Given I am viewing an order
    Then the bid form should have:
      | field                   | placeholder                    |
      | Bid Amount              | Bid Amount ($)                 |
      | Estimated Pickup Time   | Pickup Time                    |
      | Estimated Delivery Time | Delivery Time                  |
      | Message                 | Message (optional)             |
    And all datetime fields should have datetime picker
    And message field should be textarea with adequate height

  @BID-021 @data_persistence
  Scenario: Bid data is correctly stored
    Given driver places bid with all details
    When bid is retrieved from database
    Then it should contain:
      | order_id                |
      | user_id (driver)        |
      | driver_name             |
      | bid_price               |
      | estimated_pickup_time   |
      | estimated_delivery_time |
      | message                 |
      | status                  |
      | created_at              |
    And timestamps should be in ISO format

  @BID-022 @validation
  Scenario: Customer cannot accept bid on already accepted order
    Given order "ORD-001" has been accepted
    And there are other pending bids
    When customer tries to accept another bid
    Then they should see error "Order is no longer open"
    And the order should remain assigned to original driver

  @BID-023 @ui
  Scenario: Loading states during bid submission
    Given I am placing a bid
    When I click "Place Bid" button
    Then the button should show "Placing Bid..." text
    And the button should be disabled
    And I should see loading spinner
    When the bid is successfully placed
    Then the button should return to normal state
    And success message should appear

  @BID-024 @ui
  Scenario: Error handling during bid submission
    Given API is temporarily unavailable
    When I attempt to place a bid
    Then I should see error message
    And the bid form should remain filled with my data
    And I should be able to retry submission

  @BID-025 @api
  Scenario: Place bid via API endpoint
    Given I am authenticated as driver
    When I POST to "/api/orders/ORD-001/bid" with:
      | bidPrice                | 20.00                      |
      | estimatedPickupTime     | 2025-10-19T13:00:00        |
      | estimatedDeliveryTime   | 2025-10-19T15:00:00        |
      | message                 | I can deliver quickly      |
    Then I should receive success response
    And response should include updated order with my bid

  @BID-026 @api
  Scenario: Accept bid via API endpoint
    Given driver has placed bid on order
    And I am authenticated as the customer
    When I POST to "/api/orders/ORD-001/accept-bid" with:
      | userId | <driver_user_id> |
    Then I should receive success response
    And response should show order status "accepted"
    And response should include assigned driver details

  @BID-027 @performance
  Scenario: Bid submission is fast
    Given I have filled bid form
    When I submit the bid
    Then the bid should be processed within 2 seconds
    And I should receive immediate feedback

  @BID-028 @integration
  Scenario: Multiple drivers bid simultaneously
    Given 5 drivers are viewing order "ORD-001"
    When all 5 drivers place bids within 1 minute
    Then all 5 bids should be recorded
    And customer should see all 5 bids
    And no bid should be lost
    And each bid should have unique timestamp

  @BID-029 @ui
  Scenario: Bid price validation shows error inline
    Given I am viewing order with price "$25.00"
    When I enter bid amount "0"
    Then I should see inline error below bid field
    When I correct the amount to "20.00"
    Then the error should disappear

  @BID-030 @business_logic
  Scenario: Bid notification includes order context
    Given driver places bid on order
    When customer receives notification
    Then notification should include:
      | driver_name   |
      | bid_amount    |
      | order_number  |
      | order_title   |
    And customer should be able to click to view order