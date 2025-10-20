@authentication
Feature: User Authentication
  As a user
  I want to be able to register and login
  So that I can access the delivery marketplace

  Background:
    Given I am on the home page

  @smoke @authentication
  Scenario: Successful customer registration
    When I click on the register button
    And I fill in registration details for a customer:
      | name       | email               | password  | role      |
      | Test User  | testcustomer@ex.com | test123   | customer  |
    And I submit the registration form
    Then I should be logged in successfully
    And I should see my dashboard with customer content
    When I logout
    Then I should be redirected to the login page

  @smoke @authentication
  Scenario: Successful driver registration
    When I click on the register button
    And I fill in registration details for a driver:
      | name       | email             | password  | role    |
      | Test Driver| testdriver@ex.com | test123   | driver  |
    And I submit the registration form
    Then I should be logged in successfully
    And I should see my dashboard with driver content
    When I logout
    Then I should be redirected to the login page

  @smoke @authentication
  Scenario: Successful login
    Given there is a registered customer account
    When I go back to the home page
    And I click on the login button
    And I fill in login credentials:
      | email               | password  |
      | testcustomer@ex.com | test123   |
    And I submit the login form
    Then I should be logged in successfully
    And I should see my dashboard with customer content

  @authentication
  Scenario: Login with invalid credentials
    When I click on the login button
    And I fill in invalid login credentials:
      | email               | password  |
      | invalid@ex.com      | wrongpass |
    And I submit the login form
    Then I should see a login error message "Invalid email or password"

  @authentication
  Scenario: Registration with duplicate email
    Given there is a registered customer account
    When I go back to the home page
    And I click on the register button
    And I fill in registration details for a customer:
      | name       | email               | password  | role      |
      | New User   | testcustomer@ex.com | test123   | customer  |
    And I submit the registration form
    Then I should see a registration error message "Email already registered"

  @authentication
  Scenario: Switch between login and register forms
    When I click on the register button
    Then I should see the registration form
    When I click on the login link
    Then I should see the login form
    When I click on the register link
    Then I should see the registration form
