Feature: User Authentication - Initial State
  As a user
  I want to see a clean login form without errors when I first visit
  So that I only see errors when I actually make a mistake

  Scenario: Navigating to login page for the first time
    Given I am an unauthenticated user
    When I access the login page
    Then I should not see any error messages
    And the backend should return 401 for session check without error payload causing UI alerts
