Feature: Crypto Payment Integration
  As a tech-savvy customer
  I want to pay using cryptocurrency
  So that I can use my digital assets

  Background:
    Given the escrow smart contract is deployed
    And USDC and USDT tokens are supported
    And the commission rate is set to 1500 basis points (15%)

  Scenario: Pay with USDC
    Given a customer has placed an order for 100 USDC
    And the customer has sufficient USDC balance
    When the customer initiates crypto payment
    Then the smart contract should create an escrow
    And 100 USDC should be locked in escrow
    And the commission should be calculated as 15 USDC
    And the driver payout should be 85 USDC

  Scenario: Pay with USDT
    Given a customer has placed an order for 250 USDT
    When the customer initiates USDT crypto payment
    Then the payment should be processed through the escrow contract
    And the commission should be 37.50 USDT
    And the driver should receive 212.50 USDT upon completion

  Scenario: Complete delivery and release payment
    Given a crypto payment of 500 USDC is in escrow
    And the driver has completed the delivery
    When the delivery is confirmed
    Then 75 USDC should be released to the platform wallet
    And 425 USDC should be released to the driver wallet
    And the escrow should be marked as completed

  Scenario: Cancel order and refund customer
    Given a crypto payment of 300 USDC is in escrow
    When the order is cancelled before delivery
    Then the full 300 USDC should be refunded to the customer
    And no commission should be charged
    And the escrow should be marked as cancelled

  Scenario: Handle disputed delivery
    Given a crypto payment is in escrow
    When a dispute is raised
    Then the escrow should be marked as disputed
    And the funds should remain locked
    And an admin should be able to resolve the dispute

  Scenario: Verify commission rate in smart contract
    Given the smart contract is deployed
    When the commission rate is queried
    Then it should return 1500 basis points
    And this should equal 15% in decimal form

  Scenario: Handle insufficient crypto balance
    Given a customer has only 50 USDC
    When the customer attempts to pay 100 USDC
    Then the transaction should fail
    And the error should indicate "Insufficient balance"
    And no escrow should be created

  Scenario: Handle unsupported token
    Given a customer attempts to pay with DAI token
    And DAI is not a supported token
    When the payment is initiated
    Then the transaction should be rejected
    And the error should indicate "Token not supported"

  Scenario: Gas fee handling
    Given a crypto payment is initiated
    When the transaction is submitted
    Then the customer should pay the gas fees
    And the gas fees should not affect the commission calculation
    And the platform should receive exactly 15% commission
