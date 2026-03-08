@backend @marketplace_stores
Feature: Marketplace Store Module
  The marketplace store module allows vendors and admins to manage stores
  using the new /api/marketplace/stores endpoints.

  Scenario: Vendor owner creates and updates a store
    Given an admin user exists
    And a vendor exists with name "Store Vendor" city "Cairo" country "Egypt"
    And a vendor owner user exists for that vendor
    When the vendor owner creates a marketplace store named "Downtown Branch"
    Then the marketplace store details can be retrieved
    When the vendor owner updates that marketplace store name to "Downtown Branch Updated"
    Then the updated marketplace store has name "Downtown Branch Updated"

  Scenario: List stores for a vendor
    Given an admin user exists
    And a vendor exists with name "Multi Store Vendor" city "Alexandria" country "Egypt"
    And that vendor has a marketplace store named "Branch A"
    And that vendor has a marketplace store named "Branch B"
    When the client lists marketplace stores for that vendor
    Then the response includes marketplace store "Branch A"
    And the response includes marketplace store "Branch B"

