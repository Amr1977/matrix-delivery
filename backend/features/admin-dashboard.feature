Feature: Admin Dashboard Statistics
  As an administrator
  I want to view dashboard statistics
  So that I can monitor platform performance

  Background:
    Given I am authenticated as an admin user
    And the system has the following data:
      | metric           | value |
      | total_users      | 100   |
      | total_orders     | 50    |
      | completed_orders | 30    |
      | revenue          | 15000 |

  Scenario: View dashboard with default date range
    When I request dashboard statistics
    Then I should receive a successful response
    And the response should contain:
      | field        | value |
      | totalUsers   | 100   |
      | totalOrders  | 50    |
      | revenue      | 15000 |
    And the metrics should include average order value
    And the metrics should include completion rate

  Scenario: View dashboard with custom date range
    When I request dashboard statistics with range "30d"
    Then I should receive a successful response
    And the statistics should be filtered by the last 30 days

  Scenario: View dashboard with different time ranges
    When I request dashboard statistics with range "<range>"
    Then I should receive a successful response
    And the statistics should reflect the "<range>" period

    Examples:
      | range |
      | 24h   |
      | 7d    |
      | 30d   |
      | 90d   |

  Scenario: Unauthorized access attempt
    Given I am not authenticated
    When I request dashboard statistics
    Then I should receive an unauthorized error
    And the response status should be 401

  Scenario: Non-admin user access attempt
    Given I am authenticated as a regular user
    When I request dashboard statistics
    Then I should receive a forbidden error
    And the response status should be 403

  Scenario: Admin action logging
    When I request dashboard statistics
    Then the admin action should be logged
    And the log should contain:
      | field       | value          |
      | action      | VIEW_STATS     |
      | target_type | dashboard      |
      | admin_id    | <my_admin_id>  |

  Scenario: Dashboard with user growth data
    When I request dashboard statistics
    Then the response should include user growth data
    And the user growth should show monthly trends

  Scenario: Dashboard with revenue breakdown
    When I request dashboard statistics
    Then the response should include revenue data
    And the revenue should be broken down by month
    And each month should show total revenue
