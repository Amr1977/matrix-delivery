Feature: Payment Error Handling
  As a system
  I want to handle payment errors gracefully
  So that invalid payments are rejected and users are informed

  Scenario Outline: Reject invalid payment amounts
    Given a payment request with amount <amount>
    When the payment is validated
    Then the payment should be rejected
    And the error message should indicate <error_type>

    Examples:
      | amount    | error_type              |
      | -10       | negative amount         |
      | 0         | zero amount             |
      | null      | missing amount          |
      | undefined | missing amount          |

  Scenario: Reject payment below minimum amount
    Given the minimum digital payment amount is 5 EGP
    When a customer attempts to pay 3 EGP using a card
    Then the payment should be rejected
    And the error should indicate "Amount below minimum"

  Scenario: Handle payment gateway timeout
    Given a customer initiates a payment
    When the payment gateway times out
    Then the payment status should be marked as "pending"
    And the customer should be notified to retry
    And the order should not be marked as paid

  Scenario: Handle insufficient funds
    Given a customer has insufficient balance
    When the customer attempts to pay
    Then the payment should fail
    And the error should be "Insufficient funds"
    And the order should remain unpaid

  Scenario: Handle network failure during payment
    Given a payment is in progress
    When a network error occurs
    Then the payment should be marked as "failed"
    And the transaction should be logged
    And the customer should be able to retry

  Scenario: Validate payment method availability
    Given a payment method is temporarily unavailable
    When a customer selects that payment method
    Then the customer should be notified
    And alternative payment methods should be suggested

  Scenario: Handle duplicate payment attempts
    Given an order has already been paid
    When a duplicate payment is attempted
    Then the duplicate should be rejected
    And the original payment should remain valid
    And the customer should be informed the order is already paid
