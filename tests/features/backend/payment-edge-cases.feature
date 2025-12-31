Feature: Payment Edge Cases
  As a system
  I want to handle edge cases correctly
  So that payments work reliably in all scenarios

  Scenario: Handle very small payment amount
    Given an order with amount 0.01 EGP
    When the commission is calculated
    Then the calculation should complete without error
    And the commission should be a valid number
    And the commission plus payout should equal 0.01 EGP

  Scenario: Handle minimum digital payment amount
    Given the minimum digital payment is 5 EGP
    When an order of exactly 5 EGP is placed
    Then the payment should be accepted
    And the commission should be 0.75 EGP
    And the driver payout should be 4.25 EGP

  Scenario: Handle very large payment amount
    Given an order with amount 1,000,000 EGP
    When the commission is calculated
    Then the commission should be 150,000.00 EGP
    And the driver payout should be 850,000.00 EGP
    And no overflow error should occur

  Scenario: Handle decimal rounding correctly
    Given an order with amount 33.33 EGP
    When the commission is calculated
    Then the commission should be approximately 5.00 EGP
    And the driver payout should be approximately 28.33 EGP
    And the total should equal 33.33 EGP within 0.01 precision

  Scenario: Handle concurrent payment processing
    Given 3 orders are placed simultaneously
    When all 3 payments are processed concurrently
    Then all payments should complete successfully
    And each commission should be calculated correctly
    And no race conditions should occur
    And all revenue records should be created

  Scenario: Handle payment in different currencies
    Given the platform supports multiple currencies
    When a payment is made in USD
    Then the commission should be calculated in USD
    And the currency should be recorded correctly

  Scenario: Handle payment method switching
    Given a customer starts payment with Stripe
    When the customer switches to PayPal mid-transaction
    Then the previous payment attempt should be cancelled
    And the new payment should proceed
    And only one payment should be recorded

  Scenario: Handle partial refunds
    Given an order of 100 EGP has been paid
    When a partial refund of 30 EGP is issued
    Then the commission should be recalculated
    And the platform should refund 4.50 EGP commission
    And the driver should refund 25.50 EGP
