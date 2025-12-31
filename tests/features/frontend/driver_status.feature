@driver_status
Feature: Driver Online/Offline Status Management
  As a driver
  I want to control my online/offline status
  So that I can manage when I receive delivery requests and location tracking

  Background:
    Given I am logged in as a driver

  @DR-001
  Scenario: Driver goes online successfully
    Given my driver status is currently offline
    When I click the online status button
    Then my driver status should be online
    And I should see location sync is active

  @DR-002
  Scenario: Driver goes offline successfully
    When I click the offline status button
    Then my driver status should be offline
    And I should see location sync is disabled

  @DR-003
  Scenario: Prevent driver from going offline with active orders
    Given I have active orders assigned
    When I attempt to go offline while having active orders
    Then I should not be allowed to go offline
    And I should see an error message about active orders
    And my status should remain online

  @DR-004
  Scenario: Toggle driver status multiple times
    When I click the online status button
    Then my driver status should be online
    When I click the offline status button
    Then my driver status should be offline
    When I click the online status button
    Then my driver status should be online

  @DR-005
  Scenario: Location sync activation on going online
    Given my driver status is currently offline
    When I click the online status button
    Then I should see location sync is active
    And I should see "Location sync active (30s)" in the UI

  @DR-006
  Scenario: Location sync deactivation on going offline
    When I click the offline status button
    Then I should see location sync is disabled
    And location coordinates should not be displayed

  @DR-007
  Scenario: Driver status persists during session
    When I click the online status button
    Then my driver status should be online
    When I refresh the page
    Then my driver status should still be online
