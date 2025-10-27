@user_authentication @implemented
Feature: User Authentication and Account Management
  As a user of the P2P delivery platform
  I want to register, login, and manage my account
  So that I can access delivery services

  Background:
    Given the P2P delivery platform is running
    And the database is clean and initialized
    And the system time is "2025-10-19T12:00:00Z"

  @UR-001 @smoke @critical_path
  Scenario: Successful customer registration
    Given I am on the registration page
    When I fill in the registration form with:
      | field    | value                  |
      | name     | John Customer          |
      | email    | john@example.com       |
      | password | SecurePass123!         |
      | phone    | +1234567890            |
      | role     | customer               |
    And I submit the registration form
    Then I should see success message "User registered successfully"
    And I should receive an authentication token
    And my account should be created with:
      | field               | value           |
      | name                | John Customer   |
      | email               | john@example.com|
      | role                | customer        |
      | rating              | 5.00            |
      | completedDeliveries | 0               |
    And I should be redirected to the customer dashboard

  @UR-002 @smoke @critical_path
  Scenario: Successful driver registration with vehicle type
    Given I am on the registration page
    When I fill in the registration form with:
      | field        | value                  |
      | name         | Jane Driver            |
      | email        | jane@example.com       |
      | password     | SecurePass123!         |
      | phone        | +1234567891            |
      | role         | driver                 |
      | vehicle_type | bike                   |
    And I submit the registration form
    Then I should see success message "User registered successfully"
    And I should receive an authentication token
    And my account should be created with:
      | field               | value           |
      | name                | Jane Driver     |
      | email               | jane@example.com|
      | role                | driver          |
      | vehicle_type        | bike            |
      | rating              | 5.00            |
      | completedDeliveries | 0               |
      | is_available        | true            |
    And I should be redirected to the driver dashboard

  @UR-003 @validation
  Scenario: Registration fails with duplicate email
    Given a user exists with email "existing@example.com"
    When I attempt to register with:
      | field    | value                  |
      | name     | Another User           |
      | email    | existing@example.com   |
      | password | SecurePass123!         |
      | phone    | +1234567892            |
      | role     | customer               |
    Then I should see error message "Email already registered"
    And no new account should be created
    And I should remain on the registration page

  @UR-004 @validation
  Scenario: Registration fails without required fields
    Given I am on the registration page
    When I attempt to register with incomplete data:
      | field    | value                  |
      | name     | John Doe               |
      | email    | john@example.com       |
      | password | SecurePass123!         |
    Then I should see error message "All fields required"
    And no account should be created

  @UR-005 @validation
  Scenario: Driver registration fails without vehicle type
    Given I am on the registration page
    When I attempt to register as driver without vehicle type:
      | field    | value                  |
      | name     | Jane Driver            |
      | email    | jane@example.com       |
      | password | SecurePass123!         |
      | phone    | +1234567891            |
      | role     | driver                 |
    Then I should see error message "Vehicle type is required for drivers"
    And no account should be created

  @UR-006 @validation
  Scenario: Registration fails with invalid email format
    Given I am on the registration page
    When I attempt to register with invalid email "notanemail"
    Then I should see error message "Invalid email format"
    And no account should be created

  @UR-007 @validation
  Scenario: Registration fails with weak password
    Given I am on the registration page
    When I attempt to register with password "weak"
    Then I should see error message "Password must be at least 8 characters"
    And no account should be created

  @UR-008 @smoke @critical_path
  Scenario: Successful customer login
    Given I am a registered customer with:
      | email    | john@example.com |
      | password | SecurePass123!   |
    When I login with credentials:
      | email    | john@example.com |
      | password | SecurePass123!   |
    Then I should see success message "Login successful"
    And I should receive an authentication token
    And I should be redirected to the customer dashboard
    And I should see my user information:
      | name                | John Customer |
      | role                | customer      |
      | completedDeliveries | 0             |

  @UR-009 @smoke @critical_path
  Scenario: Successful driver login
    Given I am a registered driver with:
      | email    | jane@example.com |
      | password | SecurePass123!   |
    When I login with credentials:
      | email    | jane@example.com |
      | password | SecurePass123!   |
    Then I should see success message "Login successful"
    And I should receive an authentication token
    And I should be redirected to the driver dashboard
    And I should see driver-specific interface elements

  @UR-010 @security
  Scenario: Login fails with incorrect password
    Given I am a registered user with email "john@example.com"
    When I attempt to login with:
      | email    | john@example.com |
      | password | WrongPassword    |
    Then I should see error message "Invalid email or password"
    And I should not receive an authentication token
    And I should remain on the login page

  @UR-011 @security
  Scenario: Login fails with non-existent email
    When I attempt to login with:
      | email    | nonexistent@example.com |
      | password | SomePassword123!        |
    Then I should see error message "Invalid email or password"
    And I should not receive an authentication token

  @UR-012 @security
  Scenario: Login fails with missing credentials
    When I attempt to login without email
    Then I should see error message "Email and password required"
    And I should not receive an authentication token

  @UR-013 @session_management
  Scenario: Retrieve current user information
    Given I am logged in as customer "john@example.com"
    When I request my user profile at endpoint "/api/auth/me"
    Then I should receive my account details:
      | field               | value           |
      | name                | John Customer   |
      | email               | john@example.com|
      | role                | customer        |
      | rating              | 5.00            |
      | completedDeliveries | 0               |
    And the response should not include my password

  @UR-014 @session_management
  Scenario: Logout successfully
    Given I am logged in as customer "john@example.com"
    When I click the logout button
    Then my session should be terminated
    And I should be redirected to the login page
    And my authentication token should be removed
    And I should see the authentication screen

  @UR-015 @security
  Scenario: Access protected resource without authentication
    Given I am not logged in
    When I attempt to access "/api/orders"
    Then I should receive error "No token provided"
    And I should get HTTP status code 401

  @UR-016 @security
  Scenario: Access protected resource with invalid token
    Given I have an invalid authentication token
    When I attempt to access "/api/orders" with the invalid token
    Then I should receive error "Invalid or expired token"
    And I should get HTTP status code 401

  @UR-017 @ui
  Scenario: Toggle password visibility during registration
    Given I am on the registration page
    When I enter password "SecurePass123!"
    Then the password should be masked by default
    When I click the "show password" button
    Then the password should be visible as plain text
    When I click the "hide password" button
    Then the password should be masked again

  @UR-018 @ui
  Scenario: Switch between login and registration forms
    Given I am on the login page
    When I click "Sign Up"
    Then I should see the registration form
    And the page title should be "Create Account"
    When I click "Sign In"
    Then I should see the login form
    And the page title should be "Sign In"

  @UR-019 @smoke
  Scenario: Health check confirms system is operational
    When I request the health check endpoint "/api/health"
    Then I should receive status "healthy"
    And the response should include:
      | field       | type    |
      | status      | string  |
      | database    | string  |
      | uptime      | number  |
      | version     | string  |
      | stats       | object  |
    And database should be "PostgreSQL"

  @UR-020 @data_validation
  Scenario Outline: Registration with various invalid inputs
    Given I am on the registration page
    When I attempt to register with <field> as "<invalid_value>"
    Then I should see appropriate error message
    And no account should be created

    Examples:
      | field    | invalid_value               |
      | email    | plaintext                   |
      | email    | @example.com                |
      | email    | user@                       |
      | password | 1234567                     |
      | password | short                       |
      | phone    | abc                         |
      | role     | admin                       |
      | role     | superuser                   |