@backend @marketplace_vendors
Feature: Marketplace Vendor Module
  The marketplace vendor module allows vendors and admins to manage vendor accounts
  using the new /api/marketplace/vendors endpoints while preserving existing APIs.

  Scenario: Admin registers and approves a marketplace vendor
    Given an admin user exists
    When the admin registers a marketplace vendor with business name "Marketplace Cafe" city "Alexandria" country "Egypt"
    Then the marketplace vendor details can be retrieved
    And the marketplace vendor is initially inactive
    When the admin approves that marketplace vendor
    Then the marketplace vendor appears in the admin vendor list

  Scenario: Non-admin listing cannot include inactive vendors
    Given an admin user exists
    And an approved marketplace vendor exists with business name "Active Market" city "Cairo" country "Egypt"
    When a customer lists marketplace vendors including inactive
    Then the response includes that marketplace vendor
