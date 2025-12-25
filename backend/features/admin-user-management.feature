Feature: Admin User Management
  As an administrator
  I want to manage user accounts
  So that I can maintain platform quality and safety

  Background:
    Given I am authenticated as an admin user

  Scenario: List all users with pagination
    Given the system has 50 registered users
    When I request the user list with page 1 and limit 20
    Then I should receive a successful response
    And the response should contain 20 users
    And the pagination should show:
      | field       | value |
      | page        | 1     |
      | limit       | 20    |
      | totalCount  | 50    |
      | totalPages  | 3     |

  Scenario: Search users by name
    Given the system has a user named "John Doe"
    When I search for users with term "John"
    Then I should receive a successful response
    And the results should include "John Doe"

  Scenario: Filter users by primary_role
    Given the system has users with different granted_roles:
      | primary_role     | count |
      | customer | 30    |
      | driver   | 20    |
    When I filter users by primary_role "driver"
    Then I should receive 20 users
    And all users should have primary_role "driver"

  Scenario: Verify a user account
    Given there is an unverified user "jane@example.com"
    When I verify the user account
    Then the user should be marked as verified
    And a verification notification should be sent
    And the admin action should be logged as "VERIFY_USER"

  Scenario: Suspend a user account
    Given there is an active user "baduser@example.com"
    When I suspend the user with reason "Policy violation"
    Then the user should be marked as unavailable
    And a suspension notification should be sent with the reason
    And the admin action should be logged as "SUSPEND_USER"

  Scenario: Unsuspend a user account
    Given there is a suspended user "reformed@example.com"
    When I unsuspend the user account
    Then the user should be marked as available
    And a reactivation notification should be sent
    And the admin action should be logged as "UNSUSPEND_USER"

  Scenario: Delete user without active orders
    Given there is a user "inactive@example.com" with no active orders
    When I delete the user account
    Then the user should be removed from the system
    And the admin action should be logged as "DELETE_USER"

  Scenario: Prevent deletion of user with active orders
    Given there is a user "active@example.com" with 2 active orders
    When I attempt to delete the user account
    Then I should receive an error response
    And the error should indicate active orders exist
    And the user should not be deleted

  Scenario: View detailed user information
    Given there is a user "detail@example.com" with:
      | field              | value |
      | customer_orders    | 5     |
      | driver_orders      | 3     |
      | reviews_received   | 8     |
      | avg_rating         | 4.5   |
    When I request detailed information for the user
    Then I should receive complete user profile
    And the profile should include order history
    And the profile should include review statistics

  Scenario: Bulk user operations
    Given I have selected 10 users
    When I perform a bulk verification
    Then all 10 users should be verified
    And 10 verification notifications should be sent
    And the admin action should be logged for each user
