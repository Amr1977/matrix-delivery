@backend @driver_discovery
Feature: Driver Location-based Order Discovery
  As a driver
  I want to see orders within my delivery range
  So that I can efficiently plan my deliveries

  Background:
    Given the platform is ready
    And a customer "Alice" exists
    And a driver "Bob" exists with location "30.0444, 31.2357"

  @location @filter
  Scenario: Driver sees orders within their maximum distance preference
    Given "Bob" has set max delivery distance to 10 km
    And "Alice" has created an order "Nearby Package" at location "30.0500, 31.2400"
    And the distance between "Bob" and order "Nearby Package" is approximately 1.5 km
    When "Bob" fetches available orders
    Then "Bob" should see order "Nearby Package" in the list

  @location @filter
  Scenario: Driver does not see orders outside their maximum distance
    Given "Bob" has set max delivery distance to 5 km
    And "Alice" has created an order "Far Package" at location "30.2000, 31.4000"
    And the distance between "Bob" and order "Far Package" is approximately 25 km
    When "Bob" fetches available orders
    Then "Bob" should NOT see order "Far Package" in the list

  @location @no_location
  Scenario: Driver without location sees only assigned orders
    Given driver "Charlie" exists without a set location
    And "Alice" has created an order "Any Package" priced at "60.00"
    And the order is in "pending_bids" status
    When "Charlie" fetches available orders without providing location
    Then "Charlie" should see an empty list or only assigned orders

  @location @preference
  Scenario: Driver with remote area preference sees remote orders
    Given "Bob" has set "accept_remote_areas" preference to true
    And "Alice" has created an order "Remote Delivery" tagged as "remote_area"
    When "Bob" fetches available orders
    Then "Bob" should see order "Remote Delivery" in the list

  @location @preference
  Scenario: Driver without remote area preference does not see remote orders
    Given "Bob" has set "accept_remote_areas" preference to false
    And "Alice" has created an order "Remote Delivery" tagged as "remote_area"
    When "Bob" fetches available orders
    Then "Bob" should NOT see order "Remote Delivery" in the list
