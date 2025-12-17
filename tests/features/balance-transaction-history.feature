Feature: Transaction History
  As a user
  I want to view my complete transaction history
  So that I can track all my balance activities

  Background:
    Given I am logged in as a customer
    And I have the following transactions:
      | Type            | Amount  | Status    | Date       | Description      |
      | deposit         | 1000.00 | completed | 2025-12-15 | Initial deposit  |
      | order_payment   | -150.00 | completed | 2025-12-16 | Order #12345     |
      | deposit         | 500.00  | completed | 2025-12-16 | Top up           |
      | withdrawal      | -200.00 | pending   | 2025-12-17 | Bank withdrawal  |
      | order_refund    | 150.00  | completed | 2025-12-17 | Refund #12345    |

  Scenario: View all transactions
    When I navigate to the transaction history page
    Then I should see 5 transactions
    And transactions should be sorted by date (newest first)
    And each transaction should display:
      | Field           |
      | Transaction ID  |
      | Type            |
      | Amount          |
      | Status          |
      | Date            |
      | Description     |
      | Balance After   |

  Scenario: Filter by transaction type
    Given I am on the transaction history page
    When I select "deposit" from the type filter
    Then I should see 2 transactions
    And all transactions should be of type "deposit"

  Scenario: Filter by status
    Given I am on the transaction history page
    When I select "pending" from the status filter
    Then I should see 1 transaction
    And the transaction status should be "pending"

  Scenario: Filter by date range
    Given I am on the transaction history page
    When I set start date to "2025-12-16"
    And I set end date to "2025-12-17"
    And I click "Apply Filters"
    Then I should see 4 transactions
    And all transactions should be within the date range

  Scenario: Search transactions
    Given I am on the transaction history page
    When I enter "Order #12345" in the search box
    Then I should see 2 transactions
    And both should contain "Order #12345" in description

  Scenario: Pagination
    Given I have 50 transactions
    And I am on the transaction history page
    Then I should see 20 transactions per page
    And I should see pagination controls
    When I click "Next Page"
    Then I should see transactions 21-40
    And the page indicator should show "Page 2 of 3"

  Scenario: View transaction details
    Given I am on the transaction history page
    When I click on a transaction
    Then I should see a transaction details modal
    And the modal should display:
      | Field              |
      | Transaction ID     |
      | Type               |
      | Amount             |
      | Currency           |
      | Status             |
      | Description        |
      | Balance Before     |
      | Balance After      |
      | Created At         |
      | Processed At       |
      | Related Order ID   |
      | Payment Method     |

  Scenario: Export transactions to CSV
    Given I am on the transaction history page
    When I click "Export to CSV"
    Then a CSV file should be downloaded
    And the file should contain all visible transactions
    And the file should include headers:
      | Header          |
      | Transaction ID  |
      | Date            |
      | Type            |
      | Amount          |
      | Status          |
      | Description     |

  Scenario: Empty transaction history
    Given I have no transactions
    When I navigate to the transaction history page
    Then I should see "No transactions yet"
    And I should see a "Make Your First Deposit" button

  Scenario: Transaction status indicators
    Given I am on the transaction history page
    Then completed transactions should have a green checkmark
    And pending transactions should have a yellow clock icon
    And failed transactions should have a red X icon
    And cancelled transactions should have a gray icon

  Scenario: Real-time transaction updates
    Given I am on the transaction history page
    When a new transaction is processed
    Then the new transaction should appear at the top
    And I should see a notification "New transaction added"
    And the transaction list should update automatically

  Scenario: Filter combinations
    Given I am on the transaction history page
    When I select "deposit" from type filter
    And I select "completed" from status filter
    And I set date range to last 7 days
    Then I should see only completed deposits from the last 7 days
    And the filter summary should show "3 filters applied"

  Scenario: Clear all filters
    Given I have applied multiple filters
    When I click "Clear All Filters"
    Then all filters should be reset
    And I should see all transactions again
