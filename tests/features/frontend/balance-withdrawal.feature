Feature: Withdraw Funds
  As a user
  I want to withdraw money from my balance
  So that I can transfer funds to my bank account or wallet

  Background:
    Given I am logged in as a driver
    And I am on the balance page
    And my available balance is "5000.00 EGP"

  Scenario: Open withdrawal modal
    When I click the "Withdraw" button
    Then I should see the withdrawal modal
    And the modal title should be "Withdraw Funds"
    And I should see my available balance displayed
    And I should see an amount input field
    And I should see destination options

  Scenario: Successful withdrawal to bank account
    Given I have opened the withdrawal modal
    When I enter "1000" as the withdrawal amount
    And I select "Bank Transfer" as destination
    And I enter my bank details:
      | Field          | Value              |
      | Account Number | 1234567890         |
      | Bank Name      | National Bank      |
      | Account Holder | John Doe           |
    And I enter "Monthly earnings" as description
    And I click "Request Withdrawal"
    Then I should see a success message
    And I should see "Withdrawal request submitted"
    And my available balance should decrease to "4000.00 EGP"
    And the withdrawal status should be "pending"

  Scenario: Successful withdrawal to Vodafone Cash
    Given I have opened the withdrawal modal
    When I enter "500" as the withdrawal amount
    And I select "Vodafone Cash" as destination
    And I enter "01234567890" as wallet number
    And I enter "Wallet transfer" as description
    And I click "Request Withdrawal"
    Then I should see a success message
    And my available balance should decrease to "4500.00 EGP"
    And the withdrawal should appear in transaction history

  Scenario: Minimum withdrawal validation
    Given I have opened the withdrawal modal
    When I enter "5" as the withdrawal amount
    And I click "Request Withdrawal"
    Then I should see an error "Minimum withdrawal is 10.00 EGP"
    And the withdrawal should not proceed

  Scenario: Insufficient balance validation
    Given my available balance is "50.00 EGP"
    And I have opened the withdrawal modal
    When I enter "100" as the withdrawal amount
    And I click "Request Withdrawal"
    Then I should see an error "Insufficient balance"
    And the withdrawal should not proceed

  Scenario: Daily withdrawal limit
    Given I have already withdrawn "4500.00 EGP" today
    And the daily limit is "5000.00 EGP"
    And I have opened the withdrawal modal
    When I enter "1000" as the withdrawal amount
    And I click "Request Withdrawal"
    Then I should see an error "Daily withdrawal limit exceeded"
    And I should see "Remaining today: 500.00 EGP"

  Scenario: Withdrawal fee display
    Given I have opened the withdrawal modal
    When I enter "1000" as the withdrawal amount
    And I select "Bank Transfer" as destination
    Then I should see "Processing Fee: 0.00 EGP"
    And I should see "You will receive: 1000.00 EGP"

  Scenario: Withdrawal verification code
    Given withdrawal verification is enabled
    And I have requested a withdrawal of "1000.00 EGP"
    When the withdrawal is created
    Then I should receive a verification code via SMS
    And I should see a verification code input field
    When I enter the correct verification code
    Then the withdrawal should be approved
    And I should see "Withdrawal verified successfully"

  Scenario: Cancel withdrawal request
    Given I have a pending withdrawal of "500.00 EGP"
    When I navigate to transaction history
    And I click "Cancel" on the withdrawal
    And I confirm the cancellation
    Then the withdrawal status should change to "cancelled"
    And my available balance should increase to "5000.00 EGP"
    And I should see a cancellation confirmation

  Scenario: View withdrawal limits
    Given I have opened the withdrawal modal
    Then I should see "Daily Limit: 5,000.00 EGP"
    And I should see "Monthly Limit: 50,000.00 EGP"
    And I should see "Available to withdraw: 5,000.00 EGP"

  Scenario: Withdrawal while balance is frozen
    Given my balance is frozen
    When I try to open the withdrawal modal
    Then I should see an error "Your balance is frozen. Contact support."
    And the withdrawal modal should not open

  Scenario: Required fields validation
    Given I have opened the withdrawal modal
    When I enter "1000" as the withdrawal amount
    And I select "Bank Transfer" as destination
    And I leave bank details empty
    And I click "Request Withdrawal"
    Then I should see validation errors:
      | Field          | Error                      |
      | Account Number | Account number is required |
      | Bank Name      | Bank name is required      |
    And the withdrawal should not proceed
