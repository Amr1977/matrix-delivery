Feature: Admin System Health Dashboard
  As an administrator
  I want to view system health metrics
  So that I can monitor server performance and identify issues

  @api @ui
  Scenario: Admin views current system health
    Given I am logged in as an "admin"
    When I navigate to the system health dashboard
    Then I should see the current memory usage
    And I should see the PM2 process status
    And I should see the system uptime

  @api @ui
  Scenario: Admin views health history
    Given I am logged in as an "admin"
    When I request system health history for the last "24" hours
    Then I should receive a list of health data points
    And the data points should cover the requested time range
