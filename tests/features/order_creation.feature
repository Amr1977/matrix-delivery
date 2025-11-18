@order_creation
Feature: Order Creation E2E
  As a customer
  I want to create delivery orders through the UI
  So that I can request delivery services

  Background:
    Given the P2P delivery platform is running
    And there is a registered customer account

  @ORD-001
  Scenario: Customer creates a complete delivery order
    Given I am logged in as a customer
    When I click the "Create New Order" button
    Then I should see the order creation form

    When I fill in the order details:
      | field             | value                    |
      | title             | Test Package Delivery   |
      | description       | Fragile electronics     |
      | package_desc      | Laptop and accessories  |
      | weight            | 2.5                     |
      | value             | 1500.00                 |
      | price             | 25.00                   |

    And I set the pickup location to:
      | country   | United States |
      | city      | New York      |
      | area      | Manhattan     |
      | street    | 5th Avenue    |
      | building  | 123           |
      | person    | John Doe      |

    And I set the delivery location to:
      | country   | United States |
      | city      | New York      |
      | area      | Brooklyn      |
      | street    | Atlantic Ave   |
      | building  | 456           |
      | person    | Jane Smith    |

    When I submit the order
    Then I should see a success message
    And the order should appear in my orders list
    And the order should have status "Pending Bids"

  @ORD-002
  Scenario: Order creation validation - missing required fields
    Given I am logged in as a customer
    When I click the "Create New Order" button
    And I try to submit an empty order form
    Then I should see validation errors for required fields:
      | field         |
      | title         |
      | price         |
      | pickup map    |
      | delivery map  |
      | pickup person |
      | delivery person |

  @ORD-003
  Scenario: Order creation validation - different countries
    Given I am logged in as a customer
    When I click the "Create New Order" button
    And I fill in valid order details
    And I set pickup location in "United States"
    And I set delivery location in "Canada"
    Then I should see an error "Pickup and delivery locations must be in the same country"

  @ORD-004
  Scenario: Order creation with map selection
    Given I am logged in as a customer
    When I click the "Create New Order" button
    And I click on the pickup location map
    Then I should be able to select a location on the map
    And the coordinates should be populated automatically
    And reverse geocoding should fill the address fields

  @ORD-005 @order_publishing
  Scenario: Customer publishes order with manual address entry
    Given I am logged in as a customer
    When I navigate to the order creation page
    Then I should see the enhanced order creation form

    When I fill in the basic order information:
      | field     | value                   |
      | title     | Laptop Delivery        |
      | price     | 25.00                  |

    And I select "Egypt" as the pickup country
    And I select "Cairo" as the pickup city
    And I select "Zamalek" as the pickup area
    And I enter "152 26th July Street" as pickup street
    And I enter "Building 15" as pickup building
    And I enter "Floor 5" as pickup floor
    And I enter "Apartment 12" as pickup apartment
    And I enter "Ahmed Hassan" as pickup contact name

    And I select "Egypt" as the delivery country
    And I select "Alexandria" as the delivery city
    And I select "Montaza" as the delivery area
    And I enter "Al Montazah Palace Street" as delivery street
    And I enter "Hotel Montazah" as delivery building
    And I enter " Reception" as delivery contact name

    And I click the "Publish Order" button
    Then I should see a success notification with "Order has been published successfully"
    And the order should be created in the database
    And the order should have a unique order number

  @ORD-006
  Scenario: Order creation validation with cascaded dropdowns
    Given I am logged in as a customer
    When I navigate to the order creation page
    And I try to submit without filling required fields

    Then I should see validation error messages:
      | error_type         | message                    |
      | title_required     | Order title is required   |
      | price_required     | Order price must be greater than $0 |
      | pickup_validation  | Pickup location missing: country, city, contact name |
      | delivery_validation | Delivery location missing: country, city, contact name |

    When I only fill the title field
    Then I should see price validation errors

    When I fill both title and price
    Then I should see pickup location validation errors

    When I fill pickup country and city
    Then I should see pickup contact name validation

    When I fill pickup contact name but not delivery details
    Then I should see delivery validation errors

  @ORD-007
  Scenario: Cascaded location dropdowns work correctly
    Given I am logged in as a customer
    When I navigate to the order creation page

    When I select "Egypt" as pickup country
    Then I should see cities dropdown populated with Egyptian cities
    And the area dropdown should be disabled

    When I select "Cairo" as pickup city
    Then I should see areas dropdown populated with Cairo areas
    And the street dropdown should be disabled

    When I select "Zamalek" as pickup area
    Then I should see streets dropdown populated with Zamalek streets

    When I clear the pickup country
    Then all pickup location dropdowns should be disabled except country

  @ORD-008
  Scenario: Map interaction updates address fields
    Given I am logged in as a customer
    When I navigate to the order creation page

    When I click on the pickup map at coordinates "30.0444,31.2357"
    Then reverse geocoding should populate pickup address fields
    And the map marker should appear at the clicked location

    When I drag the marker to new coordinates "30.0510,31.2380"
    Then the address fields should update automatically
    And the new location should be saved

  @ORD-009
  Scenario: Form validation debugging - automated test
    Given I am logged in as a customer
    When I navigate to the order creation page
    And I open browser developer console
    And I submit an empty order form
    Then I should see debug logs in browser console:
      | debug_message                   |
      | 🔍 Form submission debug:     |
      | Title:                        |
      | Has title? false              |
      | Has valid price? false        |
      | ❌ Title validation failed    |

    When I fill only the title "Test Order"
    And I submit the form
    Then I should see price validation failure in debug logs

    When I fill price "25.00"
    And I submit the form again
    Then I should see title validation pass but location validation fail

  @ORD-010
  Scenario: Complete order creation with map location picker
    Given I am logged in as a customer
    When I navigate to the order creation page
    Then I should see the enhanced order creation form with matrix styling

    When I fill in enhanced order information:
      | field                 | value                     |
      | title                 | Laptop Delivery Order    |
      | price                 | 35.00                    |
      | description           | Urgent laptop delivery  |
      | package_description   | MacBook Pro 13"          |
      | package_weight        | 1.5                      |
      | special_instructions  | Handle with care         |

    And I interact with pickup location map by clicking at "30.0444,31.2357"
    Then the pickup map location should be selected
    And pickup coordinates should be stored
    And pickup address fields should be populated via reverse geocoding

    And I interact with delivery location map by clicking at "30.0510,31.2380"
    Then the delivery map location should be selected
    And delivery coordinates should be stored

    When I submit the enhanced order
    Then I should see success modal with "Order Published Successfully"
    And the order should be created with both map coordinates and route info
    And the order should show estimated delivery time

  @ORD-011
  Scenario: Google Maps URL parsing integration
    Given I am logged in as a customer
    When I navigate to the order creation page

    When I paste a Google Maps URL "https://www.google.com/maps/place/30.0444,31.2357" in pickup location
    Then the URL should be parsed successfully
    And pickup coordinates should be extracted as "30.0444,31.2357"
    And pickup address should be populated via reverse geocoding

    When I paste another Google Maps URL "https://maps.google.com/?q=30.0510,31.2380" in delivery location
    Then the delivery coordinates should be extracted as "30.0510,31.2380"
    And delivery address should be populated

    When I submit with URL-parsed locations
    Then the order should be created successfully
    And route calculation should work between URL-parsed coordinates

  @ORD-012
  Scenario: Combined address entry and map selection
    Given I am logged in as a customer
    When I navigate to the order creation page

    # Test manual address entry
    When I manually enter pickup address:
      | field     | value            |
      | country   | Egypt            |
      | city      | Cairo            |
      | area      | Zamalek          |
      | street    | 26th July St     |
      | building  | Building 15      |
      | person    | Ahmed Hassan     |

    Then pickup location should be geocoded and map marker should appear

    # Test manual address entry for delivery
    When I manually enter delivery address:
      | field     | value            |
      | country   | Egypt            |
      | city      | Alexandria       |
      | area      | Montaza          |
      | street    | Palace Road      |
      | building  | Hotel Montaza    |
      | person    | Reception Desk   |

    Then delivery location should be geocoded and map marker should appear
    And route preview should show estimated time and distance

    When I submit the combined order
    Then both address-based and geocoded locations should be saved
    And order creation should succeed

  @ORD-013
  Scenario: Route preview and estimation
    Given I am logged in as a customer
    When I navigate to the order creation page

    When I set pickup at "Cairo, Egypt" and delivery at "Alexandria, Egypt"
    Then route calculation should start automatically
    And I should see loading indicator for route calculation

    When route calculation completes
    Then route preview should show:
      | info_type           | expected_content         |
      | distance            | approximately 215 km    |
      | vehicle_estimates   | car, bicycle, walking   |
      | fastest_option      | car estimate            |
      | route_map           | visible route on map    |

    When I submit with route information
    Then route data should be saved with the order
    And delivery estimates should be visible in order details
