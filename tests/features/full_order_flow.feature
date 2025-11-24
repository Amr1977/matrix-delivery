Feature: Full Order Flow E2E
  As a system administrator
  I want to verify the complete order lifecycle from creation to mutual review
  So that I can ensure the platform functions correctly for end users

  @full-flow
  Scenario: Customer publishes order, driver bids, delivers, and both review
    Given the delivery platform is running
    And I exist as a customer with email "user@customer.com" and password "***REDACTED***"
    And I exist as a driver with email "user@driver.com" and password "***REDACTED***"

    # Customer creates order
    When I log in as "user@customer.com" with password "***REDACTED***"
    And I navigate to the create order page
    And I enter the order information:
      | title       | Urgent Document Delivery |
      | description | Legal documents          |
      | price       | 50.00                    |
    And I set the pickup location to:
      | country  | Egypt         |
      | city     | Cairo         |
      | area     | Maadi         |
      | street   | Road 9        |
      | building | 10            |
      | person   | Sender Name   |
    And I set the delivery location to:
      | country  | Egypt         |
      | city     | Cairo         |
      | area     | Zamalek       |
      | street   | 26 July St    |
      | building | 20            |
      | person   | Receiver Name |
    And I publish the new order
    Then I should see a success message
    And I logout

    # Driver places bid
    When I log in as "user@driver.com" with password "***REDACTED***"
    And I view the available orders
    And I place a bid of "45.00" on the order "Urgent Document Delivery"
    Then I should see my bid listed
    And I logout

    # Customer accepts bid
    When I log in as "user@customer.com" with password "***REDACTED***"
    And I view my orders
    And I view the details of order "Urgent Document Delivery"
    And I accept the bid from "user@driver.com"
    Then the order status updates to "Accepted"
    And I logout

    # Driver picks up and delivers
    When I log in as "user@driver.com" with password "***REDACTED***"
    And I view my accepted orders
    And I view the details of order "Urgent Document Delivery"
    And I mark the order as "Picked Up"
    Then the order status updates to "In Transit"
    When I mark the order as "Delivered"
    Then the order status updates to "Delivered"

    # Driver reviews customer
    When I click the button "Review Customer"
    And I submit a 5-star review with comment "Great customer, easy pickup."
    Then I should see the text "Review submitted successfully"
    And I logout

    # Customer reviews driver
    When I log in as "user@customer.com" with password "***REDACTED***"
    And I view my orders
    And I view the details of order "Urgent Document Delivery"
    And I click the button "Review Driver"
    And I submit a 5-star review with comment "Excellent driver, very fast."
    Then I should see the text "Review submitted successfully"
