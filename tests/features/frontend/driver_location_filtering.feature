@location @driver
Feature: Driver Location-based Order Filtering
  As a delivery agent
  I want to filter available orders for bidding by Country, City, and Area
  So that I can focus on orders in my preferred areas that need to be picked up from

  Background:
    Given the delivery system is operational
    And we have existing orders available for bidding
    And I am logged in as a driver named "Ahmed"
    And I have location access permissions enabled

  Scenario: Filtering orders by country
    When I view the available bids tab
    And I select "Egypt" from the country filter dropdown
    Then I should only see orders where either pickup or delivery is in Egypt

  Scenario: Cascading filter behavior - country then city
    When I view the available bids tab
    And I first select "Egypt" from the country filter
    Then the city filter becomes enabled
    And the city filter only shows cities in Egypt
    When I select "Cairo" from the city filter dropdown
    Then I should only see orders where either pickup or delivery is in Egypt and Cairo

  Scenario: Cascading filter behavior - country, city then area
    When I view the available bids tab
    And I first select "Egypt" from the country filter
    And I select "Alexandria" from the city filter
    Then the area filter becomes enabled
    And the area filter only shows areas in Alexandria, Egypt
    When I select "Smouha" from the area filter dropdown
    Then I should only see orders where either pickup or delivery is in Smouha, Alexandria, Egypt

  Scenario: Automatic filter prefill based on current location
    When I click the "Detect My Location" button
    And geolocation is successful and returns coordinates for "Cairo, Egypt"
    Then the country filter should automatically select "Egypt"
    And after a brief delay, the city filter should select "Cairo"

  Scenario: Clear filters when changing higher-level selections
    When I have selected a country, city, and area
    And I change the country selection to a different country
    Then the city filter should reset to "All Cities"
    And the area filter should reset to "All Areas" and become disabled

  Scenario: No orders available for selected location
    When I select a location combination with no available orders
    Then I should see a message indicating no orders are available in the selected area

  Scenario: Active filter indicators
    When I have multiple filters selected
    Then I should see active filter indicators showing all applied filters
    And each filter should display appropriately (country → city → area)

  Scenario: Manual vs automatic filter switching
    When I manually select filters first
    And then click "Detect My Location"
    Then the manual selections should be overridden by automatic detection

  Scenario: Filter persistence across tab switches
    When I set location filters on the bidding tab
    And I switch to active orders tab then back to bidding
    Then my previously set filters should remain active

  Scenario: Filter reset functionality
    When I have active filters and want to reset them
    And I select "All Countries" from the country dropdown
    Then all filters should be reset to show all available orders
