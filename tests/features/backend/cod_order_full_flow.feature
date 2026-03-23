@cod_full_flow @backend
Feature: COD Order Full Flow
  As a customer
  I want to create orders with Cash on Delivery payment
  So that I can pay for deliveries in cash when received

  As a driver
  I want to see COD orders and filter them
  So that I can choose to accept COD orders

  Background:
    Given the platform commission rate is 10%
    And the minimum bid amount is 10 LE

  # ==========================================================================
  # Customer Creates COD Order
  # ==========================================================================

  @cod_create @COD-FLOW-001
  Scenario: Customer creates COD order successfully
    Given I am logged in as a customer
    When I create an order with:
      | field           | value        |
      | pickup          | Cairo        |
      | dropoff         | Giza         |
      | price           | 200          |
      | payment_method  | COD          |
    Then the order should be created
    And the order payment_method should be "COD"
    And the order status should be "pending_bids"

  @cod_create @COD-FLOW-002
  Scenario: Customer creates order with default payment method
    Given I am logged in as a customer
    When I create an order without specifying payment_method
    Then the order should be created
    And the order payment_method should default to "COD"

  @cod_create @COD-FLOW-003
  Scenario: Customer cannot create order with invalid payment method
    Given I am logged in as a customer
    When I try to create an order with payment_method "INVALID"
    Then the order creation should fail
    And the error should mention "payment_method must be COD or PREPAID"

  @cod_create @COD-FLOW-004
  Scenario: Customer creates PREPAID order
    Given I am logged in as a customer
    And I have balance of 500 EGP
    When I create an order with:
      | field           | value        |
      | price           | 200          |
      | payment_method  | PREPAID      |
    Then the order should be created
    And the order payment_method should be "PREPAID"
    And 200 EGP should be held from my balance

  # ==========================================================================
  # Driver Views COD Orders
  # ==========================================================================

  @cod_view @COD-FLOW-010
  Scenario: Driver sees COD badge on order card
    Given a customer created a COD order with price 200 LE
    When I am logged in as a driver
    And I view the available orders
    Then I should see the order with a "COD" badge

  @cod_view @COD-FLOW-011
  Scenario: Driver sees PREPAID badge on order card
    Given a customer created a PREPAID order with price 200 LE
    When I am logged in as a driver
    And I view the available orders
    Then I should see the order with a "Prepaid" badge

  @cod_view @COD-FLOW-012
  Scenario: Driver filters to show only COD orders
    Given the following orders exist:
      | order_id | payment_method |
      | order1   | COD            |
      | order2   | PREPAID        |
      | order3   | COD            |
    When I am logged in as a driver
    And I filter by "COD"
    Then I should see order1 and order3
    And I should not see order2

  @cod_view @COD-FLOW-013
  Scenario: Driver filters to show only PREPAID orders
    Given the following orders exist:
      | order_id | payment_method |
      | order1   | COD            |
      | order2   | PREPAID        |
    When I am logged in as a driver
    And I filter by "PREPAID"
    Then I should see order2
    And I should not see order1

  @cod_view @COD-FLOW-014
  Scenario: Driver clears payment filter to see all orders
    Given the following orders exist:
      | order_id | payment_method |
      | order1   | COD            |
      | order2   | PREPAID        |
    When I am logged in as a driver
    And I filter by "COD"
    And I clear the filter
    Then I should see order1 and order2

  # ==========================================================================
  # Driver Accepts COD Order
  # ==========================================================================

  @cod_accept @COD-FLOW-020
  Scenario: Driver accepts COD order
    Given a customer created a COD order with price 200 LE
    And a driver with balance of 100 EGP
    When the driver bids 50 LE on the order
    And the customer accepts the bid
    Then the order status should be "accepted"
    And the driver should have an upfront hold of 0 EGP

  @cod_accept @COD-FLOW-021
  Scenario: Driver accepts COD order with upfront payment
    Given a customer created a COD order with:
      | field          | value |
      | price          | 200   |
      | payment_method | COD   |
      | upfront        | 50    |
    And a driver with balance of 100 EGP
    When the driver bids 50 LE on the order
    And the customer accepts the bid
    Then the order status should be "accepted"
    And the driver should have an upfront hold of 50 EGP

  @cod_accept @COD-FLOW-022
  Scenario: Driver accepts PREPAID order - full amount held
    Given a customer created a PREPAID order with price 200 LE
    And a driver with balance of 100 EGP
    When the driver bids 50 LE on the order
    And the customer accepts the bid
    Then the order status should be "accepted"
    And the driver should have an escrow hold of 200 EGP

  # ==========================================================================
  # COD Order Delivery Flow
  # ==========================================================================

  @cod_delivery @COD-FLOW-030
  Scenario: Driver completes COD order - cash collected
    Given a driver accepted a COD order with bid 50 LE
    When the driver picks up the order
    And the driver delivers the order
    And the driver collects 200 EGP from customer
    And the driver confirms delivery
    Then the order status should be "delivered"
    And the driver should receive 45 EGP (50 - 5 commission)
    And a platform_fee transaction of -5 should be created

  @cod_delivery @COD-FLOW-031
  Scenario: Driver completes COD order with upfront
    Given a driver accepted a COD order with:
      | field    | value |
      | bid      | 50    |
      | upfront  | 30    |
    When the driver picks up the order
    And the driver delivers the order
    And the driver collects 200 EGP from customer
    And the driver confirms delivery
    Then the order status should be "delivered"
    And the driver should receive 50 EGP (bid amount)
    And the upfront hold of 30 should be released

  @cod_delivery @COD-FLOW-032
  Scenario: Driver completes PREPAID order
    Given a customer created a PREPAID order with price 200 LE
    And a driver accepted the order with bid 50 LE
    When the driver picks up the order
    And the driver delivers the order
    And the driver confirms delivery
    Then the order status should be "delivered"
    And the escrow hold of 200 should be released
    And the driver should receive 45 EGP (50 - 5 commission)

  # ==========================================================================
  # Balance Impact
  # ==========================================================================

  @cod_balance @COD-FLOW-040
  Scenario: Driver balance after COD delivery
    Given a driver with balance of 50 EGP
    And the driver completed a COD order with bid 100 LE
    When the delivery is confirmed
    Then the driver balance should be 40 EGP
    And the platform should have collected 10 EGP commission

  @cod_balance @COD-FLOW-041
  Scenario: Driver balance goes negative after COD delivery
    Given a driver with balance of 0 EGP
    And the driver completed a COD order with bid 100 LE
    When the delivery is confirmed
    Then the driver balance should be -10 EGP
    And the driver should still be able to bid

  @cod_balance @COD-FLOW-042
  Scenario: PREPAID order - customer balance deducted upfront
    Given a customer with balance of 500 EGP
    And the customer created a PREPAID order with price 200 LE
    When the order is created
    Then 200 EGP should be held from customer balance
    And the customer available balance should be 300 EGP

  @cod_balance @COD-FLOW-043
  Scenario: PREPAID order - customer balance released on delivery
    Given a customer with balance of 500 EGP
    And the customer created a PREPAID order with price 200 LE
    And the order was delivered
    When the customer confirms receipt
    Then 200 EGP should be transferred to driver
    And the customer balance should be 300 EGP

  # ==========================================================================
  # Error Cases
  # ==========================================================================

  @cod_error @COD-FLOW-050
  Scenario: Customer with insufficient balance cannot create PREPAID order
    Given I am logged in as a customer
    And I have balance of 50 EGP
    When I try to create a PREPAID order with price 200 LE
    Then the order creation should fail
    And the error should mention "Insufficient balance"

  @cod_error @COD-FLOW-051
  Scenario: COD order can be created without balance check
    Given I am logged in as a customer
    And I have balance of 0 EGP
    When I create a COD order with price 200 LE
    Then the order should be created successfully

  # ==========================================================================
  # Full Workflow
  # ==========================================================================

  @cod_workflow @COD-FLOW-060
  Scenario: Complete COD order workflow
    Given customer "Ahmed" has balance of 500 EGP
    And driver "Karim" has balance of 100 EGP

    # Step 1: Customer creates COD order
    When customer "Ahmed" creates an order:
      | field           | value   |
      | pickup          | Maadi   |
      | dropoff         | NasrCity|
      | price           | 150     |
      | payment_method  | COD     |
    Then the order should have payment_method "COD"

    # Step 2: Driver views and filters orders
    When driver "Karim" filters orders by "COD"
    Then the order should appear in available orders

    # Step 3: Driver accepts the order
    When driver "Karim" bids 40 LE
    And customer "Ahmed" accepts the bid
    Then the order status should be "accepted"

    # Step 4: Driver completes the order
    When driver "Karim" picks up the order
    And driver "Karim" delivers the order
    And driver "Karim" collects 150 EGP cash
    And driver "Karim" confirms delivery
    Then the order status should be "delivered"

    # Step 5: Verify balance changes
    Then driver "Karim" balance should be 64 EGP
    And a platform_fee of -4 should be recorded

  @cod_workflow @COD-FLOW-061
  Scenario: Complete PREPAID order workflow
    Given customer "Ahmed" has balance of 500 EGP
    And driver "Karim" has balance of 100 EGP

    # Step 1: Customer creates PREPAID order
    When customer "Ahmed" creates an order:
      | field           | value   |
      | price           | 150     |
      | payment_method  | PREPAID |
    Then 150 EGP should be held from customer balance
    And the order should have payment_method "PREPAID"

    # Step 2: Driver accepts the order
    When driver "Karim" bids 40 LE
    And customer "Ahmed" accepts the bid
    Then the order status should be "accepted"
    And 150 EGP should be held in escrow

    # Step 3: Driver completes the order
    When driver "Karim" picks up the order
    And driver "Karim" delivers the order
    And driver "Karim" confirms delivery
    Then the order status should be "delivered"

    # Step 4: Verify balance changes
    Then customer "Ahmed" balance should be 350 EGP
    And driver "Karim" balance should be 64 EGP
    And the escrow of 150 should be released
    And a platform_fee of -4 should be recorded
