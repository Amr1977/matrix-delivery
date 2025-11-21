@vendors
Feature: Vendors management
  Scenario: Admin creates a vendor and lists vendors
    Given an admin user exists
    When the admin creates a vendor with name "Test Cafe" city "Alexandria" country "Egypt"
    Then the vendor list includes "Test Cafe"

  Scenario: Admin adds an item to a vendor
    Given an admin user exists
    And a vendor exists with name "Fresh Mart" city "Cairo" country "Egypt"
    When the admin adds item "Apple" price "1.50" to that vendor
    Then the vendor items include "Apple"

  Scenario: Admin updates a vendor
    Given an admin user exists
    And a vendor exists with name "Old Name" city "Giza" country "Egypt"
    When the admin renames that vendor to "New Name"
    Then the vendor details show name "New Name"

  Scenario: Admin deactivates a vendor
    Given an admin user exists
    And a vendor exists with name "Temp Vendor" city "Hurghada" country "Egypt"
    When the admin deactivates that vendor
    Then the vendor is no longer in the active list

  Scenario: Admin updates and deactivates an item
    Given an admin user exists
    And a vendor exists with name "Mega Store" city "Cairo" country "Egypt"
    And the admin adds item "Banana" price "2.00" to that vendor
    When the admin updates that item price to "2.50"
    Then the vendor items include name "Banana" with price "2.50"
    When the admin deactivates that item
    Then the vendor items do not include "Banana"
