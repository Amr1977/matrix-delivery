Feature: Deposit Funds
  As a user
  I want to deposit money into my balance
  So that I can pay for orders or receive payments

  Background:
    Given I am logged in as a customer
    And I am on the balance page
    And my current balance is "100.00 EGP"

  Scenario: Open deposit modal
    When I click the "Deposit" button
    Then I should see the deposit modal
    And the modal title should be "Deposit Funds"
    And I should see an amount input field
    And I should see payment method options

  Scenario: Successful deposit with card
    Given I have opened the deposit modal
    When I enter "500" as the deposit amount
    And I select "Credit/Debit Card" as payment method
    And I complete the card payment
    Then I should see a success message
    And my balance should increase to "600.00 EGP"
    And I should see the deposit in my transaction history
    And the modal should close

  Scenario: Successful deposit with Vodafone Cash
    Given I have opened the deposit modal
    When I enter "1000" as the deposit amount
    And I select "Vodafone Cash" as payment method
    And I complete the wallet payment
    Then I should see a success message
    And my balance should increase to "1100.00 EGP"
    And the transaction type should be "deposit"

  Scenario: Deposit with promotional bonus
    Given there is an active "10% deposit bonus" promotion
    And I have opened the deposit modal
    When I enter "1000" as the deposit amount
    And I select "Credit/Debit Card" as payment method
    And I complete the payment
    Then my balance should increase to "1200.00 EGP"
    And I should see a bonus transaction of "100.00 EGP"
    And I should see a notification about the bonus

  Scenario: Minimum deposit validation
    Given I have opened the deposit modal
    When I enter "0.50" as the deposit amount
    And I click "Continue"
    Then I should see an error "Minimum deposit is 1.00 EGP"
    And the deposit should not proceed

  Scenario: Maximum deposit validation
    Given I have opened the deposit modal
    When I enter "200000" as the deposit amount
    And I click "Continue"
    Then I should see an error "Maximum deposit is 100,000 EGP"
    And the deposit should not proceed

  Scenario: Invalid amount validation
    Given I have opened the deposit modal
    When I enter "-100" as the deposit amount
    Then I should see an error "Amount must be positive"
    And the "Continue" button should be disabled

  Scenario: Payment method fee display
    Given I have opened the deposit modal
    When I enter "1000" as the deposit amount
    And I select "Credit/Debit Card" as payment method
    Then I should see "Processing Fee (2.5%): 25.00 EGP"
    And I should see "Total: 1025.00 EGP"

  Scenario: Cancel deposit
    Given I have opened the deposit modal
    When I enter "500" as the deposit amount
    And I click "Cancel"
    Then the modal should close
    And my balance should remain "100.00 EGP"
    And no transaction should be created

  Scenario: Failed payment handling
    Given I have opened the deposit modal
    When I enter "500" as the deposit amount
    And I select "Credit/Debit Card" as payment method
    And the payment fails
    Then I should see an error message
    And my balance should remain "100.00 EGP"
    And I should be able to retry the payment

  Scenario: Deposit while balance is frozen
    Given my balance is frozen
    When I try to open the deposit modal
    Then I should see an error "Your balance is frozen. Contact support."
    And the deposit modal should not open
