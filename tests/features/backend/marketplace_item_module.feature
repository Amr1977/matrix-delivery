@backend @marketplace_items
Feature: Marketplace Item Catalog Module
  The item catalog module allows vendors and admins to manage items with inventory and images
  using the /api/marketplace/items endpoints.

  Scenario: Vendor owner creates an item and updates inventory
    Given an admin user exists
    And a vendor exists with name "Item Vendor" city "Cairo" country "Egypt"
    And a vendor owner user exists for that vendor
    And that vendor has a marketplace store named "Items Branch"
    When the vendor owner creates a marketplace item named "Organic Apples" with price "25.50" and inventory "10"
    Then the marketplace item details can be retrieved
    When the vendor owner updates that marketplace item inventory to "15"
    Then the marketplace item inventory is "15"

  Scenario: List items for a store
    Given an admin user exists
    And a vendor exists with name "Item Vendor 2" city "Alexandria" country "Egypt"
    And a vendor owner user exists for that vendor
    And that vendor has a marketplace store named "Second Branch"
    And that store has a marketplace item named "Oranges"
    When the client lists marketplace items for that store
    Then the response includes marketplace item "Oranges"

