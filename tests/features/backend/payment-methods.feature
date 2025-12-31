Feature: Payment Method Processing
  As a customer
  I want to pay using different payment methods
  So that I can complete my order conveniently

  Background:
    Given the platform is configured with multiple payment methods
    And all payment methods use 15% commission rate

  Scenario Outline: Process payment with different methods
    Given a customer has placed an order for <amount> EGP
    When the customer pays using <payment_method>
    Then the payment should be processed successfully
    And the platform commission should be <commission> EGP
    And the driver should receive <payout> EGP
    And the payment method should be recorded as <payment_method>

    Examples:
      | payment_method | amount | commission | payout |
      | stripe         | 100    | 15.00      | 85.00  |
      | paypal         | 250    | 37.50      | 212.50 |
      | paymob_card    | 500    | 75.00      | 425.00 |
      | paymob_wallet  | 300    | 45.00      | 255.00 |
      | crypto         | 1000   | 150.00     | 850.00 |
      | cod            | 150    | 22.50      | 127.50 |

  Scenario: All payment methods use consistent commission rate
    Given multiple orders are placed
    When orders are paid using different payment methods
    Then all payment methods should apply 15% commission
    And no payment method should have a different rate

  Scenario: Stripe card payment
    Given a customer has placed an order for 100 EGP
    And the customer has a valid credit card
    When the customer pays using Stripe
    Then the Stripe payment intent should be created
    And the payment should be confirmed
    And the platform commission should be 15.00 EGP
    And the order status should be updated to "paid"

  Scenario: PayPal payment
    Given a customer has placed an order for 250 EGP
    And the customer has a PayPal account
    When the customer pays using PayPal
    Then the PayPal order should be created
    And the payment should be captured
    And the platform commission should be 37.50 EGP
    And the revenue should be recorded in platform_revenue table

  Scenario: Paymob card payment
    Given a customer has placed an order for 500 EGP
    And the customer has a valid debit card
    When the customer pays using Paymob card integration
    Then the Paymob payment should be initiated
    And the payment should be processed through MIGS
    And the platform commission should be 75.00 EGP

  Scenario: Paymob mobile wallet payment
    Given a customer has placed an order for 300 EGP
    And the customer has Vodafone Cash wallet
    When the customer pays using Paymob wallet integration
    Then the wallet payment should be initiated
    And the payment should be processed successfully
    And the platform commission should be 45.00 EGP

  Scenario: Crypto payment (USDC/USDT)
    Given a customer has placed an order for 1000 EGP
    And the customer has a crypto wallet with USDC
    When the customer pays using crypto
    Then the smart contract should escrow the payment
    And the commission should be calculated in basis points (1500)
    And the platform commission should be 150.00 EGP
    And the driver payout should be 850.00 EGP

  Scenario: Cash on Delivery (COD)
    Given a customer has placed an order for 150 EGP
    When the customer selects cash on delivery
    Then the order should be created without upfront payment
    And the commission should still be calculated as 22.50 EGP
    And the driver should collect 150 EGP from customer
    And the driver should remit 22.50 EGP to platform
