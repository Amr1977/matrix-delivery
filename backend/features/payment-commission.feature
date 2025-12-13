Feature: Payment Commission Calculation
  As a platform owner
  I want to ensure correct commission calculation
  So that the platform and drivers receive accurate payments

  Background:
    Given the platform commission rate is 15%
    And the driver payout rate is 85%

  Scenario Outline: Calculate commission for different order amounts
    Given an order with amount <amount> EGP
    When the commission is calculated
    Then the platform commission should be <commission> EGP
    And the driver payout should be <payout> EGP
    And the commission plus payout should equal <amount> EGP

    Examples:
      | amount | commission | payout |
      | 100    | 15.00      | 85.00  |
      | 250    | 37.50      | 212.50 |
      | 500    | 75.00      | 425.00 |
      | 1000   | 150.00     | 850.00 |
      | 10000  | 1500.00    | 8500.00|

  Scenario: Calculate commission with custom rate
    Given an order with amount 100 EGP
    And a custom commission rate of 10%
    When the commission is calculated with custom rate
    Then the platform commission should be 10.00 EGP
    And the driver payout should be 90.00 EGP

  Scenario: Commission calculation maintains financial integrity
    Given an order with amount 333.33 EGP
    When the commission is calculated
    Then the commission plus payout should equal the original amount within 0.01 EGP
