@order_tracking @implemented
Feature: Real-time Order Tracking
  As a customer or driver
  I want to track order progress and location
  So that I can monitor delivery status

  Background:
    Given the P2P delivery platform is running
    And the database is clean and initialized
    And test customer "John Customer" with email "john@example.com" exists
    And test driver "Jane Driver" with email "jane@example.com" exists
    And order "ORD-001" exists with status "in_transit"
    And driver is assigned to order
    And the system time is "2025-10-19T12:00:00Z"

  @TRK-001 @smoke @critical_path
  Scenario: Customer views order tracking
    Given I am logged in as customer
    And I am viewing order "ORD-001"
    When I click "Track Order" button
    Then tracking modal should open
    And modal should display:
      | Order Number        | ORD-001         |
      | Current Status      | In Transit      |
      | Pickup Address      | displayed       |
      | Delivery Address    | displayed       |
    And I should see status timeline
    And I should see location information if available

  @TRK-002 @ui
  Scenario: Tracking modal shows order progress timeline
    Given order has these completed stages:
      | stage         | timestamp           |
      | Created       | 2025-10-19 11:00:00 |
      | Accepted      | 2025-10-19 11:15:00 |
      | Picked Up     | 2025-10-19 11:30:00 |
      | In Transit    | 2025-10-19 11:35:00 |
    When I view tracking modal
    Then I should see timeline with:
      | ✓ Order Created       | Oct 19, 11:00 AM |
      | ✓ Bid Accepted        | Oct 19, 11:15 AM |
      | ✓ Package Picked Up   | Oct 19, 11:30 AM |
      | ✓ In Transit          | Oct 19, 11:35 AM |
      | ⏳ Delivered          | Pending          |
    And completed stages should have green checkmark
    And current stage should have green circle
    And pending stages should have gray circle

  @TRK-003 @ui
  Scenario: Tracking shows current driver location
    Given driver has updated location to:
      | lat | 40.7480 |
      | lng | -73.9950 |
    When I view order tracking
    Then I should see "Current Location" section
    And location should display:
      """
      Lat: 40.748000, Lng: -73.995000
      """
    And location should have blue background
    And location should have pin icon 📍

  @TRK-004 @ui
  Scenario: Tracking shows pickup and delivery addresses
    Given order has:
      | pickup_address  | 350 5th Avenue, Manhattan, New York, USA    |
      | delivery_address| 2250 Broadway, Upper West Side, New York, USA|
    When I view tracking
    Then I should see two columns:
      | 📤 Pickup                                |
      | 350 5th Avenue, Manhattan, New York, USA |
    And:
      | 📥 Delivery                                   |
      | 2250 Broadway, Upper West Side, New York, USA |

  @TRK-005 @ui
  Scenario: Tracking modal has close button
    Given tracking modal is open
    When I click "×" close button
    Then modal should close
    And I should return to order details

  @TRK-006 @api
  Scenario: Get order tracking via API
    Given I am authenticated as customer or driver
    When I GET "/api/orders/ORD-001/tracking"
    Then I should receive:
      | orderNumber           | ORD-001    |
      | status                | in_transit |
      | currentLocation       | object     |
      | pickup                | object     |
      | delivery              | object     |
      | estimatedDelivery     | timestamp  |
      | createdAt             | timestamp  |
      | acceptedAt            | timestamp  |
      | pickedUpAt            | timestamp  |
      | deliveredAt           | timestamp  |
      | locationHistory       | array      |

  @TRK-007 @security
  Scenario: Only order participants can view tracking
    Given order "ORD-001" belongs to John and Jane
    And another user "Bob" is logged in
    When Bob attempts to view tracking for "ORD-001"
    Then Bob should receive error "Unauthorized to view tracking"
    And HTTP status should be 403

  @TRK-008 @ui
  Scenario: Tracking button appears on all orders
    Given I am viewing my orders list
    Then each order should have "🗺️ Track Order" button
    And button should be visible for all order statuses
    And button should be styled consistently

  @TRK-009 @data_persistence
  Scenario: Driver location updates are stored
    Given driver updates location to coordinates:
      | lat | 40.7580 |
      | lng | -73.9855 |
    When driver is delivering order "ORD-001"
    Then location update should be stored in location_updates table with:
      | order_id  | ORD-001    |
      | driver_id | jane_id    |
      | latitude  | 40.7580    |
      | longitude | -73.9855   |
      | status    | in_transit |
      | created_at| timestamp  |

  @TRK-010 @api
  Scenario: Update driver location for order
    Given I am authenticated as assigned driver
    When I POST to "/api/orders/ORD-001/location" with:
      | latitude  | 40.7580 |
      | longitude | -73.9855 |
    Then I should receive success response
    And response should confirm:
      | message  | Location updated successfully |
      | location.latitude  | 40.7580            |
      | location.longitude | -73.9855           |
    And order's current_location should be updated

  @TRK-011 @validation
  Scenario: Only assigned driver can update order location
    Given another driver "Bob" is logged in
    And order is assigned to "Jane"
    When Bob attempts to update location for order
    Then Bob should receive error "Only assigned driver can update location"
    And location should not be updated

  @TRK-012 @ui
  Scenario: Location history shows driver's route
    Given driver has updated location multiple times:
      | timestamp           | lat     | lng      | status     |
      | 2025-10-19 11:30:00 | 40.7128 | -74.0060 | picked_up  |
      | 2025-10-19 11:35:00 | 40.7200 | -73.9900 | in_transit |
      | 2025-10-19 11:40:00 | 40.7300 | -73.9800 | in_transit |
      | 2025-10-19 11:45:00 | 40.7400 | -73.9700 | in_transit |
    When I view tracking modal
    Then I should see "Location History" section
    And history should show last 50 location updates
    And each update should show:
      | timestamp |
      | coordinates |
      | status |

  @TRK-013 @ui
  Scenario: Tracking modal is responsive
    Given I am on mobile device
    When I open tracking modal
    Then modal should fit screen width
    And modal should be scrollable
    And all content should be readable
    And buttons should be touch-friendly

  @TRK-014 @ui
  Scenario: Estimated delivery time is displayed
    Given order has estimated_delivery_date "2025-10-19T14:00:00Z"
    When I view tracking
    Then I should see "Estimated Delivery"
    And time should display as "Oct 19, 2:00 PM"
    And it should be clearly formatted

  @TRK-015 @integration
  Scenario: Tracking updates in real-time
    Given customer has tracking modal open
    When driver updates location
    Then customer should see updated location within 30 seconds
    And current location section should update
    And location history should append new entry

  @TRK-016 @ui
  Scenario: Status badge color matches order status
    When tracking shows status "pending_bids"
    Then badge should be yellow
    
    When status is "accepted"
    Then badge should be blue
    
    When status is "picked_up"
    Then badge should be orange
    
    When status is "in_transit"
    Then badge should be purple
    
    When status is "delivered"
    Then badge should be green

  @TRK-017 @ui
  Scenario: Empty state when no location available
    Given order status is "accepted"
    And driver has not updated location yet
    When I view tracking
    Then current location section should not be displayed
    Or should show "Location not available yet"

  @TRK-018 @ui
  Scenario: Timeline shows only relevant stages
    Given order status is "pending_bids"
    When I view tracking
    Then timeline should show:
      | ✓ Order Created |
      | ⏳ Bid Accepted  |
    And later stages should not be shown yet

  @TRK-019 @performance
  Scenario: Tracking modal loads quickly
    When I click "Track Order"
    Then modal should open within 500ms
    And tracking data should load within 1 second
    And UI should not freeze during loading

  @TRK-020 @ui
  Scenario: Loading state while fetching tracking data
    When I open tracking modal
    Then I should see loading spinner
    And loading message "Loading tracking information..."
    When data is loaded
    Then loading spinner should disappear
    And tracking information should display

  @TRK-021 @error_handling
  Scenario: Handle tracking data fetch error
    Given API returns error when fetching tracking
    When I attempt to open tracking modal
    Then I should see error message "Failed to get tracking information"
    And modal should still be closeable
    And I should be able to retry

  @TRK-022 @ui
  Scenario: Track Order button is visually distinct
    Given I am viewing order card
    Then "Track Order" button should have:
      | icon  | 🗺️                |
      | color | purple (#6366F1) |
      | style | rounded corners  |
    And button should stand out from other buttons

  @TRK-023 @data_validation
  Scenario: Location coordinates are validated
    When updating order location
    Then latitude must be between -90 and 90
    And longitude must be between -180 and 180
    And values must be numeric
    And precision should be 8 decimal places

  @TRK-024 @ui
  Scenario: Tracking modal has proper z-index
    Given tracking modal is open
    Then modal should appear above all other content
    And backdrop should prevent clicking through
    And modal should be centered on screen

  @TRK-025 @business_logic
  Scenario: Location updates only for active orders
    Given order status is "delivered"
    When driver attempts to update location
    Then update should be accepted (for logging)
    But it should not affect customer view
    # Allows drivers to continue updating after delivery

  @TRK-026 @ui
  Scenario: Timeline stages have consistent styling
    When I view timeline
    Then completed stages should have:
      | icon       | ✓ checkmark      |
      | color      | green (#10B981)  |
      | connector  | green line       |
    And pending stages should have:
      | icon       | gray circle      |
      | color      | gray (#9CA3AF)   |
      | connector  | gray line        |

  @TRK-027 @integration
  Scenario: Multiple location updates in sequence
    When driver updates location 5 times rapidly
    Then all 5 updates should be recorded
    And customer should see most recent location
    And location history should show all updates
    And no updates should be lost

  @TRK-028 @ui
  Scenario: Tracking accessible via keyboard
    Given I am using keyboard navigation
    When I press Tab to focus "Track Order" button
    And I press Enter
    Then tracking modal should open
    When I press Escape
    Then modal should close

  @TRK-029 @ui
  Scenario: Driver can view tracking of their active orders
    Given I am logged in as driver
    And I am assigned to order "ORD-001"
    When I click "Track Order"
    Then I should see same tracking information
    And I should see my location updates
    And I should see full timeline

  @TRK-030 @integration
  Scenario: Tracking works end-to-end
    # Complete workflow test
    Given order is created and accepted
    When driver marks as picked_up
    Then tracking should show "Picked Up" stage complete
    
    When driver updates location
    Then tracking should show current location
    
    When driver marks as in_transit
    Then tracking should show "In Transit" stage complete
    
    When driver marks as delivered
    Then tracking should show "Delivered" stage complete
    And all timestamps should be displayed
    And timeline should be complete