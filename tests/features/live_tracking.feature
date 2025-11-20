Feature: Live Driver Tracking for Customers
  As a customer with an active order in progress
  I want to see live tracking of my driver on a map
  So that I can monitor the delivery progress in real-time

  Background:
    Given the Matrix Delivery system is running
    And I am a registered customer
    And I have an active order assigned to a driver
    And the driver has started tracking

  Scenario: Customer views live tracking map for active order
    When I navigate to my order details
    And I click on "Track Order"
    Then I should see a live tracking map
    And I should see the driver's current location marked on the map
    And I should see the pickup location marked on the map
    And I should see the delivery location marked on the map

  Scenario: Customer sees driver's route progress
    When the driver starts moving after pickup
    And location updates are sent periodically
    Then I should see the actual route taken by the driver (Polyline)
    And I should see the expected route to destination
    And the map should auto-center on the driver's current location

  Scenario: Customer sees ETA and distance information
    When the driver is in transit
    Then I should see the estimated time to delivery
    And I should see the remaining distance to destination
    And ETA should update based on driver's speed and current location

  Scenario: Customer sees route step progression
    When the order is accepted
    Then "Pickup" should show as "upcoming"
    And "Delivery" should show as "upcoming"

    When the order is picked up
    Then "Pickup" should show as "completed"
    And "Delivery" should show as "upcoming"
    And ETA should show for delivery location

    When the order is delivered
    Then both steps should show as "completed"
    And ETA should not be displayed

  Scenario: Customer tracks driver without tracking started
    When I view tracking for an order where tracking hasn't started
    Then I should see an error message "Driver has not started tracking yet"
    But I should still see pickup and delivery locations on the map

  Scenario Outline: Customer sees live tracking with different speeds
    Given the driver is moving at <speed> km/h
    When location updates are sent
    Then the ETA should be calculated based on <expected_time> minutes
    And speed should be displayed on driver marker popup

    Examples:
      | speed | expected_time |
      | 25    | 60           |
      | 15    | 100          |
      | 40    | 37           |

  Scenario: Customer sees loading states
    When tracking data is loading
    Then I should see a loading spinner
    And "Loading tracking data..." message
    And "Connecting to live tracking system" subtitle

  Scenario: Customer sees real-time updates
    Given tracking is active
    When the driver sends location updates
    Then the map should auto-refresh based on order status
    And the auto-refresh message should display the correct seconds

  Scenario: Map auto-adjusts bounds for route visibility
    Given there are location points across the map
    When the map loads
    Then all route points should be visible
    And map should fit bounds with padding
    And zoom level should be appropriate for route view

  Scenario: Customer views driver information on map
    When I hover over or click the driver marker
    Then I should see a popup with:
      | Driver name                   |
      | Vehicle type                 |
      | Current speed                |
      | Last location update time    |
      | GPS accuracy                 |

  Scenario: Tracking stops when order is completed
    When the order status becomes "delivered"
    Then location tracking should stop
    But the final route should remain visible
    And completed status should be shown for all steps

  Scenario: Handle offline or lost GPS signal
    When driver temporarily loses GPS signal
    Then previous location should remain visible
    And ETA should be based on last known position
    And map should indicate signal issues if applicable

  Scenario: Multiple active orders tracking
    Given I have multiple active orders
    When I view tracking for different orders
    Then each order should show independent tracking
    And each map should show its respective route
    And different drivers should be tracked separately
