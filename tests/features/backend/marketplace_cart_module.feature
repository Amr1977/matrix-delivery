@backend @marketplace_cart
Feature: Marketplace Cart Module
  The cart module allows customers to add items from vendors to their shopping cart
  with single-store constraint, stock validation, and automatic expiration
  using the /api/cart endpoints.

  Background:
    Given an admin user exists
    And a vendor exists with name "Cart Vendor" city "Cairo" country "Egypt"
    And a vendor owner user exists for that vendor
    And that vendor has a marketplace store named "Cart Store"
    And that store has a marketplace item named "Coffee Beans" with price "50.00" and inventory "20"
    And that store has a marketplace item named "Tea Bags" with price "25.00" and inventory "30"
    And a customer user exists

  Scenario: Customer adds item to empty cart
    When the customer adds 2 "Coffee Beans" to their cart
    Then the cart contains 2 "Coffee Beans"
    And the cart total is "100.00"
    And the cart belongs to "Cart Store"

  Scenario: Customer adds multiple different items to cart
    When the customer adds 1 "Coffee Beans" to their cart
    And the customer adds 3 "Tea Bags" to their cart
    Then the cart contains 1 "Coffee Beans" and 3 "Tea Bags"
    And the cart total is "125.00"

  Scenario: Customer updates cart item quantity
    Given the customer has 2 "Coffee Beans" in their cart
    When the customer updates "Coffee Beans" quantity to 5
    Then the cart contains 5 "Coffee Beans"
    And the cart total is "250.00"

  Scenario: Customer removes item from cart
    Given the customer has 2 "Coffee Beans" and 1 "Tea Bags" in their cart
    When the customer removes "Coffee Beans" from their cart
    Then the cart contains only 1 "Tea Bags"
    And the cart total is "25.00"

  Scenario: Customer clears entire cart
    Given the customer has 2 "Coffee Beans" and 1 "Tea Bags" in their cart
    When the customer clears their cart
    Then the cart is empty
    And the cart total is "0.00"

  Scenario: Prevent adding items from different stores (single-store constraint)
    Given another vendor exists with name "Second Vendor" city "Alexandria" country "Egypt"
    And that vendor has a marketplace store named "Second Store"
    And that store has a marketplace item named "Different Item" with price "15.00" and inventory "10"
    And the customer has 1 "Coffee Beans" in their cart from "Cart Store"
    When the customer attempts to add 1 "Different Item" to their cart
    Then the cart operation fails with error "Cannot add items from this store. You already have items from"

  Scenario: Prevent adding items exceeding available stock
    When the customer attempts to add 25 "Coffee Beans" to their cart
    Then the cart operation fails with error "Insufficient stock. Only 20 items available"

  Scenario: Prevent adding zero or negative quantity
    When the customer attempts to add 0 "Coffee Beans" to their cart
    Then the cart operation fails with error "Quantity must be greater than 0"

  Scenario: Prevent updating to zero or negative quantity
    Given the customer has 2 "Coffee Beans" in their cart
    When the customer attempts to update "Coffee Beans" quantity to 0
    Then the cart item is removed
    And the cart is empty

  Scenario: Validate cart for checkout when cart is empty
    When the customer validates their cart for checkout
    Then the cart validation fails with error "Cart is empty"

  Scenario: Validate cart for checkout with sufficient stock
    Given the customer has 2 "Coffee Beans" in their cart
    When the customer validates their cart for checkout
    Then the cart validation succeeds
    And the cart is valid for checkout

  Scenario: Validate cart for checkout with insufficient stock
    Given the customer has 2 "Coffee Beans" in their cart
    And the "Coffee Beans" inventory is reduced to 1
    When the customer validates their cart for checkout
    Then the cart validation fails
    And the stock issue shows "Coffee Beans: requested 2, available 1"

  Scenario: Check if customer can add item from store when cart is empty
    When the customer checks if they can add items from "Cart Store"
    Then the customer can add items from "Cart Store"

  Scenario: Check if customer can add item from store when cart has different store items
    Given the customer has 1 "Coffee Beans" in their cart from "Cart Store"
    When the customer checks if they can add items from different store
    Then the customer cannot add items from different store
    And the conflicting store is "Cart Store"

  Scenario: Get cart when no active cart exists
    When the customer gets their cart
    Then the response indicates no active cart found

  Scenario: Get cart statistics
    Given the customer has 2 "Coffee Beans" and 3 "Tea Bags" in their cart
    When the customer gets their cart statistics
    Then the cart stats show total carts "1", total items "5", total value "175.00"

  Scenario: Change cart store clears existing cart
    Given another vendor exists with name "Third Vendor" city "Giza" country "Egypt"
    And that vendor has a marketplace store named "Third Store"
    And that store has a marketplace item named "Third Item" with price "10.00" and inventory "5"
    And the customer has 1 "Coffee Beans" in their cart from "Cart Store"
    When the customer changes their cart to "Third Store"
    Then the cart is cleared
    And the cart belongs to "Third Store"
    And the cart is empty

  Scenario: Cart shows discounted prices when offers are active
    Given an active percentage discount offer of 20% exists on "Coffee Beans"
    When the customer adds 1 "Coffee Beans" to their cart
    Then the cart item shows original price "50.00"
    And the cart item shows discounted price "40.00"
    And the cart total reflects discounted prices

  Scenario: Cart expiration prevents access to expired carts
    Given the customer had a cart that expired 8 days ago
    When the customer attempts to get their cart
    Then the response indicates no active cart found

  Scenario: Prevent accessing cart of another user
    Given another customer user exists with name "Other Customer"
    And that customer has 1 "Coffee Beans" in their cart
    When the first customer attempts to access the other customer's cart
    Then the operation is not allowed due to authentication

  Scenario: Cart item prices are locked at time of adding
    Given the customer has 1 "Coffee Beans" in their cart at price "50.00"
    And the "Coffee Beans" price is updated to "55.00"
    When the customer gets their cart
    Then the cart shows the locked price "50.00"
    And not the updated price "55.00"
