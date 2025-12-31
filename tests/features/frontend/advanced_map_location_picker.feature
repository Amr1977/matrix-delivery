@map_location @order_creation @advanced
Feature: Advanced Map-Based Location Picker for Order Creation
  As a customer
  I want an intuitive map interface to set pickup and delivery locations
  So that I can create precise delivery orders with visual confirmation

  Background:
    Given there is a registered customer account
    And the customer is logged in
    And the customer is on the order creation page

  @MAP-001
  Scenario: Map initializes with user's current location
    When I navigate to the order creation page
    Then the map should center on my current location
    And the map should display with default zoom level
    And location permission should be requested from the browser

  @MAP-002
  Scenario: Click on map to select pickup location
    Given I can see the pickup location section
    When I click on a location on the map for pickup
    Then the clicked position should be marked with a green marker
    And reverse geocoding should automatically fill the pickup address fields:
      | field          | filled |
      | country        | yes    |
      | city           | yes    |
      | area           | yes    |
      | street         | yes    |
      | building       | yes    |
    And a Google Maps URL should be generated and saved
    And the location data should be stored for order creation

  @MAP-003
  Scenario: Click on map to select delivery location with route calculation
    Given I have selected a pickup location
    When I click on a location on the map for delivery
    Then the clicked position should be marked with a red marker
    And reverse geocoding should automatically fill the delivery address fields
    And route calculation should start automatically
    And distance and time estimates should appear for all vehicle types:
      | vehicle | estimate shown |
      | walker  | yes           |
      | bicycle | yes           |
      | car     | yes           |
      | van     | yes           |
      | truck   | yes           |

  @MAP-004
  Scenario: Paste Google Maps link for location selection
    Given I have a Google Maps shared location link
    When I paste the link in the URL input field for pickup location
    Then the URL should be parsed automatically
    And the map should center on the parsed coordinates
    And a marker should appear at the exact location
    And address fields should be filled with reverse geocoding data

  @MAP-005
  Scenario: Use current location button
    Given location permissions are granted
    When I click the "Use Current Location" button
    Then my current browser location should be fetched
    And the map should center on my current location
    And a marker should be placed at my current location
    And address fields should be filled automatically

  @MAP-006
  Scenario: Route preview with vehicle time estimates
    Given I have selected both pickup and delivery locations
    When the route calculation completes
    Then I should see a visual route line on the map connecting both points
    And the total distance should be displayed
    And estimated walking time should be shown (5 km/h)
    And estimated bicycle time should be shown (15 km/h)
    And estimated driving times should be shown for all vehicle types

  @MAP-007
  Scenario: Remote area warning for delivery locations
    Given I select a delivery location in a rural area
    When the reverse geocoding completes
    Then a remote area warning should appear:
      | warning type   | shown           |
      | visual indicator | yes           |
      | text warning    | yes           |
      | checkbox toggle | yes           |
    And the warning should indicate potential delivery challenges

  @MAP-008
  Scenario: International order detection
    Given I select delivery location outside my country
    When the address fields are filled
    Then an international order indicator should appear
    And delivery agent filtering should account for international preferences

  @MAP-009
  Scenario: Location validation before order submission
    When I attempt to submit an order without selecting locations
    Then validation errors should appear:
      | error message                          |
      | Pickup location coordinates required  |
      | Delivery location coordinates required|
    And the form should not submit until locations are selected

  @MAP-010
  Scenario: Clear selected location
    Given I have selected a location on the map
    When I click the clear button
    Then the marker should be removed from the map
    And the address fields should be reset
    And any Google Maps URL should be cleared

  @MAP-011
  Scenario: Location privacy and security
    Given I have selected sensitive locations
    When the location data is processed
    Then coordinates should never be stored in browsers localStorage
    And API requests should use HTTPS
    And reverse geocoding should not expose personal location history

  @MAP-012
  Scenario: Map interface accessibility
    When I use keyboard navigation on the map interface
    Then I can tab through all interactive elements
    And I can navigate map with arrow keys
    And zoom controls should be keyboard accessible
    And screen readers should announce location selections

  @MAP-013
  Scenario: Mobile responsive map interface
    Given I view the map on a mobile device
    When I interact with the map picker
    Then the interface should be touch-optimized
    And address fields should have appropriate mobile input types
    And the map should respond to mobile gestures
    And map controls should be appropriately sized

  @MAP-014
  Scenario: Geocoding error handling
    Given the reverse geocoding service is temporarily unavailable
    When I click on the map to select a location
    Then an error message should appear:
      | error type      | user feedback                           |
      | service timeout | "Location detection failed, try again" |
      | network error   | "Network error, check connection"      |
      | invalid coords  | "Invalid location selected"            |
    And I should still be able to manually enter address fields
    And the order creation should continue

  @MAP-015
  Scenario: Route calculation with traffic awareness
    Given I calculate routes during peak hours
    When route calculation uses OSRM (Open Source Routing Machine)
    Then routes should account for typical road conditions
    And estimated times should reflect realistic city speeds
    And alternative routes should be displayed if available

  @MAP-016
  Scenario: Offline map functionality
    Given the user loses internet connection
    When trying to select locations on the map
    Then previously loaded map tiles should remain visible
    And offline geocoding cache should be used
    And user should be notified about limited functionality
    And offline coordinates should still be recorded

  @MAP-017
  Scenario: Large area delivery optimization
    Given pickup and delivery are in different cities
    When route calculation completes
    Then map should automatically adjust zoom to show entire route
    And intermediate waypoints should be suggested if beneficial
    And estimated costs should account for distance

  @MAP-018
  Scenario: Location address field editing after map selection
    Given I selected a location via map click
    When I manually edit any address fields
    Then the map marker should remain at the original click location
    And Google Maps URL should not be affected
    And coordinates should remain unchanged
    And a warning should indicate manual edits don't affect coordinates

  @MAP-019
  Scenario: Batch location processing
    Given I paste multiple Google Maps URLs
    When processing multiple locations
    Then a loading indicator should show processing status
    And locations should be processed one by one
    And success/error states should be clearly communicated
    And partial success should be allowed

  @MAP-020
  Scenario: Integration with order review and confirmation
    Given I have created an order with map-selected locations
    When reviewing the order before submission
    Then location data should be clearly displayed
    And Google Maps URLs should be clickable for verification
    And route distance and estimates should be shown
    And remote area warnings should be visible in review

  @MAP-021
  Scenario: Location data persistence in order creation flow
    Given I navigate between order creation steps
    When returning to location selection
    Then previously selected locations should be remembered
    And map markers should remain visible
    And address fields should retain their values

  @MAP-022
  Scenario: GPS coordinate precision and accuracy
    Given I select locations with high precision GPS
    When coordinates are processed and stored
    Then latitude/longitude should maintain 8 decimal places precision
    And reverse geocoding should use precise coordinates
    And distance calculations should use accurate haversine formula

  @MAP-023
  Scenario: Alternative map tile services fallback
    Given OpenStreetMap tiles are temporarily unavailable
    When the map loads
    Then fallback tile services should be used
    And map functionality should remain fully operational
    And user experience should not be impacted

  @MAP-024
  Scenario: Energy-efficient location tracking
    Given the location picker is active
    When processing location data
    Then location requests should minimize battery impact
    And continuous tracking should be avoided when not needed
    And location accuracy should balance with performance

  @MAP-025
  Scenario: Location-based fraud detection
    Given suspicious location selection patterns
    When processing location data
    Then coordinates should be validated against plausible delivery ranges
    And rapid location changes should be flagged as potential issues
    And location consistency should be checked across order creation steps
