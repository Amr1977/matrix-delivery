@ui_verification
Feature: UI Element Verification
  As a user
  I want to see proper UI elements
  So that I can verify the application is working correctly

  Background:
    Given the P2P delivery platform is running

  @UI-001
  Scenario: Version footer is visible on all pages
    Given I am on the Matrix Delivery homepage
    Then I should see the version footer with text "Matrix Delivery v1.0.0"
    And the footer should contain commit hash "0cc5c8d"
    And the footer should display today's date

  @UI-002
  Scenario: Footer is visible after login
    Given I am a registered user with:
      | email    | test@example.com |
      | password | TestPass123!     |
      | status   | verified         |
    When I login with email "test@example.com" and password "TestPass123!"
    Then I should be redirected to the dashboard
    And I should see the version footer with text "Matrix Delivery v1.0.0"
    And the footer should contain commit hash "0cc5c8d"

  @verification
  Scenario: Customer verification process - header badge
    Given there is a registered customer account
    When I login as the customer
    Then I should see the verify button in the header
    And I should not see the verified badge in the header
    When the customer account is verified via API
    And I refresh the page
    Then I should see the verified badge in the header
    And I should not see the verify button in the header

  @VERIFICATION-002
  Scenario: Driver verification process - header badge
    Given there is a registered driver account
    When I login as the driver
    Then I should see the verify button in the header
    And I should not see the verified badge in the header
    When the driver account is verified via API
    And I refresh the page
    Then I should see the verified badge in the header
    And I should not see the verify button in the header

  @VERIFICATION-003
  Scenario: Customer verification in order cards
    Given there is a registered customer account
    And there is a registered driver account
    And the driver has created an order
    When I login as the customer
    Then I should see the order card with unverified customer badge
    When the customer account is verified via API
    And I refresh the page
    Then I should see the order card with verified customer badge

  @VERIFICATION-004
  Scenario: Driver verification in bid cards
    Given there is a registered customer account
    And there is a registered driver account
    And the customer has created an order
    When I login as the driver
    And I place a bid on the order
    And I login as the customer
    Then I should see the bid card with unverified driver badge
    When the driver account is verified via API
    And I refresh the page
    Then I should see the bid card with verified driver badge

  @VERIFICATION-005
  Scenario: Driver verification in order bidding view
    Given there is a registered customer account
    And there is a registered driver account
    And the customer has created an order
    When I login as the driver
    Then I should see the order card with unverified customer badge in bidding view
    When the customer account is verified via API
    And I refresh the page
    Then I should see the order card with verified customer badge in bidding view

  @VERIFICATION-006
  Scenario: Complete verification workflow - customer to driver
    Given there is a registered customer account
    And there is a registered driver account
    And the customer has created an order
    When I login as the driver
    Then I should see the verify button in the header
    And I should see the order card with unverified customer badge
    When I click the verify button in the header
    Then I should be redirected to WhatsApp
    When the driver account is verified via API
    And I refresh the page
    Then I should see the verified badge in the header
    And I should not see the verify button in the header
    And I should see the order card with verified customer badge

  @VERIFICATION-007
  Scenario: Complete verification workflow - driver to customer
    Given there is a registered customer account
    And there is a registered driver account
    And the customer has created an order
    When I login as the customer
    Then I should see the verify button in the header
    When I place a bid on the order as the driver via API
    And I refresh the page
    Then I should see the bid card with unverified driver badge
    When I click the verify button in the header
    Then I should be redirected to WhatsApp
    When the customer account is verified via API
    And I refresh the page
    Then I should see the verified badge in the header
    And I should not see the verify button in the header
    And I should see the bid card with verified driver badge
