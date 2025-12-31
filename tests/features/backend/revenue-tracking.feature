Feature: Revenue Tracking and Reporting
  As a platform administrator
  I want to track all revenue from commissions
  So that I can monitor business performance

  Background:
    Given the platform_revenue table exists
    And all completed payments record revenue

  Scenario: Record revenue for completed payment
    Given a customer completes a payment of 100 EGP
    When the payment is confirmed
    Then a revenue record should be created
    And the commission_amount should be 15.00 EGP
    And the commission_rate should be 0.15
    And the payment_method should be recorded
    And the created_at timestamp should be set

  Scenario Outline: Track revenue by payment method
    Given multiple orders are completed
    When <count> orders of <amount> EGP are paid via <method>
    Then the total revenue for <method> should be <total_revenue> EGP

    Examples:
      | method        | count | amount | total_revenue |
      | stripe        | 3     | 100    | 45.00         |
      | paypal        | 2     | 250    | 75.00         |
      | paymob_card   | 5     | 500    | 375.00        |
      | paymob_wallet | 4     | 300    | 180.00        |
      | crypto        | 1     | 1000   | 150.00        |

  Scenario: Calculate daily revenue
    Given the following orders are completed today:
      | amount | payment_method |
      | 100    | stripe         |
      | 200    | paypal         |
      | 150    | paymob_card    |
    When the daily revenue is calculated
    Then the total daily revenue should be 67.50 EGP
    And the revenue breakdown should show:
      | payment_method | revenue |
      | stripe         | 15.00   |
      | paypal         | 30.00   |
      | paymob_card    | 22.50   |

  Scenario: Calculate weekly revenue
    Given the following orders are completed this week:
      | amount | payment_method |
      | 500    | crypto         |
      | 300    | paymob_wallet  |
      | 750    | stripe         |
    When the weekly revenue is calculated
    Then the total weekly revenue should be 232.50 EGP

  Scenario: Revenue record prevents duplicates
    Given an order with ID "order_123" is completed
    When the revenue is recorded
    And an attempt is made to record revenue again for "order_123"
    Then only one revenue record should exist for "order_123"
    And the duplicate insert should be ignored

  Scenario: Revenue reporting by date range
    Given revenue records exist for the past 30 days
    When a report is requested for the last 7 days
    Then only revenue from the last 7 days should be included
    And the total should be accurate
    And the breakdown by payment method should be provided
