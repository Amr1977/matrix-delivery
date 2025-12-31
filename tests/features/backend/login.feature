Feature: User Authentication - Login
  As a user
  I want to be informed when I enter invalid credentials
  So that I know why I cannot access my account

  Scenario: Attempting to login with incorrect password
    Given I have a registered account with email "test_bdd@example.com" and password "password123"
    When I attempt to login with email "test_bdd@example.com" and password "wrongpass"
    Then I should receive a 401 status code
    And the response error should contain "Invalid credentials"
