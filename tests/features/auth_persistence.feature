@auth_persistence
Feature: Authentication Persistence
  As a registered user
  I want to remain logged in after ensuring page refresh
  So that I don't have to login repeatedly

  Background:
    Given the P2P delivery platform is ready for persistence test
    And the database is clean
    And I have a registered customer for persistence test

  @regression @bug-fix
  Scenario: Customer remains logged in after page refresh
    Given I visit the login page for persistence test
    And I perform a customer login for persistence check
    Then I verify successful persistence login
    And I check dashboard for persistence
    
    When I reload the page for persistence
    Then I verify successful persistence login
    And I check dashboard for persistence
