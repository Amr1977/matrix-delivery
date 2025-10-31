@address_input
Feature: Address Input Validation
  As a customer creating a delivery order
  I want to enter detailed address information
  So that my delivery locations are accurately specified

  Background:
    Given the P2P delivery platform is running
    And I am logged in as a customer

  @ADDR-001
  Scenario: Fill detailed pickup address with full text input
    When I click on "Create New Order"
    And I open the pickup location details
    And I fill in the pickup address fields:
      | field          | value              |
      | Country        | Iraq               |
      | City           | Baghdad            |
      | Area           | Al-Mansour         |
      | Street         | Al-Rashid Street   |
      | Building Number| 123                |
      | Floor          | 5th Floor          |
      | Apartment      | Apartment 12B      |
      | Person Name    | Ahmed Al-Rashid    |
    Then all pickup address fields should contain the entered values
    And no field should be truncated to first letter only

  @ADDR-002
  Scenario: Fill detailed delivery address with full text input
    When I click on "Create New Order"
    And I open the delivery location details
    And I fill in the delivery address fields:
      | field          | value              |
      | Country        | United Arab Emirates |
      | City           | Dubai              |
      | Area           | Business Bay       |
      | Street         | Sheikh Zayed Road  |
      | Building Number| 456                |
      | Floor          | Ground Floor       |
      | Apartment      | Office 789         |
      | Person Name    | Fatima Al-Zahra    |
    Then all delivery address fields should contain the entered values
    And no field should be truncated to first letter only

  @ADDR-003
  Scenario: Address input accepts long text strings
    When I click on "Create New Order"
    And I open the pickup location details
    And I enter a long street address "123 Main Street, Downtown District, Near Central Park"
    And I enter a long person name "Dr. Muhammad Abdul Rahman Al-Hassan"
    Then the street field should contain the full long text
    And the person name field should contain the full long text

  @ADDR-004
  Scenario: Address input handles special characters
    When I click on "Create New Order"
    And I open the pickup location details
    And I fill in address fields with special characters:
      | field          | value              |
      | Street         | Calle 123 ñoños    |
      | Building Number| 456-A              |
      | Person Name    | José María González|
    Then all fields should accept and display special characters correctly

  @ADDR-005
  Scenario: Address input validation prevents empty required fields
    When I click on "Create New Order"
    And I attempt to submit the order without filling required address fields
    Then I should see validation errors for empty required fields
    And the order should not be created

  @ADDR-006
  Scenario: Address input maintains values during form navigation
    When I click on "Create New Order"
    And I fill in pickup address fields
    And I navigate away and back to the form
    Then all previously entered address values should be preserved
