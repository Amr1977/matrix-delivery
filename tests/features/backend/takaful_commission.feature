@takaful_commission
Feature: Takaful Commission System
  As a platform
  I want to deduct 10% platform + 5% Takaful from each delivery
  So that the platform operates and couriers have cooperative insurance

  Background:
    Given the system is running
    And commission rates are 10% platform and 5% Takaful
    And a customer "takaful_customer" exists with balance 500 EGP
    And a driver "takaful_driver" exists

  # ========================================
  # Commission Deduction
  # ========================================

  @commission_deduction
  Scenario: Commission deducted on order completion
    Given an order with delivery fee 100 EGP
    And the order is completed successfully
    When commission is calculated
    Then platform commission should be 10 EGP
    And Takaful contribution should be 5 EGP
    And driver should receive 85 EGP

  @commission_deduction
  Scenario: Commission breakdown shown to driver
    Given an order with delivery fee 200 EGP is completed
    When driver views their earnings
    Then they should see:
      | Field | Amount |
      | Delivery Fee | 200 EGP |
      | Platform (10%) | -20 EGP |
      | Takaful (5%) | -10 EGP |
      | Net Earnings | 170 EGP |

  # ========================================
  # Takaful Fund Contributions
  # ========================================

  @takaful_contribution
  Scenario: Takaful contribution added to fund
    Given the Takaful fund has balance 10000 EGP
    And an order with delivery fee 100 EGP is completed
    When the commission is processed
    Then the Takaful fund should increase by 5 EGP
    And a contribution record should be created for the driver

  @takaful_contribution
  Scenario: Driver sees total Takaful contributions
    Given driver "takaful_driver" has completed 20 orders
    And total Takaful contributions are 100 EGP
    When driver views their Takaful summary
    Then they should see total contributed: 100 EGP

  # ========================================
  # Emergency Transfer Funding
  # ========================================

  @emergency_funding
  Scenario: Emergency transfer bonus paid from Takaful fund
    Given an emergency transfer occurs
    And the emergency bonus is 12 EGP (20% of 60 EGP)
    When the new courier completes the delivery
    Then 12 EGP should be deducted from Takaful fund
    And the new courier receives original fee + bonus
