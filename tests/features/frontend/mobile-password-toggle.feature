@mobile-password-toggle
Feature: Password Toggle Visibility on Mobile
  As a mobile user
  I want the password toggle button to not overlap the input field
  So that I can see and type my password completely

  Background:
    Given the P2P delivery platform is ready
    And the database is clean

  @regression @mobile
  Scenario: Password toggle button does not overlap input on mobile
    Given I am using the application on a mobile viewport
    When I visit the login page
    Then the password input should be fully visible
    And the password toggle button should not overlap the password input

  @regression @mobile
  Scenario: Password toggle works on mobile viewport
    Given I am using the application on a mobile viewport
    When I visit the login page
    And I enter my password in the password field
    And I click the password toggle button
    Then my password should be visible

  @regression @mobile
  Scenario: Register form password toggle does not overlap on mobile
    Given I am using the application on a mobile viewport
    When I visit the register page
    Then the password input should be fully visible
    And the password toggle button should not overlap the password input
