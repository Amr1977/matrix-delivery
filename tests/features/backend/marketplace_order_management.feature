Feature: Marketplace Order Management
  As a customer or vendor
  I want to create and manage marketplace orders
  So that I can purchase items and manage order fulfillment

  Background:
    Given a customer user exists
    And a vendor owner user exists for that vendor
    And the vendor owner creates a marketplace store named "Test Store"
    And the vendor owner creates a marketplace item named "Test Product" with price "50.00" and inventory "10"

  @marketplace @order
  Scenario: Customer successfully creates an order from cart
    Given the customer adds 2 quantity of "Test Product" to their cart
    When the customer creates an order with delivery address "123 Test Street, Cairo, Egypt"
    Then the order should be created successfully
    And the order should have status "pending"
    And the order should contain the cart items
    And the inventory should be reduced by the ordered quantity
    And a vendor payout should be created for the order

  @marketplace @order
  Scenario: Customer cannot create order with insufficient stock
    Given the customer adds 15 quantity of "Test Product" to their cart
    When the customer attempts to create an order with delivery address "123 Test Street, Cairo, Egypt"
    Then the order creation should fail with insufficient stock error
    And the cart should remain unchanged

  @marketplace @order
  Scenario: Customer cannot create order from empty cart
    When the customer attempts to create an order with delivery address "123 Test Street, Cairo, Egypt"
    Then the order creation should fail with cart validation error

  @marketplace @order
  Scenario: Vendor can view customer's order details
    Given the customer successfully creates an order
    When the vendor views the order details
    Then the vendor should see the complete order information
    And the vendor should see customer delivery details
    And the vendor should see order items with quantities and prices

  @marketplace @order
  Scenario: Complete marketplace order lifecycle
    Given the customer successfully creates an order
    When the customer confirms payment
    Then the order status should be "paid"
    When the vendor accepts the order
    Then the order status should be "accepted"
    When an admin assigns a driver to the order
    Then the order status should be "assigned"
    When the assigned driver picks up the order
    Then the order status should be "picked_up"
    When the driver delivers the order
    Then the order status should be "delivered"
    And a payout should be processed for the vendor
    When the customer confirms receipt
    Then the order status should be "completed"
    And the order lifecycle should be complete

  @marketplace @order
  Scenario: Vendor can reject order after payment
    Given the customer successfully creates an order
    And the customer confirms payment
    When the vendor rejects the order with reason "Out of stock"
    Then the order status should be "rejected"
    And the inventory should be restored
    And a refund should be initiated for the customer

  @marketplace @order
  Scenario: Customer can dispute delivered order
    Given the customer successfully creates an order
    And the order is delivered
    When the customer disputes the order with reason "Wrong item received"
    Then the order status should be "disputed"
    And an admin review should be triggered

  @marketplace @order
  Scenario: Admin can resolve customer dispute
    Given the customer successfully creates an order
    And the order is disputed
    When an admin resolves the dispute with refund
    Then the order status should be "refunded"
    And the refund should be processed

  @marketplace @order
  Scenario: Admin can cancel order at any point
    Given the customer successfully creates an order
    When an admin cancels the order with reason "Emergency cancellation"
    Then the order status should be "cancelled"
    And the inventory should be restored

  @marketplace @order
  Scenario: Customer can cancel order before pickup
    Given the customer successfully creates an order
    When the customer cancels the order with reason "Changed my mind"
    Then the order status should be "cancelled"
    And the inventory should be restored
    And the cancellation reason should be recorded

  @marketplace @order
  Scenario: Customer cannot cancel order after pickup
    Given the customer successfully creates an order
    And the vendor marks the order as picked up
    When the customer attempts to cancel the order
    Then the cancellation should fail with order cannot be cancelled error

  @marketplace @order
  Scenario: Vendor can cancel order with reason
    Given the customer successfully creates an order
    When the vendor cancels the order with reason "Item out of stock"
    Then the order status should be "cancelled"
    And the inventory should be restored
    And the cancellation reason should be recorded

  @marketplace @order
  Scenario: Customer can view their order history
    Given the customer successfully creates an order
    When the customer views their order history
    Then the customer should see their order in the list
    And the order should show correct status and total amount

  @marketplace @order
  Scenario: Customer can filter orders by status
    Given the customer has orders with different statuses
    When the customer filters orders by status "delivered"
    Then only delivered orders should be shown

  @marketplace @order
  Scenario: Vendor can view their order statistics
    Given the vendor has multiple completed orders
    When the vendor checks their order statistics
    Then the vendor should see total orders count
    And the vendor should see completed orders count
    And the vendor should see total revenue
    And the vendor should see average order value

  @marketplace @order
  Scenario: Order number is unique and follows format
    Given the customer successfully creates an order
    Then the order should have a unique order number
    And the order number should follow format "MO-{timestamp}-{random}"

  @marketplace @order
  Scenario: Order includes delivery and commission calculations
    Given the customer adds items to cart with subtotal "100.00"
    When the customer creates an order with delivery fee "10.00"
    Then the order total should be "110.00"
    And the vendor commission should be calculated as "11.00"
    And the vendor payout amount should be "99.00"

  @marketplace @order
  Scenario: Order audit trail is maintained
    Given the customer successfully creates an order
    When the vendor updates the order status multiple times
    Then all order status changes should be logged in audit trail
    And the audit log should include user, action, and timestamp

  @marketplace @order
  Scenario: Unauthorized user cannot access order
    Given another user exists
    And the customer successfully creates an order
    When the other user attempts to view the order
    Then access should be denied with unauthorized error

  @marketplace @order
  Scenario: Order timestamps are properly maintained
    Given the customer successfully creates an order
    Then the order should have created_at timestamp
    When the vendor confirms the order
    Then the order should have confirmed_at timestamp
    When the vendor marks as prepared
    Then the order should have prepared_at timestamp
    When the vendor marks as picked up
    Then the order should have picked_up_at timestamp
    When the vendor marks as delivered
    Then the order should have delivered_at timestamp
