Feature: COD Commission and Debt Management
  As a platform operator
  I want to collect 10% commission on COD orders
  And manage driver debt to ensure platform sustainability
  So that drivers pay their fair share while maintaining cash flow

  Background:
    Given the platform commission rate is 10%
    And the maximum debt threshold is -100 EGP
    And the warning debt threshold is -80 EGP

  # ==========================================================================
  # Basic COD Commission Flow
  # ==========================================================================

  Scenario: Driver completes COD order with positive balance
    Given a driver with balance of 500 EGP
    When the driver completes a 100 EGP COD order
    Then the platform should deduct 10 EGP commission
    And the driver balance should be 490 EGP
    And the driver should keep 90 EGP cash
    And the payment record should show:
      | field            | value |
      | amount           | 100   |
      | platform_fee     | 10    |
      | driver_earnings  | 90    |
      | payment_method   | cash  |
      | status           | completed |

  Scenario: Driver completes COD order with zero balance
    Given a driver with balance of 0 EGP
    When the driver completes a 100 EGP COD order
    Then the platform should deduct 10 EGP commission
    And the driver balance should be -10 EGP
    And the driver should keep 90 EGP cash
    And the driver should still be able to accept orders

  Scenario: Commission calculation is accurate for various amounts
    Given a driver with balance of 1000 EGP
    When the driver completes the following COD orders:
      | amount |
      | 50     |
      | 100    |
      | 200    |
      | 333.33 |
    Then the total commission should be 68.33 EGP
    And the driver balance should be 931.67 EGP

  # ==========================================================================
  # Debt Creation and Management
  # ==========================================================================

  Scenario: Driver balance goes negative creating debt
    Given a driver with balance of 10 EGP
    When the driver completes a 100 EGP COD order
    Then the platform should deduct 10 EGP commission
    And the driver balance should be 0 EGP
    And the balance should be marked as debt
    And the driver should still be able to accept orders

  Scenario: Driver accumulates debt from multiple orders
    Given a driver with balance of 0 EGP
    When the driver completes 5 COD orders of 100 EGP each
    Then the total commission should be 50 EGP
    And the driver balance should be -50 EGP
    And the driver should still be able to accept orders

  Scenario: Driver approaches warning threshold
    Given a driver with balance of 0 EGP
    When the driver completes 8 COD orders of 100 EGP each
    Then the driver balance should be -80 EGP
    And the driver should receive a warning notification
    And the warning should say "Your balance is low. Please deposit funds to continue accepting orders."
    And the driver should still be able to accept orders

  # ==========================================================================
  # Order Blocking at Debt Threshold
  # ==========================================================================

  Scenario: Driver is blocked at exact debt threshold
    Given a driver with balance of 0 EGP
    When the driver completes 10 COD orders of 100 EGP each
    Then the driver balance should be -100 EGP
    And the driver should NOT be able to accept new orders
    And the driver should receive a critical notification
    And the notification should say "You cannot accept new orders until your balance is above -100 EGP"

  Scenario: Driver is blocked with excessive debt
    Given a driver with balance of 0 EGP
    When the driver completes 15 COD orders of 100 EGP each
    Then the driver balance should be -150 EGP
    And the driver should NOT be able to accept new orders
    And the error message should contain "Balance (-150 EGP) below minimum threshold (-100 EGP)"

  Scenario: Blocked driver cannot accept bid
    Given a driver with balance of -120 EGP
    And a customer creates an order worth 100 EGP
    When the driver tries to accept the order
    Then the bid acceptance should fail
    And the error should say "Cannot accept order: Balance (-120 EGP) below minimum threshold (-100 EGP). Please deposit funds to continue accepting orders."

  # ==========================================================================
  # Debt Recovery
  # ==========================================================================

  Scenario: Driver clears debt and can accept orders again
    Given a driver with balance of -120 EGP
    When the driver deposits 150 EGP
    Then the driver balance should be 30 EGP
    And the driver should be able to accept new orders
    And no warning notifications should be shown

  Scenario: Driver makes partial debt payment
    Given a driver with balance of -80 EGP
    When the driver deposits 50 EGP
    Then the driver balance should be -30 EGP
    And the driver should still be able to accept orders
    And no warning notifications should be shown

  Scenario: Driver clears debt exactly to threshold
    Given a driver with balance of -100 EGP
    When the driver deposits 1 EGP
    Then the driver balance should be -99 EGP
    And the driver should be able to accept new orders

  # ==========================================================================
  # Earnings Display
  # ==========================================================================

  Scenario: Driver views earnings dashboard with COD summary
    Given a driver has completed 5 COD orders totaling 500 EGP
    And the total commission deducted is 50 EGP
    And the driver's current balance is 0 EGP
    When the driver views the balance dashboard
    Then the COD earnings section should show:
      | field                    | value  |
      | Cash Collected           | 500    |
      | Platform Commission (10%)| -50    |
      | Net Earnings             | 450    |
      | Current Balance          | 0 EGP  |
    And no warning should be displayed

  Scenario: Driver views earnings with warning
    Given a driver has completed 8 COD orders totaling 800 EGP
    And the driver's current balance is -80 EGP
    When the driver views the balance dashboard
    Then a warning box should be displayed
    And the warning should say "⚠️ Your balance is low. Please deposit funds to continue accepting orders."

  Scenario: Driver views earnings when blocked
    Given a driver has completed 15 COD orders totaling 1500 EGP
    And the driver's current balance is -150 EGP
    When the driver views the balance dashboard
    Then an error box should be displayed
    And the error should say "🚫 You cannot accept new orders until your balance is above -100 EGP."
    And a "Deposit Now" button should be visible

  # ==========================================================================
  # Transaction History
  # ==========================================================================

  Scenario: Commission deductions appear in transaction history
    Given a driver with balance of 100 EGP
    When the driver completes a 100 EGP COD order
    And the driver views transaction history
    Then the history should contain a transaction with:
      | field       | value                                  |
      | type        | commission_deduction                   |
      | amount      | -10                                    |
      | description | Platform commission for order #[ORDER] |
      | status      | completed                              |

  Scenario: Multiple commission deductions are tracked
    Given a driver completes 3 COD orders of 100 EGP each
    When the driver views transaction history
    Then there should be 3 commission_deduction transactions
    And each transaction should have amount -10 EGP

  # ==========================================================================
  # Edge Cases
  # ==========================================================================

  Scenario: Very small commission amount
    Given a driver with balance of 0 EGP
    When the driver completes a 10 EGP COD order
    Then the platform should deduct 1 EGP commission
    And the driver balance should be -1 EGP

  Scenario: Large commission amount
    Given a driver with balance of 0 EGP
    When the driver completes a 1000 EGP COD order
    Then the platform should deduct 100 EGP commission
    And the driver balance should be -100 EGP
    And the driver should still be able to accept orders

  Scenario: Zero commission (edge case)
    Given a driver with balance of 100 EGP
    When the driver completes a 0 EGP COD order
    Then the platform should deduct 0 EGP commission
    And the driver balance should be 100 EGP

  Scenario: Decimal precision in commission calculation
    Given a driver with balance of 0 EGP
    When the driver completes a 33.33 EGP COD order
    Then the platform should deduct 3.33 EGP commission
    And the driver balance should be -3.33 EGP

  # ==========================================================================
  # Realistic Scenarios
  # ==========================================================================

  Scenario: Typical driver workday
    Given a driver starts the day with balance of 50 EGP
    When the driver completes the following COD orders:
      | amount |
      | 80     |
      | 120    |
      | 95     |
      | 150    |
      | 75     |
      | 110    |
      | 85     |
      | 130    |
      | 90     |
      | 100    |
    Then the total cash collected should be 1035 EGP
    And the total commission should be 103.50 EGP
    And the net earnings should be 931.50 EGP
    And the driver balance should be -53.50 EGP
    And the driver should still be able to accept orders

  Scenario: Driver reaches threshold, deposits, and continues working
    Given a driver with balance of 0 EGP
    When the driver completes 10 COD orders of 100 EGP each
    Then the driver balance should be -100 EGP
    And the driver should NOT be able to accept new orders
    
    When the driver deposits 150 EGP
    Then the driver balance should be 50 EGP
    And the driver should be able to accept new orders
    
    When the driver completes 5 more COD orders of 100 EGP each
    Then the driver balance should be 0 EGP
    And the driver should still be able to accept orders

  Scenario: Multiple drivers with different debt levels
    Given the following drivers:
      | driver_id | balance |
      | driver1   | 100     |
      | driver2   | -50     |
      | driver3   | -80     |
      | driver4   | -120    |
    When each driver tries to accept a new order
    Then the results should be:
      | driver_id | can_accept | reason                                    |
      | driver1   | true       |                                           |
      | driver2   | true       |                                           |
      | driver3   | true       |                                           |
      | driver4   | false      | Balance below minimum threshold (-100 EGP)|

  # ==========================================================================
  # Payment Record Integrity
  # ==========================================================================

  Scenario: Payment record is created with correct commission split
    Given a driver with balance of 0 EGP
    When the driver completes a 200 EGP COD order
    Then a payment record should be created with:
      | field            | value     |
      | amount           | 200       |
      | platform_fee     | 20        |
      | driver_earnings  | 180       |
      | payment_method   | cash      |
      | status           | completed |
      | currency         | EGP       |
    And the payment should be linked to the order
    And the payment should be linked to the driver

  Scenario: Multiple payments maintain correct commission tracking
    Given a driver completes 5 COD orders of 100 EGP each
    When the platform queries payment records for the driver
    Then there should be 5 payment records
    And each payment should have platform_fee of 10 EGP
    And each payment should have driver_earnings of 90 EGP
    And the total platform_fee should be 50 EGP
    And the total driver_earnings should be 450 EGP

  # ==========================================================================
  # Notification System
  # ==========================================================================

  Scenario: Warning notification sent at threshold
    Given a driver with balance of -70 EGP
    When the driver completes a 100 EGP COD order
    Then the driver balance should be -80 EGP
    And a warning notification should be sent to the driver
    And the notification type should be "balance_warning"
    And the notification title should be "Balance Alert"

  Scenario: Critical notification sent when blocked
    Given a driver with balance of -90 EGP
    When the driver completes a 100 EGP COD order
    Then the driver balance should be -100 EGP
    And a critical notification should be sent to the driver
    And the notification type should be "balance_warning"
    And the notification message should contain "cannot accept new orders"

  Scenario: No notification when balance is healthy
    Given a driver with balance of 100 EGP
    When the driver completes a 100 EGP COD order
    Then the driver balance should be 90 EGP
    And no balance warning notification should be sent

  # ==========================================================================
  # Configuration Validation
  # ==========================================================================

  Scenario: Verify debt management configuration
    When the system checks debt management settings
    Then the MAX_DEBT_THRESHOLD should be -100 EGP
    And the WARNING_THRESHOLD should be -80 EGP
    And BLOCK_NEW_ORDERS should be true
    And ALLOW_NEGATIVE_BALANCE should be true

  Scenario: Verify commission rate configuration
    When the system checks commission settings
    Then the COMMISSION_RATE should be 0.10
    And the COMMISSION_RATE_PERCENT should be 10
    And the COD fee should be 0
