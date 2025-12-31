@customer-browsing
Feature: Customer browsing vendors and items
  Scenario: Browse vendors by city and keyword
    Given vendors "Alpha Cafe" and "Bravo Market" in city "Cairo"
    When the customer browses vendors city "Cairo" q "Cafe"
    Then the browse vendors list includes "Alpha Cafe"
    And the browse vendors list does not include "Bravo Market"

  Scenario: Browse items by category and price range
    Given vendor "Fresh Mart" in city "Cairo" with items "Apple:1.50:fruit" and "Banana:2.50:fruit"
    When the customer browses items category "fruit" min_price "1.0" max_price "2.0"
    Then the browse items list includes "Apple"
    And the browse items list does not include "Banana"

  Scenario: Browse items with pagination and sorting
    Given vendor "Mega Store" in city "Cairo" with items "Item A:5.00" and "Item B:3.00" and "Item C:7.00"
    When the customer browses items vendor_id that vendor sort "price_asc" page "2" limit "2"
    Then the browse items page contains "Item C"
