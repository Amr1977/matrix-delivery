@vendor-self
Feature: Vendor self-management
  Scenario: Vendor registers and creates their own vendor profile
    Given a vendor user exists
    When the vendor creates self vendor with name "My Shop" city "Cairo" country "Egypt"
    Then the vendor self profile shows name "My Shop"

  Scenario: Vendor updates their profile
    Given a vendor user exists
    And the vendor creates self vendor with name "My Cafe" city "Giza" country "Egypt"
    When the vendor updates self profile city to "Cairo"
    Then the vendor self profile shows city "Cairo"

  Scenario: Vendor manages items
    Given a vendor user exists
    And the vendor creates self vendor with name "Item Shop" city "Cairo" country "Egypt"
    When the vendor adds self item "Tea" price "10.00"
    Then the vendor self items include "Tea"
    When the vendor updates self item price to "12.00"
    Then the vendor self items include name "Tea" with price "12.00"
    When the vendor deactivates self item
    Then the vendor self items do not include "Tea"
