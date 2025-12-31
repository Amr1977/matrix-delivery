Feature: Map Location Picker
  As a user creating delivery orders
  I want to use an interactive map to select locations
  So that I can accurately specify pickup and delivery addresses

  Background:
    Given I am logged in as a customer
    And the map location picker feature is enabled

  @smoke @map-location-picker
  Scenario: Successfully reverse geocode coordinates on map click
    Given I am on the order creation page
    When I click on a location on the map at coordinates (30.0131, 31.2089)
    Then the reverse geocoding API should be called
    And I should see the address details for "Salah Salem Street, Giza"
    And the location should be marked on the map

  @smoke @map-location-picker
  Scenario: Calculate route between pickup and delivery locations
    Given I have selected a pickup location at "Giza, Egypt"
    When I select a delivery location at "Cairo Center, Egypt"
    Then the route calculation API should be called
    And I should see an estimated delivery time
    And I should see the distance between locations
    And the route should be displayed on the map

  @map-location-picker @regression
  Scenario: Parse Google Maps URL and extract coordinates
    Given I have a Google Maps URL "https://www.google.com/maps?q=30.0444,31.2357"
    When I paste the URL into the location input field
    Then the system should extract the coordinates (30.0444, 31.2357)
    And reverse geocode to get the address information

  @map-location-picker @regression
  Scenario: Handle map location favorites
    Given I have previously used "Al-Azhar University" as a delivery location
    When I start creating a new order
    Then I should see "Al-Azhar University" in my recent locations
    And I should be able to select it directly without clicking on the map

  @map-location-picker @edge-cases
  Scenario: Handle coordinates in remote/rural areas
    Given I click on coordinates in a rural area (25.6894, 32.6399)
    When the reverse geocoding is performed
    Then the system should detect this as a remote area
    And the delivery parameters should be adjusted accordingly

  @map-location-picker @edge-cases
  Scenario: Handle international delivery locations
    Given I select a pickup location in Egypt
    And I select a delivery location in Saudi Arabia
    Then the system should identify this as an international delivery
    And appropriate delivery options should be presented

  @map-location-picker @error-handling
  Scenario: Handle failed reverse geocoding
    Given the external geocoding service is temporarily unavailable
    When I click on a location on the map
    Then I should see a fallback address format using coordinates
    And the order creation should still be possible

  @map-location-picker @error-handling
  Scenario: Handle invalid coordinates
    Given I try to use coordinates outside the valid range (lat: 91, lng: 181)
    When the location is processed
    Then I should see an error message about invalid coordinates
    And the location selection should be reset

  @map-location-picker @performance
  Scenario: Handle map loading performance
    Given the map component is loaded on the order page
    When the page is loading for the first time
    Then the map should load within 3 seconds
    And all map controls should be responsive

  @map-location-picker @driver-preferences
  Scenario: Driver filters orders based on distance preferences
    Given I am a driver with max delivery distance set to 50km
    When orders are available for bidding
    Then I should only see orders within 50km of my current location
    And orders beyond 50km should be filtered out

  @map-location-picker @driver-preferences
  Scenario: Driver avoids remote area deliveries
    Given I am a driver who has opted out of remote area deliveries
    When orders are listed for bidding
    Then remote area orders should be hidden from my view
    And only urban area deliveries should be visible

  @map-location-picker @integration
  Scenario: Complete order creation with map-selected locations
    Given I have selected pickup and delivery locations using the map
    And route information has been calculated
    When I fill in the remaining order details
    And I submit the order
    Then the order should be created successfully
    And the location data should be stored correctly
    And both pickup and delivery addresses should be saved

  @map-location-picker @mobile
  Scenario: Use map location picker on mobile device
    Given I am using the application on a mobile device
    When I access the order creation map
    Then the map should be fully functional on mobile
    And touch interactions should work correctly
    And the map should be responsive to screen size

  @map-location-picker @accessibility
  Scenario: Map location picker accessibility
    Given I am a user relying on screen reader
    When I interact with the map location picker
    Then all interactive elements should have proper ARIA labels
    And keyboard navigation should be supported
    And color contrast should meet accessibility standards

  @map-location-picker @localization
  Scenario: Map location picker localization
    Given I have set my application language to Arabic
    When I use the map location picker
    Then all map-related text should appear in Arabic
    And address display should support Arabic text
    And location search should work with Arabic input
