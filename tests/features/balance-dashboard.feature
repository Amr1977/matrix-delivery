Feature: Balance Dashboard
  As a user (customer or driver)
  I want to view my balance and recent transactions
  So that I can manage my funds effectively

  Background:
    Given I am logged in as a customer
    And I have a balance account

  Scenario: View balance dashboard
    When I navigate to the balance page
    Then I should see my available balance
    And I should see my pending balance
    And I should see my held balance
    And I should see my total balance
    And I should see the currency (EGP)

  Scenario: View recent transactions
    Given I have made 5 transactions
    When I navigate to the balance page
    Then I should see the 5 most recent transactions
    And each transaction should show:
      | Field       |
      | Type        |
      | Amount      |
      | Status      |
      | Date        |
      | Description |

  Scenario: Quick actions available
    When I navigate to the balance page
    Then I should see a "Deposit" button
    And I should see a "Withdraw" button
    And I should see a "View All Transactions" link

  Scenario: Balance display for different user roles
    When I am logged in as a driver
    And I navigate to the balance page
    Then I should see my driver earnings
    And I should see commission deductions
    And I should see available for withdrawal

  Scenario: Empty balance state
    Given I have never made any transactions
    When I navigate to the balance page
    Then I should see "0.00 EGP" as available balance
    And I should see a message encouraging first deposit
    And I should see a "Make Your First Deposit" button

  Scenario: Frozen balance warning
    Given my balance is frozen by admin
    When I navigate to the balance page
    Then I should see a warning banner
    And the banner should display the freeze reason
    And deposit and withdrawal buttons should be disabled

  Scenario: Real-time balance updates
    Given I am on the balance page
    When a new transaction is processed
    Then my balance should update automatically
    And the new transaction should appear in recent transactions
    And I should see a notification about the update
