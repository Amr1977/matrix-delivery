Feature: Paymob Integration
  As a customer in Egypt
  I want to pay using local payment methods
  So that I can complete my order easily

  Background:
    Given Paymob is configured with valid credentials
    And the platform has card and wallet integrations

  Scenario: Pay with credit/debit card via Paymob
    Given a customer has placed an order for 500 EGP
    And the customer has a valid credit card
    When the customer selects "Pay with Card"
    Then a Paymob payment session should be created
    And the customer should be redirected to Paymob iframe
    And the payment should be processed through MIGS integration
    When the payment is successful
    Then the platform commission should be 75.00 EGP
    And the order should be marked as paid
    And a revenue record should be created

  Scenario: Pay with Vodafone Cash via Paymob
    Given a customer has placed an order for 300 EGP
    And the customer has Vodafone Cash wallet
    When the customer selects "Vodafone Cash"
    Then a Paymob wallet payment should be initiated
    And the customer should receive a payment prompt on their phone
    When the customer confirms the payment
    Then the platform commission should be 45.00 EGP
    And the payment method should be recorded as "paymob_wallet"

  Scenario: Pay with Orange Cash via Paymob
    Given a customer has placed an order for 200 EGP
    When the customer pays using Orange Cash
    Then the payment should be processed through Paymob wallet integration
    And the commission should be 30.00 EGP

  Scenario: Pay with Etisalat Cash via Paymob
    Given a customer has placed an order for 150 EGP
    When the customer pays using Etisalat Cash
    Then the payment should be processed through Paymob wallet integration
    And the commission should be 22.50 EGP

  Scenario: Pay at kiosk via Paymob
    Given a customer has placed an order for 400 EGP
    When the customer selects "Pay at Kiosk"
    Then a reference number should be generated
    And the customer should be instructed to visit Aman/Fawry/Masary
    When the customer pays cash at the kiosk
    Then the payment should be confirmed within 30 minutes
    And the commission should be 60.00 EGP

  Scenario: Paymob webhook verification
    Given a Paymob payment is completed
    When Paymob sends a webhook notification
    Then the HMAC signature should be verified
    And only valid webhooks should be processed
    And invalid signatures should be rejected

  Scenario: Paymob payment failure
    Given a customer attempts to pay via Paymob
    When the payment fails due to insufficient funds
    Then the customer should be redirected back to the app
    And the error message should be displayed
    And the order should remain unpaid
    And the customer should be able to retry

  Scenario: Paymob sandbox testing
    Given Paymob is in sandbox mode
    When a test payment is made with card 4987654321098769
    Then the payment should succeed in test mode
    And the commission should be calculated correctly
    And no real money should be charged
