@location @driver
Feature: Driver Location Tracking and Distance-Based Order Filtering
  As a driver
  I want to update my location and only see orders within 5 km
  So that I can efficiently find nearby delivery opportunities

  Background:
    Given there is a registered customer account
    And there is a registered driver account

  @LOC-001
  Scenario: Driver updates location manually
    Given I am logged in as a driver
    When I click the update location button
    And I grant location permission
    Then my location should be updated successfully
    And I should see the location permission as granted
    And my coordinates should be displayed

  @LOC-002
  Scenario: Driver views available orders with distance display
    Given there are customer orders available
    And I am logged in as a driver
    When I view the available bids tab
    Then I should see only orders within 5 km of my location
    And each nearby order should show the distance to pickup location
    And orders should be highlighted with location information

  @LOC-003
  Scenario: Driver with no location permission sees limited orders
    Given I am logged in as a driver
    And I have not granted location permission
    When I view the available bids tab
    Then I should see orders marked for bidding
    And distance information should not be shown
    And I should be prompted to enable location

  @LOC-004
  Scenario: Orders outside 5km radius are hidden from driver
    Given there are customer orders available at various locations
    And I am logged in as a driver with location set
    When I view the available bids tab
    Then I should not see orders that are more than 5km away
    And I should only see nearby orders with distance information

  @LOC-005
  Scenario: Driver switches between tabs (Active, Bidding, History)
    Given I am logged in as a driver
    When I click on the "Active Orders" tab
    Then I should see my currently assigned deliveries
    When I click on the "Available Bids" tab
    Then I should see orders available for bidding within range
    And orders should show distance information when available
    When I click on the "My History" tab
    Then I should see my completed deliveries

  @LOC-006
  Scenario: Driver manually updates location multiple times
    Given I am logged in as a driver
    And I have granted location permission
    When I update my location
    Then my coordinates should be updated
    And nearby orders should be refreshed
    And distance calculations should be recalculated

  @LOC-007
  Scenario: Customer orders show up for drivers within radius
    Given there is a completed delivery in the system
    And there is a customer order within 5km of the driver location
    When the driver views available bids
    Then the nearby order should be displayed with distance information
    And the order should be marked as available for bidding
    And the driver should be able to place a bid on the order

  @LOC-008
  Scenario: Driver location tracking and order filtering integration
    Given multiple customer orders exist at different locations
    And I am logged in as a driver
    When I update my location
    Then the system should automatically filter orders within 5km
    And I should see distance information for each nearby order
    And orders outside the radius should be hidden

  @LOC-009
  Scenario: Location permission denied handling
    Given I am logged in as a driver
    When I try to update my location
    But I deny location permission
    Then I should see a location access denied message
    And the location status should show as denied
    And I should still be able to view orders but without distance filtering

  @LOC-010
  Scenario: Location services unavailable
    Given location services are unavailable or disabled
    And I am logged in as a driver
    When I try to update my location
    Then I should see a location unavailable message
    And I should still be able to view all available orders
    And distance information should not be displayed

  @LOC-011
  Scenario: Distance sorting and display accuracy
    Given there are multiple orders within 5km of my location
    And I am logged in as a driver
    When I view the available bids tab
    Then orders should show accurate distance information
    And distances should be calculated correctly
    And orders should be easily distinguishable by proximity
