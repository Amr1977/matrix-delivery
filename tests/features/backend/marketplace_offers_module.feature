@backend @marketplace_offers
Feature: Marketplace Offers Module
  The offers module allows vendors to create promotional offers on their items
  using percentage or fixed discounts with scheduling and automatic expiration
  using the /api/offers endpoints.

  Background:
    Given an admin user exists
    And a vendor exists with name "Offers Vendor" city "Cairo" country "Egypt"
    And a vendor owner user exists for that vendor
    And that vendor has a marketplace store named "Offers Store"
    And that store has a marketplace item named "Premium Coffee" with price "50.00" and inventory "20"

  Scenario: Vendor creates a percentage discount offer
    When the vendor owner creates a percentage discount offer on "Premium Coffee" with discount "20" and dates from "tomorrow" to "next_week"
    Then the offer is created successfully
    And the offer has discount type "percentage" and value "20"
    And the offer is active

  Scenario: Vendor creates a fixed discount offer
    When the vendor owner creates a fixed discount offer on "Premium Coffee" with discount "10.00" and dates from "tomorrow" to "next_week"
    Then the offer is created successfully
    And the offer has discount type "fixed" and value "10.00"
    And the discounted price should be "40.00"

  Scenario: Prevent creating offer with invalid dates
    When the vendor owner attempts to create an offer with end date before start date
    Then the offer creation fails with error "Start date must be before end date"

  Scenario: Prevent creating offer with past end date
    When the vendor owner attempts to create an offer with past end date
    Then the offer creation fails with error "End date must be in the future"

  Scenario: Prevent creating offer on item not owned by vendor
    Given another vendor exists with name "Other Vendor" city "Alexandria" country "Egypt"
    And that vendor has a marketplace store named "Other Store"
    And that store has a marketplace item named "Other Item" with price "30.00" and inventory "10"
    When the vendor owner attempts to create an offer on "Other Item"
    Then the offer creation fails with error "Item does not belong to your store"

  Scenario: Prevent percentage discount over 100%
    When the vendor owner attempts to create a percentage discount offer with discount "150"
    Then the offer creation fails with error "Percentage discount cannot exceed 100%"

  Scenario: Prevent fixed discount exceeding item price
    When the vendor owner attempts to create a fixed discount offer with discount "60.00"
    Then the offer creation fails with error "Fixed discount cannot be greater than or equal to item price"

  Scenario: Prevent conflicting offers on same item
    Given an active offer exists on "Premium Coffee" from "tomorrow" to "next_week"
    When the vendor owner attempts to create another offer on "Premium Coffee" during the same period
    Then the offer creation fails with error "Item already has an active offer during the specified date range"

  Scenario: Vendor updates their offer
    Given an active offer exists on "Premium Coffee" with discount "15"
    When the vendor owner updates that offer discount to "25"
    Then the offer discount is updated to "25"

  Scenario: Vendor deactivates their offer
    Given an active offer exists on "Premium Coffee"
    When the vendor owner deactivates that offer
    Then the offer becomes inactive

  Scenario: Vendor deletes their offer
    Given an active offer exists on "Premium Coffee"
    When the vendor owner deletes that offer
    Then the offer is deleted successfully

  Scenario: Get active offers for an item
    Given multiple active offers exist on "Premium Coffee"
    When the client retrieves offers for "Premium Coffee"
    Then all active offers are returned
    And inactive offers are not included

  Scenario: Calculate discounted price for item with offer
    Given an active percentage offer exists on "Premium Coffee" with discount "20"
    When the client calculates discounted price for "Premium Coffee"
    Then the discounted price should be "40.00"

  Scenario: Calculate discounted price for item with multiple offers (best discount)
    Given an active percentage offer exists on "Premium Coffee" with discount "10"
    And another active fixed offer exists on "Premium Coffee" with discount "12.00"
    When the client calculates discounted price for "Premium Coffee"
    Then the discounted price should be "38.00" (best offer)

  Scenario: Calculate price for item without active offers
    When the client calculates discounted price for "Premium Coffee" without offers
    Then the discounted price should be "50.00" (original price)

  Scenario: Vendor can only manage their own offers
    Given another vendor exists with name "Rival Vendor" city "Giza" country "Egypt"
    And that vendor has a marketplace store named "Rival Store"
    And that store has a marketplace item named "Rival Product" with price "40.00" and inventory "15"
    And an active offer exists on "Rival Product"
    When the vendor owner attempts to update the rival offer
    Then the update fails with error "Offer does not belong to your store"

  Scenario: Admin can view all offers
    Given multiple vendors exist with offers
    When the admin retrieves all offers
    Then all offers from all vendors are returned

  Scenario: Vendor can view only their offers
    Given another vendor exists with offers
    When the vendor owner retrieves their offers
    Then only offers from their stores are returned

  Scenario: Filter offers by status
    Given active and inactive offers exist
    When the vendor owner retrieves offers with status filter "active"
    Then only active offers are returned

  Scenario: Filter offers by discount type
    Given percentage and fixed offers exist
    When the vendor owner retrieves offers with discount type filter "percentage"
    Then only percentage offers are returned

  Scenario: Offer expires automatically
    Given an offer exists that expires today
    When the offer expiration job runs
    Then the expired offer becomes inactive

  Scenario: Offer remains active during valid period
    Given an offer exists that is currently active
    When the offer expiration job runs
    Then the active offer remains active
