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
