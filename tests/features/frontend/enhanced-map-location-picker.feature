@map_location @order_creation @enhanced @drag_drop @cascaded_dropdowns
Feature: Enhanced Map-Based Location Picker with Cascaded Dropdowns
  As a customer creating delivery orders
  I want an intuitive map interface with smart cascaded address selection
  So that I can precisely and efficiently set pickup and delivery locations

  Background:
    Given there is a registered customer account
    And the customer is logged in
    And the customer is on the enhanced order creation page

  @ENHANCED-MAP-001 @drag_drop
  Scenario: Map initializes with user's current location and drag-and-drop markers
    When I navigate to the enhanced order creation page
    Then the map should center on my current location with default zoom level
    And location permission should be requested from the browser
    And I should see a green pickup marker that is draggable
    And I should see a red delivery marker that is draggable
    And both markers should have visual feedback during dragging

  @ENHANCED-MAP-002 @drag_drop @reverse_geocode
  Scenario: Drag pickup marker updates address fields automatically
    Given I can see the pickup location section on the enhanced map
    When I drag the green pickup marker to a new location on the map
    Then reverse geocoding should automatically fill pickup address fields:
      | field          | filled |
      | country        | yes    |
      | city           | yes    |
      | area           | yes    |
      | street         | yes    |
      | building       | yes    |
    And a Google Maps URL should be generated and saved
    And the coordinate data should be updated for order creation

  @ENHANCED-MAP-003 @drag_drop @bidirectional
  Scenario: Drag delivery marker with automatic route calculation
    Given I have set a pickup location via marker drag
    When I drag the red delivery marker to a new location on the map
    Then reverse geocoding should automatically fill delivery address fields
    And route calculation should start automatically between the two marker positions
    And distance and time estimates should appear for all vehicle types:
      | vehicle | estimate shown |
      | walker  | yes           |
      | bicycle | yes           |
      | car     | yes           |
      | van     | yes           |
      | truck   | yes           |

  @ENHANCED-MAP-004 @cascaded_dropdowns @forward_geocode
  Scenario: Cascaded country selection loads city options
    Given I am in manual address entry mode
    When I select "Egypt" from the country dropdown
    Then the city dropdown should become enabled
    And the city dropdown should load cities from Egypt (e.g., "Cairo", "Alexandria", "Giza")
    And area and street dropdowns should remain disabled
    And selecting a country should clear previously selected city, area, and street

  @ENHANCED-MAP-005 @cascaded_dropdowns @forward_geocode
  Scenario: Cascaded city selection loads area options and updates map
    Given I have selected "Egypt" as country
    When I select "Cairo" from the city dropdown
    Then the area dropdown should become enabled
    And the area dropdown should load areas from Cairo (e.g., "Tahrir Square", "Zamalek", "Maadi")
    And the map should automatically center on the selected city
    And the pickup marker should move to the approximate city center
    And street dropdown should remain disabled

  @ENHANCED-MAP-006 @cascaded_dropdowns @forward_geocode
  Scenario: Cascaded area selection loads street options
    Given I have selected "Egypt" and "Cairo" as country and city
    When I select "Downtown" from the area dropdown
    Then the street dropdown should become enabled
    And the street dropdown should load streets from Downtown Cairo
    And the map should center more precisely on the selected area
    And the pickup marker should move to the area center

  @ENHANCED-MAP-007 @cascaded_dropdowns @forward_geocode @bidirectional
  Scenario: Complete cascaded selection updates map and creates order
    Given I have completed the full cascaded selection for pickup:
      | level   | selection        |
      | country | Egypt           |
      | city    | Cairo           |
      | area    | Tahrir Square   |
      | street  | Tahrir Street   |
    When the cascaded selection completes
    Then the map should show a precise location pin for Tahrir Street
    And reverse geocoding should validate and correct any minor coordinate discrepancies
    And I should be able to proceed with order creation using this cascaded address data

  @ENHANCED-MAP-008 @bidirectional @hybrid_input
  Scenario: Switching between map mode and manual cascaded mode
    Given I have set a location using the map marker
    When I switch to manual cascaded entry mode
    Then the cascaded dropdowns should be pre-populated with the map-selected location data:
      | dropdown | pre_populated |
      | country  | from map data |
      | city     | from map data |
      | area     | from map data |
      | street   | from map data |
    And the map marker should remain at the current position
    And any changes in cascaded fields should update the map marker position

  @ENHANCED-MAP-009 @bidirectional @address_override
  Scenario: Manual address editing overrides map coordinates
    Given I have set a location using cascaded dropdowns
    When I manually edit the building number or floor fields
    Then forward geocoding should attempt to find the more precise location
    And the map marker should move to the refined coordinates
    And success/failure feedback should be provided to the user
    And coordinates should remain locked to the original dropdown selection if geocoding fails

  @ENHANCED-MAP-010 @validation @error_handling
  Scenario: Required field validation with cascaded dropdowns
    Given I am filling pickup location using cascaded dropdowns
    When I attempt to proceed without selecting required fields
    Then validation errors should appear for missing required fields:
      | field      | required | error message                    |
      | country    | yes      | "Country is required"           |
      | city       | yes      | "City is required"              |
      | person name| yes      | "Contact name is required"      |
    And the city dropdown should be disabled until country is selected
    And the form should highlight missing required cascading fields

  @ENHANCED-MAP-011 @error_handling @geocoding_failure
  Scenario: Handling geocoding service failures
    Given the forward geocoding service encounters temporary issues
    When I complete a cascaded address selection
    Then the location should still be accepted with original coordinates
    And a warning should indicate reduced location precision
    And the order creation should continue without blocking
    And the user should be notified that location refinement failed

  @ENHANCED-MAP-012 @performance @caching
  Scenario: Efficient location data loading and caching
    Given I have previously used the system for Egypt locations
    When I select Egypt again as my country
    Then previously loaded Egypt cities should appear immediately
    And previously geocoded locations should be available offline
    And subsequent selections should be faster due to caching
    And backend API calls should be minimized through intelligent caching

  @ENHANCED-MAP-013 @international @validation
  Scenario: International address support with cascaded validation
    Given I need to create an international delivery order
    When I select a different country for pickup and delivery
    Then validation should detect international orders
    And a warning should appear about potential delivery limitations
    And cascaded dropdowns should work for different countries
    And international delivery considerations should be displayed

  @ENHANCED-MAP-014 @location_persistence @session
  Scenario: Location data persistence across form interactions
    Given I have set pickup and delivery locations
    When I navigate between different form sections (order details, package info, etc.)
    Then the selected locations should remain on the map
    And marker positions should be preserved
    And cascaded dropdown selections should be maintained
    And location data should survive page refreshes within the session

  @ENHANCED-MAP-015 @accessibility @keyboard
  Scenario: Keyboard navigation and screen reader support
    When I use keyboard navigation in the cascaded dropdown system
    Then I can tab through country, city, area, street dropdowns sequentially
    And arrow keys should work within open dropdowns
    And Enter/Space should select dropdown options
    And screen readers should announce selected values and available options
    And visual focus indicators should be clearly visible

  @ENHANCED-MAP-016 @mobile @touch_optimization
  Scenario: Touch-optimized interface for mobile devices
    Given I am using the system on a mobile device
    When I interact with cascaded dropdowns and map
    Then dropdown options should be touch-friendly with adequate spacing
    And map drag operations should respond accurately to touch gestures
    And cascaded selection should work smoothly on small screens
    And confirmation of selections should be easy with touch interfaces

  @ENHANCED-MAP-017 @bulk_operations @multiple_locations
  Scenario: Handling multiple location operations efficiently
    Given I need to set multiple similar locations
    When I perform batch geocoding operations
    Then loading states should be clearly communicated
    And progress indicators should show operation status
    And partial failures should not stop entire workflows
    And successful results should be cached for similar future operations

  @ENHANCED-MAP-018 @integration @order_submission
  Scenario: Complete order creation with enhanced location data structure
    Given I have set both pickup and delivery locations using cascaded dropdowns
    When I submit the order creation form
    Then the new enhanced location data structure should be preserved:
      | data_type       | included |
      | coordinates     | yes      |
      | country         | yes      |
      | city            | yes      |
      | area            | yes      |
      | street          | yes      |
      | building number | yes      |
      | floor           | yes      |
      | apartment       | yes      |
      | contact name    | yes      |
      | Google Maps URL | yes      |
    And route distance and estimates should be included in order data
    And the order should be successfully created and bid upon by drivers

  @ENHANCED-MAP-019 @data_consistency @backward_compatibility
  Scenario: Backward compatibility with existing order data
    Given there are existing orders with simpler location data
    When I view these orders in the enhanced interface
    Then existing orders should display correctly
    And any missing cascaded data should be handled gracefully
    And upgrade prompts should be available for enhanced location data
    And both old and new location data structures should coexist

  @ENHANCED-MAP-020 @search_integration @google_places_placeholder
  Scenario: Placeholder for future Google Places API integration
    Given the system has basic Nominatim geocoding
    When integrated with Google Places API in the future
    Then smart suggestions should appear as I type in address fields
    And business names should be included in address selections
    And address completion should be more accurate and comprehensive
    And POI (points of interest) should be easily selectable

  @ENHANCED-MAP-021 @route_optimization @preview_enhancement
  Scenario: Enhanced route preview with interactive elements
    Given I have selected pickup and delivery locations
    When I view the route preview section
    Then I should see clickable vehicle type estimates
    And route visualization should include distance markers
    And time estimates should be selectable for different traffic conditions
    And drivers should receive optimized route data with waypoints if beneficial

  @ENHANCED-MAP-022 @remote_area_detection @special_handling
  Scenario: Automatic remote/rural area detection and warnings
    Given I select a location in a rural or remote area
    When the system geolocates the coordinates
    Then remote area detection should trigger automatically
    And visual warnings should appear about delivery challenges
    And enhanced pricing suggestions should be offered
    And drivers with remote area preferences should be prioritized

  @ENHANCED-MAP-023 @energy_efficiency @location_sampling
  Scenario: Energy-efficient location operations
    Given the map location picker is active for an extended period
    When processing continuous location queries
    Then battery impact should be minimized through intelligent sampling
    And location accuracy should balance with performance requirements
    And unnecessary re-geocoding should be avoided when coordinates are similar
    And offline location caching should be utilized when available

  @ENHANCED-MAP-024 @security @location_privacy
  Scenario: Location data privacy and security
    Given I have set sensitive location coordinates
    When location data is processed and stored
    Then coordinates should never be stored in browser localStorage
    Then location data should use HTTPS encryption for all API calls
    And reverse geocoding should not expose personal location history
    And location data should be encrypted at rest in the database

  @ENHANCED-MAP-025 @monitoring @analytics
  Scenario: Location selection analytics and optimization
    Given users are creating orders with enhanced location data
    When the system collects usage analytics
    Then popular location patterns should be analyzed
    And location completion success rates should be tracked
    And geocoding performance should be monitored
    And system optimizations should be implemented based on real usage patterns
