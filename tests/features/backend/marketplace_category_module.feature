@backend @marketplace_categories
Feature: Marketplace Category Module
  The marketplace category module allows admins to manage hierarchical categories
  using the /api/marketplace/categories endpoints.

  Scenario: Admin creates a root and child category
    Given an admin user exists
    When the admin creates a root marketplace category named "Groceries"
    And the admin creates a child marketplace category named "Fruits" under that root category
    Then the marketplace category list includes "Groceries"
    And the marketplace categories by parent for that root include "Fruits"

