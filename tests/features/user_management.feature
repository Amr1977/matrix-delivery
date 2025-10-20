@user_management
Feature: User Registration and Authentication
  As a new user
  I want to register and login to the platform
  So that I can use delivery services

  Background:
    Given the P2P delivery platform is running
    And the database is clean

  @UR-001
  Scenario: Successful customer registration
    Given I am on the registration page
    When I fill in the registration form with:
      | field     | value            |
      | name      | John Doe         |
      | email     | john@example.com |
      | password  | SecurePass123!   |
      | phone     | +1234567890      |
      | user_type | customer         |
    And I submit the registration form
    Then I should see a success message "Registration successful"
    And I should receive a verification email at "john@example.com"
    And my account should be created with:
      | field            | value                |
      | status           | pending_verification |
      | completed_orders | 0                    |
      | average_rating   | 0                    |
      | member_since     | 2025-10-19           |

  @UR-002
  Scenario: Successful driver registration
    Given I am on the registration page
    When I fill in the registration form with:
      | field        | value            |
      | name         | Jane Driver      |
      | email        | jane@example.com |
      | password     | SecurePass123!   |
      | phone        | +1234567891      |
      | user_type    | driver           |
      | vehicle_type | bike             |
    And I submit the registration form
    Then I should see a success message "Registration successful"
    And I should receive a verification email at "jane@example.com"
    And my account should be created with:
      | field            | value                |
      | status           | pending_verification |
      | completed_orders | 0                    |
      | average_rating   | 0                    |
      | member_since     | 2025-10-19           |

  @UR-003
  Scenario: Registration with existing email
    Given a user exists with email "existing@example.com"
    When I attempt to register with email "existing@example.com"
    Then I should see an error message "Email already registered"
    And no new account should be created

  @UR-004
  Scenario: Successful login
    Given I am a registered user with:
      | email    | john@example.com |
      | password | SecurePass123!   |
      | status   | verified         |
    When I login with email "john@example.com" and password "SecurePass123!"
    Then I should be redirected to the dashboard
    And I should see a welcome message "Welcome back, John"

  @UR-005
  Scenario: Login with incorrect password
    Given I am a registered user with email "john@example.com"
    When I login with email "john@example.com" and password "WrongPassword"
    Then I should see an error message "Invalid credentials"
    And I should remain on the login page
