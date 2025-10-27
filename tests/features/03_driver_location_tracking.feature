@driver_location @implemented
Feature: Driver Location Tracking and Order Filtering
  As a driver
  I want to update my location and view nearby orders
  So that I can find delivery opportunities efficiently

  Background:
    Given the P2P delivery platform is running
    And the database is clean and initialized
    And test driver "Jane Driver" is logged in with email "jane@example.com"
    And the system time is "2025-10-19T12:00:00Z"

  @LOC-001 @smoke @critical_path
  Scenario: Driver updates location manually
    Given I am on the driver dashboard
    And I have location permission granted
    When I click "Update Location" button
    Then my browser should request geolocation permission
    And my location should be updated to coordinates:
      | lat | 40.7128 |
      | lng | -74.0060 |
    Then I should see success indicator "Location Updated"
    And the button should turn green
    And I should see my coordinates displayed:
      """
      📍 Lat: 40.7128, Lng: -74.0060
      """
    And my location should be stored in driver_locations table

  @LOC-002 @ui
  Scenario: Driver location permission denied
    Given I am on the driver dashboard
    And I have not granted location permission
    When I click "Update Location" button
    Then my browser should request location permission
    When I deny the permission
    Then I should see error message "Location access denied"
    And the location status should show "❌ Location access denied"
    And the button should remain blue (not updated)
    And I should see warning "Enable location for better order visibility"

  @LOC-003 @ui
  Scenario: Driver with no location sees limited interface
    Given I have not updated my location
    When I view the driver dashboard
    Then I should see "Enable location for better order visibility" message
    And the "Update Location" button should be prominently displayed
    And I should not see distance information on orders

  @LOC-004 @integration
  Scenario: Location update triggers order list refresh
    Given I am viewing available orders
    When I update my location to:
      | lat | 40.7128 |
      | lng | -74.0060 |
    Then the available orders list should refresh automatically
    And I should see only orders within 5km of my location
    And each order should show distance to pickup location

  @LOC-005 @data_persistence
  Scenario: Driver location persists across sessions
    Given I have updated my location to:
      | lat | 40.7128 |
      | lng | -74.0060 |
    When I logout and login again
    Then my saved location should be displayed
    And the last updated timestamp should be shown
    And location should be retrieved from driver_locations table

  @LOC-006 @api
  Scenario: Get driver current location via API
    Given I have updated my location to:
      | lat | 40.7580 |
      | lng | -73.9855 |
    When I request my location at endpoint "/api/drivers/location"
    Then I should receive response:
      | latitude    | 40.7580 |
      | longitude   | -73.9855 |
      | lastUpdated | 2025-10-19T12:00:00Z |

  @LOC-007 @api @validation
  Scenario: Update driver location via API with valid coordinates
    Given I am authenticated as a driver
    When I POST to "/api/drivers/location" with:
      | latitude  | 40.7128 |
      | longitude | -74.0060 |
    Then I should receive success response "Location updated successfully"
    And the response should include:
      | latitude  | 40.7128 |
      | longitude | -74.0060 |

  @LOC-008 @validation
  Scenario: Location update fails with invalid coordinates
    Given I am authenticated as a driver
    When I attempt to update location with invalid data:
      | latitude  | 95.0000 |  # Invalid: > 90
      | longitude | -74.0060 |
    Then I should receive error "Invalid coordinates"
    And my location should not be updated

  @LOC-009 @validation
  Scenario: Non-driver cannot update driver location
    Given I am logged in as a customer
    When I attempt to POST to "/api/drivers/location"
    Then I should receive error "Only drivers can update location"
    And HTTP status code should be 403

  @LOC-010 @security
  Scenario: Unauthorized access to driver location endpoints
    Given I am not logged in
    When I attempt to access "/api/drivers/location"
    Then I should receive error "No token provided"
    And HTTP status code should be 401

  @LOC-011 @ui
  Scenario: Multiple location updates
    Given I have updated my location once
    When I click "Update Location" button again
    Then my new location should replace the old one in database
    And the "last updated" timestamp should be current
    And I should see confirmation of successful update

  @LOC-012 @data_validation
  Scenario: Location coordinates are validated
    When I attempt to update location with coordinates:
      | latitude  | <lat>  |
      | longitude | <lng>  |
    Then the result should be <result>

    Examples:
      | lat      | lng       | result  |
      | 40.7128  | -74.0060  | success |
      | 0        | 0         | success |
      | 90       | 180       | success |
      | -90      | -180      | success |
      | 91       | 0         | error   |
      | 0        | 181       | error   |
      | -91      | 0         | error   |
      | 0        | -181      | error   |

  @LOC-013 @ui
  Scenario: Location permission status is clearly displayed
    Given I am on the driver dashboard
    When location permission is granted
    Then I should see "📍 Lat: X.XXXX, Lng: Y.YYYY"
    
    When location permission is denied
    Then I should see "❌ Location access denied"
    
    When location permission is not yet requested
    Then I should see "⚠️ Enable location for better order visibility"

  @LOC-014 @performance
  Scenario: Location update completes quickly
    Given I am on the driver dashboard
    When I click "Update Location" button
    Then the location should be updated within 3 seconds
    And I should see immediate UI feedback (loading state)
    And success message should appear after update completes

  @LOC-015 @ui @integration
  Scenario: Location indicator on driver dashboard header
    Given I have updated my location
    When I view any page of the driver dashboard
    Then I should see my location status in the header
    And I should be able to update location from any page
    And location button should be easily accessible