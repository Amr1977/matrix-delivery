@cod_platform_fee @backend
Feature: COD Platform Fee 10% with Bid Threshold
  As a platform operator
  I want to collect 10% platform fee from courier earnings on COD orders
  And enforce a -100 LE bid blocking threshold
  So that couriers can work with credit while the platform earns revenue

  Background:
    Given the platform fee rate is 10%
    Given the minimum bid amount is 10 LE
    Given the bid blocking threshold is -100 LE
    Given the warning threshold is -80 LE

  # ==========================================================================
  # Platform Fee Deduction on COD Delivery
  # ==========================================================================

  @cod_fee @COD-001
  Scenario: Platform fee deducted from courier balance on delivery
    Given a courier with balance of 500 EGP
    And the courier has an accepted COD order with bid price of 100 LE
    When the delivery is confirmed
    Then the platform should deduct 10 LE fee (10% of bid price)
    And the courier balance should be 490 EGP
    And a transaction record should be created with type "platform_fee"

  @cod_fee @COD-002
  Scenario: Platform fee calculated from bid price not order price
    Given a courier with balance of 0 EGP
    And the courier has a COD order where:
      | customer_pays | courier_bid |
      | 200          | 50          |
    When the delivery is confirmed
    Then the platform should deduct 5 LE fee (10% of 50 LE bid)
    And the courier balance should be -5 EGP

  @cod_fee @COD-003
  Scenario: No fee for partial delivery
    Given a courier with balance of 100 EGP
    And the courier has a COD order marked as partial delivery
    When the delivery is confirmed
    Then no platform fee should be deducted
    And the courier balance should remain 100 EGP

  @cod_fee @COD-004
  Scenario: Smallest valid fee (10 LE bid)
    Given a courier with balance of 50 EGP
    And the courier bids 10 LE on a COD order
    When the delivery is confirmed
    Then the platform should deduct 1 LE fee
    And the courier balance should be 49 EGP

  # ==========================================================================
  # Bid Blocking at -100 LE Threshold
  # ==========================================================================

  @bid_blocking @COD-010
  Scenario: Courier blocked from bidding when balance < -100 LE
    Given a courier with balance of -100 EGP
    When the courier tries to place a bid
    Then the bid should be rejected
    And the error should mention "-100 EGP" threshold

  @bid_blocking @COD-011
  Scenario: Courier can bid when balance exactly at -100 LE
    Given a courier with balance of -100 EGP
    When the courier tries to place a bid
    Then the bid should be allowed

  @bid_blocking @COD-012
  Scenario: Courier can bid when balance > -100 LE
    Given a courier with balance of -99 EGP
    When the courier tries to place a bid
    Then the bid should be allowed

  @bid_blocking @COD-013
  Scenario: Blocked courier with active orders can still bid
    Given a courier with balance of -150 EGP
    And the courier has an active order in progress
    When the courier tries to place a bid
    Then the bid should be allowed
    And the reason should be "has active orders"

  @bid_blocking @COD-014
  Scenario: Blocked courier without active orders cannot bid
    Given a courier with balance of -150 EGP
    And the courier has no active orders
    When the courier tries to place a bid
    Then the bid should be rejected
    And the error should mention "below minimum threshold"

  # ==========================================================================
  # Minimum Bid Amount
  # ==========================================================================

  @min_bid @COD-020
  Scenario: Bid below minimum rejected
    Given a courier with balance of 100 EGP
    When the courier tries to bid 9 LE
    Then the bid should be rejected
    And the error should mention "Minimum bid is 10 LE"

  @min_bid @COD-021
  Scenario: Bid at minimum accepted
    Given a courier with balance of 100 EGP
    When the courier tries to bid exactly 10 LE
    Then the bid should be allowed

  @min_bid @COD-022
  Scenario: Bid above minimum accepted
    Given a courier with balance of 100 EGP
    When the courier tries to bid 50 LE
    Then the bid should be allowed

  # ==========================================================================
  # Warning at -80 LE Threshold
  # ==========================================================================

  @warning @COD-030
  Scenario: Warning displayed when approaching threshold
    Given a courier with balance of -80 EGP
    When the courier views the balance dashboard
    Then a warning should be displayed
    And the warning should mention low balance

  @warning @COD-031
  Scenario: No warning when balance is healthy
    Given a courier with balance of 0 EGP
    When the courier views the balance dashboard
    Then no warning should be displayed

  @warning @COD-032
  Scenario: Blocked state when balance < -100 LE
    Given a courier with balance of -100 EGP
    When the courier views the balance dashboard
    Then a blocked message should be displayed
    And the message should mention "-100 EGP" threshold

  # ==========================================================================
  # Available for Bidding Display
  # ==========================================================================

  @bidding_display @COD-040
  Scenario: Show available for bidding when balance is healthy
    Given a courier with balance of 200 EGP
    When the courier views the balance dashboard
    Then "Available for Bidding" should show 200 EGP

  @bidding_display @COD-041
  Scenario: Show available for bidding with negative balance
    Given a courier with balance of -50 EGP
    When the courier views the balance dashboard
    Then "Available for Bidding" should show 50 EGP

  @bidding_display @COD-042
  Scenario: Show blocked when balance < -100 LE
    Given a courier with balance of -120 EGP
    When the courier views the balance dashboard
    Then "Available for Bidding" should show "Bidding blocked"

  # ==========================================================================
  # Transaction Records
  # ==========================================================================

  @transactions @COD-050
  Scenario: Platform fee creates transaction record
    Given a courier with balance of 100 EGP
    And the courier completes a COD delivery with bid of 80 LE
    When the delivery is confirmed
    Then a "platform_fee" transaction should be created
    And the transaction amount should be -8 LE
    And the transaction should reference the order

  @transactions @COD-051
  Scenario: Transaction history shows platform fees
    Given a courier has completed 3 COD deliveries
    When the courier views transaction history
    Then there should be 3 "platform_fee" transactions
    And each should show the correct fee amount

  # ==========================================================================
  # Earnings Preview in Bidding
  # ==========================================================================

  @earnings_preview @COD-060
  Scenario: Show estimated earnings when entering bid
    Given a courier is viewing an order
    When the courier enters a bid of 100 LE
    Then the estimated earnings should show 90 LE
    And the platform fee should show 10 LE

  @earnings_preview @COD-061
  Scenario: Warning shown for minimum bid
    Given a courier is viewing an order
    When the courier enters a bid of 9 LE
    Then a minimum bid warning should be displayed

  # ==========================================================================
  # Realistic Workflows
  # ==========================================================================

  @workflow @COD-070
  Scenario: Typical courier workday with COD earnings
    Given a courier starts with balance of 0 EGP
    When the courier completes 5 deliveries with bids:
      | bid |
      | 60 |
      | 80 |
      | 50 |
      | 70 |
      | 90 |
    Then total platform fees should be 35 LE
    And the courier balance should be -35 EGP
    And the courier should still be able to bid

  @workflow @COD-071
  Scenario: Courier reaches threshold, deposits, continues
    Given a courier has balance of -90 EGP
    When the courier completes 1 more delivery with bid of 100 LE
    Then the balance should be -100 EGP
    And the courier should be blocked from new bids
    
    When the courier deposits 150 LE
    Then the balance should be 50 EGP
    And the courier should be able to bid again

  @workflow @COD-072
  Scenario: Multiple couriers with different debt levels
    Given the following couriers:
      | courier_id | balance |
      | courier1   | 100    |
      | courier2   | -50    |
      | courier3   | -80    |
      | courier4   | -100   |
      | courier5   | -120   |
    When each courier tries to bid
    Then the results should be:
      | courier_id | can_bid | reason                  |
      | courier1   | true     |                        |
      | courier2   | true     |                        |
      | courier3   | true     |                        |
      | courier4   | true     |                        |
      | courier5   | false    | below -100 LE threshold|

  # ==========================================================================
  # Configuration Validation
  # ==========================================================================

  @config @COD-080
  Scenario: Verify platform fee configuration
    When the system checks platform fee settings
    Then the COMMISSION_RATE should be 0.10
    And the MINIMUM_BID_AMOUNT should be 10

  @config @COD-081
  Scenario: Verify bid blocking configuration
    When the system checks bid blocking settings
    Then MAX_DEBT_THRESHOLD should be -100
    And WARNING_THRESHOLD should be -80
    And BLOCK_NEW_ORDERS should be true
