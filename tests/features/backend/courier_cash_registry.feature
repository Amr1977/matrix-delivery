@courier_cash_registry
Feature: Courier Cash Registry
  As a courier
  I want to register my available cash for upfront payments
  So that I only see orders I can afford to take

  Background:
    Given the system is running
    And a driver "cash_driver" exists

  # ========================================
  # Cash Registration
  # ========================================

  @cash_registration @CCR-001
  Scenario: Driver sets available cash in profile
    Given driver "cash_driver" has no cash registered
    When driver updates available cash to 500 EGP
    Then driver's available cash should be 500 EGP

  @cash_registration @CCR-002
  Scenario: Driver updates available cash
    Given driver "cash_driver" has 200 EGP available cash
    When driver updates available cash to 350 EGP
    Then driver's available cash should be 350 EGP

  # ========================================
  # Order Filtering
  # ========================================

  @cash_filtering @CCR-003
  Scenario: Orders filtered by courier cash capacity
    Given driver "cash_driver" has 100 EGP available cash
    And these orders exist:
      | Order | Upfront Payment |
      | A     | 50 EGP          |
      | B     | 100 EGP         |
      | C     | 150 EGP         |
    When driver views available orders
    Then driver should see Order A and Order B
    And driver should NOT see Order C

  @cash_filtering @CCR-004
  Scenario: Orders also filtered by distance
    Given driver "cash_driver" has 200 EGP available cash
    And driver is located in Maadi
    And these orders exist:
      | Order | Upfront Payment | Pickup Location |
      | A     | 50 EGP          | Maadi (1 km)    |
      | B     | 50 EGP          | Giza (15 km)    |
    When driver views available orders
    Then driver should see Order A
    And driver should NOT see Order B

  @cash_filtering @CCR-005
  Scenario: Zero upfront orders visible to all
    Given driver "cash_driver" has 0 EGP available cash
    And an order exists with 0 EGP upfront payment
    When driver views available orders
    Then driver should see the order
