Feature: User Authentication
  As a user
  I want to register and login to the platform
  So that I can access the delivery services

  Scenario: Successful user registration
    Given I am a new user
    When I register with valid credentials:
      | field    | value                |
      | name     | John Doe            |
      | email    | john@example.com    |
      | phone    | +1234567890         |
      | password | SecurePass123!      |
      | primary_role     | customer            |
    Then I should receive a successful registration response
    And I should receive a JWT token
    And my account should be created in the system
    And a verification email should be sent

  Scenario: Registration with existing email
    Given there is a user with email "existing@example.com"
    When I try to register with email "existing@example.com"
    Then I should receive an authentication error response
    And the error should indicate email already exists

  Scenario: Registration with invalid email
    When I register with invalid email "notanemail"
    Then I should receive a validation error
    And the error should indicate invalid email format

  Scenario: Registration with weak password
    When I register with password "123"
    Then I should receive a validation error
    And the error should indicate password too weak

  Scenario: Successful login
    Given there is a registered user:
      | email    | test@example.com |
      | password | SecurePass123!   |
    When I login with correct credentials
    Then I should receive a successful login response
    And I should receive a JWT token
    And the token should be valid

  Scenario: Login with incorrect password
    Given there is a registered user with email "user@example.com"
    When I login with incorrect password
    Then I should receive an authentication error
    And the error should indicate invalid credentials

  Scenario: Login with non-existent email
    When I login with email "nonexistent@example.com"
    Then I should receive an authentication error
    And the error should indicate invalid credentials

  Scenario: Token refresh
    Given I am logged in as a user
    And my token is about to expire
    When I request a token refresh
    Then I should receive a new JWT token
    And the new token should be valid

  Scenario: Logout
    Given I am logged in as a user
    When I logout
    Then my session should be terminated
    And subsequent requests should require re-authentication

  Scenario: Password reset request
    Given there is a user with email "forgot@example.com"
    When I request a password reset for "forgot@example.com"
    Then I should receive a success response
    And a password reset email should be sent
    And a reset token should be generated

  Scenario: Password reset with valid token
    Given I have a valid password reset token
    When I reset my password to "NewSecurePass123!"
    Then my password should be updated
    And I should be able to login with the new password

  Scenario: Password reset with expired token
    Given I have an expired password reset token
    When I try to reset my password
    Then I should receive an authentication error response
    And the error should indicate token expired
