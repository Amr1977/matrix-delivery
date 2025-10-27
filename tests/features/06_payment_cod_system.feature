@payment_system @cash_on_delivery @implemented
Feature: Cash on Delivery Payment System
  As a driver
  I want to confirm cash payments after delivery
  So that transactions are properly recorded

  Background:
    Given the P2P delivery platform is running
    And the database is clean and initialized
    And test customer "John Customer" with email "john@example.com" exists
    And test driver "Jane Driver" with email "jane@example.com" exists
    And order "ORD-001" has been delivered with agreed price "$20.00"
    And driver "Jane Driver" is logged in
    And the system time is "2025-10-19T14:00:00Z"

  @PAY-001 @smoke @critical_path
  Scenario: Driver confirms COD payment received
    Given order "ORD-001" status is "delivered"
    And no payment has been recorded yet
    When I view order "ORD-001" details
    Then I should see "Confirm Payment" button
    
    When I click "Confirm Payment" button
    Then I should see confirmation dialog "Confirm you received $20.00 cash from customer?"
    
    When I confirm the payment
    Then payment should be recorded as "completed"
    And payment details should be:
      | amount          | 20.00      |
      | payment_method  | cash       |
      | status          | completed  |
      | platform_fee    | 0.00       |
      | driver_earnings | 20.00      |
    And customer should receive notification "Payment of $20.00 has been confirmed for order ORD-001"
    And I should see success message "COD payment confirmed successfully"

  @PAY-002 @validation
  Scenario: Cannot confirm payment before delivery
    Given order status is "in_transit"
    When I attempt to confirm payment
    Then I should receive error "Order must be delivered before payment can be confirmed"
    And no payment should be recorded

  @PAY-003 @validation
  Scenario: Cannot confirm payment twice
    Given payment has already been confirmed for order "ORD-001"
    When I attempt to confirm payment again
    Then I should receive error "Payment already recorded"
    And no duplicate payment should be created

  @PAY-004 @validation
  Scenario: Only assigned driver can confirm payment
    Given another driver "Bob Driver" is logged in
    And order "ORD-001" is assigned to "Jane Driver"
    When Bob attempts to confirm payment
    Then Bob should receive error "Only assigned driver can confirm payment"
    And no payment should be recorded

  @PAY-005 @security
  Scenario: Customer cannot confirm payment
    Given customer "John Customer" is logged in
    When customer attempts to access payment confirmation endpoint
    Then customer should receive error "Only assigned driver can confirm payment"
    And no payment should be recorded

  @PAY-006 @api
  Scenario: Confirm COD payment via API
    Given I am authenticated as assigned driver
    When I POST to "/api/orders/ORD-001/payment/cod"
    Then I should receive success response
    And response should include:
      | message         | COD payment confirmed successfully |
      | payment.id      | generated_payment_id               |
      | payment.amount  | 20.00                              |
      | payment.status  | completed                          |
      | payment.platform_fee    | 0.00                       |
      | payment.driver_earnings | 20.00                      |

  @PAY-007 @business_logic
  Scenario: Platform fee calculation (currently 0%)
    Given agreed price is "$20.00"
    When payment is confirmed
    Then platform fee should be calculated as "$0.00" (0% of total)
    And driver earnings should be "$20.00" (100% of total)
    And these amounts should be stored in payments table

  @PAY-008 @data_persistence
  Scenario: Payment record is correctly stored in database
    When driver confirms COD payment
    Then a payment record should be created with:
      | field            | value                  |
      | id               | unique_id              |
      | order_id         | ORD-001                |
      | amount           | 20.00                  |
      | currency         | USD                    |
      | payment_method   | cash                   |
      | status           | completed              |
      | payer_id         | john_customer_id       |
      | payee_id         | jane_driver_id         |
      | platform_fee     | 0.00                   |
      | driver_earnings  | 20.00                  |
      | processed_at     | 2025-10-19T14:00:00Z   |
    And timestamps should be in ISO format

  @PAY-009 @ui
  Scenario: Payment status displayed on order details
    Given payment has been confirmed
    When customer views order "ORD-001"
    Then customer should see:
      | field           | value      |
      | Payment Status  | Completed  |
      | Payment Method  | Cash       |
      | Amount Paid     | $20.00     |
      | Payment Date    | displayed  |
    And payment badge should be green

  @PAY-010 @ui
  Scenario: Unpaid order shows pending status
    Given order is delivered but payment not confirmed
    When customer views order details
    Then customer should see:
      | Payment Status | Pending |
      | Payment Method | Cash    |
    And payment badge should be yellow
    And driver should see "Confirm Payment" button

  @PAY-011 @api
  Scenario: Get payment status for order
    Given payment has been confirmed for order "ORD-001"
    When I GET "/api/orders/ORD-001/payment"
    Then I should receive:
      | id              | payment_id   |
      | amount          | 20.00        |
      | currency        | USD          |
      | payment_method  | cash         |
      | status          | completed    |
      | platform_fee    | 0.00         |
      | driver_earnings | 20.00        |
      | processedAt     | timestamp    |

  @PAY-012 @api
  Scenario: Get payment status for unpaid order
    Given order is delivered but payment not confirmed
    When I GET "/api/orders/ORD-001/payment"
    Then I should receive:
      | status         | pending |
      | payment_method | cash    |

  @PAY-013 @integration
  Scenario: Payment confirmation triggers notification
    When driver confirms payment
    Then customer should receive notification:
      | type    | payment_completed                                        |
      | title   | Payment Confirmed                                        |
      | message | Payment of $20.00 has been confirmed for order ORD-001   |
    And notification should be stored in notifications table
    And customer should hear notification sound

  @PAY-014 @driver_earnings
  Scenario: Driver views earnings summary
    Given I am logged in as driver
    And I have completed 5 orders with payments:
      | order    | amount |
      | ORD-001  | 20.00  |
      | ORD-002  | 15.00  |
      | ORD-003  | 25.00  |
      | ORD-004  | 30.00  |
      | ORD-005  | 18.00  |
    When I navigate to "Earnings" page
    Then I should see summary:
      | total_deliveries    | 5      |
      | total_earnings      | 108.00 |
      | driver_earnings     | 108.00 |
      | platform_fee        | 0.00   |
      | net_earnings        | 108.00 |
      | completed_payments  | 5      |
      | pending_payments    | 0      |

  @PAY-015 @driver_earnings @api
  Scenario: Get driver earnings via API
    Given I am authenticated as driver
    When I GET "/api/payments/earnings"
    Then I should receive:
      | summary.totalDeliveries    | integer |
      | summary.totalEarnings      | decimal |
      | summary.driverEarnings     | decimal |
      | summary.platformFee        | decimal |
      | summary.netEarnings        | decimal |
      | summary.completedPayments  | integer |
      | summary.pendingPayments    | integer |
      | recentPayments             | array   |

  @PAY-016 @driver_earnings
  Scenario: Driver views recent payments
    Given I have completed multiple orders
    When I view earnings page
    Then I should see "Recent Payments" section
    And I should see last 10 payments with:
      | order_number  |
      | order_title   |
      | amount        |
      | driver_earnings |
      | status        |
      | processedAt   |

  @PAY-017 @customer_payments
  Scenario: Customer views payment history
    Given customer "John Customer" is logged in
    And customer has completed 3 orders with payments
    When customer navigates to "Payment History"
    Then customer should see all payments:
      | order_number | order_title     | driver_name  | amount | payment_method | status    | date       |
      | ORD-001      | Laptop Delivery | Jane Driver  | 20.00  | cash           | completed | 2025-10-19 |
      | ORD-002      | Books Delivery  | Bob Driver   | 15.00  | cash           | completed | 2025-10-18 |
      | ORD-003      | Food Delivery   | Alice Driver | 10.00  | cash           | completed | 2025-10-17 |

  @PAY-018 @customer_payments @api
  Scenario: Get customer payment history via API
    Given I am authenticated as customer
    When I GET "/api/payments/history"
    Then I should receive array of payments with:
      | id            |
      | orderNumber   |
      | orderTitle    |
      | driverName    |
      | amount        |
      | payment_method|
      | status        |
      | processedAt   |

  @PAY-019 @ui
  Scenario: Payment confirmation button visibility
    Given order status is "delivered"
    And payment not yet confirmed
    When driver views order in "Active Orders"
    Then driver should see "Confirm Payment" button
    And button should be prominently styled
    And button should be green color

  @PAY-020 @ui
  Scenario: Payment confirmed indicator
    Given payment has been confirmed
    When driver views order in "History"
    Then driver should see "Payment Confirmed" badge
    And badge should be green
    And amount should be displayed clearly

  @PAY-021 @validation
  Scenario: Payment amount matches agreed bid price
    Given agreed price in order is "$20.00"
    When payment is confirmed
    Then payment amount should be exactly "$20.00"
    And amount should match assigned_driver_bid_price from order

  @PAY-022 @business_logic
  Scenario: Future platform fee structure (when implemented)
    # This scenario documents future behavior
    Given platform implements 10% fee structure
    And agreed price is "$20.00"
    When payment is confirmed
    Then platform_fee should be "$2.00" (10% of $20)
    And driver_earnings should be "$18.00" (90% of $20)
    # NOTE: Currently platform_fee is 0%, driver gets 100%

  @PAY-023 @error_handling
  Scenario: Handle payment confirmation failure
    Given API error occurs during payment confirmation
    When driver attempts to confirm payment
    Then driver should see error message
    And payment should not be recorded
    And driver should be able to retry

  @PAY-024 @ui
  Scenario: Loading state during payment confirmation
    When driver clicks "Confirm Payment"
    Then button should show "Confirming..." with spinner
    And button should be disabled
    When confirmation completes
    Then success message should appear
    And button should update to "Payment Confirmed"

  @PAY-025 @data_validation
  Scenario: Payment currency is always USD
    When any payment is confirmed
    Then currency should be "USD"
    And this should be consistent across all payments

  @PAY-026 @integration
  Scenario: Payment confirmation completes order lifecycle
    Given order has these states completed:
      | created   |
      | accepted  |
      | picked_up |
      | delivered |
    When payment is confirmed
    Then order lifecycle should be complete
    And order should be ready for review
    And all timestamps should be recorded

  @PAY-027 @ui
  Scenario: Payment details modal for customer
    Given payment has been confirmed
    When customer clicks on payment details
    Then modal should display:
      | Order Number    | ORD-001        |
      | Order Title     | Laptop Delivery|
      | Driver Name     | Jane Driver    |
      | Amount Paid     | $20.00         |
      | Payment Method  | Cash           |
      | Payment Status  | Completed      |
      | Payment Date    | timestamp      |
      | Platform Fee    | $0.00          |
    And modal should have "Close" button

  @PAY-028 @security
  Scenario: Payment data is protected
    Given payment exists for order "ORD-001"
    When unauthorized user attempts to access payment
    Then they should receive error "Unauthorized to view payment"
    And no payment data should be returned

  @PAY-029 @api
  Scenario: Payment endpoints require authentication
    Given I am not logged in
    When I attempt to access any payment endpoint
    Then I should receive error "No token provided"
    And HTTP status code should be 401

  @PAY-030 @reporting
  Scenario: Platform tracks total payment volume
    Given multiple payments have been confirmed
    When admin views platform statistics
    Then they should see:
      | total_payments_processed | count   |
      | total_payment_volume     | sum     |
      | total_platform_fees      | sum     |
      | total_driver_earnings    | sum     |
      | average_order_value      | average |