Feature: Balance Statement
  As a user
  I want to generate balance statements for specific periods
  So that I can review my financial activity and keep records

  Background:
    Given I am logged in as a driver
    And I have transactions from January to December 2025

  Scenario: Open balance statement page
    When I navigate to the balance statement page
    Then I should see a date range selector
    And I should see a "Generate Statement" button
    And I should see preset period options:
      | Period         |
      | Last 7 days    |
      | Last 30 days   |
      | Last 3 months  |
      | Last 6 months  |
      | Last year      |
      | Custom range   |

  Scenario: Generate monthly statement
    Given I am on the balance statement page
    When I select "Last 30 days" as the period
    And I click "Generate Statement"
    Then I should see a statement preview
    And the statement should include:
      | Section                |
      | Period                 |
      | Opening Balance        |
      | Total Deposits         |
      | Total Withdrawals      |
      | Total Earnings         |
      | Total Deductions       |
      | Closing Balance        |
      | Transaction Count      |
      | Detailed Transactions  |

  Scenario: Generate custom date range statement
    Given I am on the balance statement page
    When I select "Custom range" as the period
    And I set start date to "2025-01-01"
    And I set end date to "2025-03-31"
    And I click "Generate Statement"
    Then I should see a statement for Q1 2025
    And the period should show "Jan 1, 2025 - Mar 31, 2025"
    And all transactions should be within this range

  Scenario: Download statement as PDF
    Given I have generated a statement
    When I click "Download PDF"
    Then a PDF file should be downloaded
    And the filename should be "balance-statement-2025-01-01-to-2025-03-31.pdf"
    And the PDF should contain:
      | Content                |
      | User name              |
      | Statement period       |
      | Balance summary        |
      | Transaction breakdown  |
      | Generated date         |
      | Platform logo          |

  Scenario: Download statement as CSV
    Given I have generated a statement
    When I click "Download CSV"
    Then a CSV file should be downloaded
    And the CSV should contain all transactions from the period
    And the CSV should include summary rows at the top

  Scenario: Statement summary calculations
    Given I have the following transactions in January:
      | Type            | Amount   |
      | deposit         | 5000.00  |
      | deposit         | 2000.00  |
      | withdrawal      | -1000.00 |
      | earnings        | 3000.00  |
      | commission      | -300.00  |
    When I generate a statement for January
    Then the summary should show:
      | Field              | Value    |
      | Total Deposits     | 7000.00  |
      | Total Withdrawals  | 1000.00  |
      | Total Earnings     | 3000.00  |
      | Total Deductions   | 300.00   |
      | Net Change         | 8700.00  |

  Scenario: Statement with no transactions
    Given I have no transactions in the selected period
    When I generate a statement for that period
    Then I should see "No transactions found for this period"
    And the opening and closing balance should be the same
    And all totals should be 0.00

  Scenario: Statement transaction grouping
    Given I have generated a statement
    Then transactions should be grouped by type:
      | Group                    |
      | Deposits                 |
      | Withdrawals              |
      | Order Payments           |
      | Order Refunds            |
      | Earnings                 |
      | Commission Deductions    |
      | Adjustments              |
    And each group should show subtotal

  Scenario: Print statement
    Given I have generated a statement
    When I click "Print"
    Then the browser print dialog should open
    And the statement should be formatted for printing
    And page breaks should be appropriate

  Scenario: Email statement
    Given I have generated a statement
    When I click "Email Statement"
    Then I should see an email confirmation dialog
    And my registered email should be pre-filled
    When I click "Send"
    Then I should see "Statement sent to your email"
    And I should receive the statement PDF via email

  Scenario: Statement validation - future dates
    Given I am on the balance statement page
    When I set start date to tomorrow
    And I click "Generate Statement"
    Then I should see an error "Start date cannot be in the future"
    And the statement should not be generated

  Scenario: Statement validation - invalid range
    Given I am on the balance statement page
    When I set start date to "2025-12-31"
    And I set end date to "2025-01-01"
    And I click "Generate Statement"
    Then I should see an error "End date must be after start date"
    And the statement should not be generated

  Scenario: Statement validation - maximum range
    Given I am on the balance statement page
    When I set a date range longer than 1 year
    And I click "Generate Statement"
    Then I should see an error "Maximum statement period is 1 year"
    And I should see a suggestion to generate multiple statements

  Scenario: Statement with balance holds
    Given I have active balance holds
    When I generate a statement
    Then the statement should include a "Balance Holds" section
    And it should show:
      | Field          |
      | Hold ID        |
      | Amount         |
      | Reason         |
      | Status         |
      | Created Date   |
      | Expires Date   |

  Scenario: Driver earnings breakdown
    Given I am logged in as a driver
    When I generate a statement
    Then I should see a "Driver Earnings Breakdown" section
    And it should show:
      | Metric                    |
      | Total Orders Completed    |
      | Gross Earnings            |
      | Platform Commission       |
      | Net Earnings              |
      | Average Earnings per Order|
