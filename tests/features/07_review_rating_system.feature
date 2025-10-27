@review_system @implemented
Feature: Mutual Review and Rating System
  As a user of the platform
  I want to rate and review other parties after order completion
  So that trust and accountability are maintained

  Background:
    Given the P2P delivery platform is running
    And the database is clean and initialized
    And order "ORD-001" has been delivered
    And the order was between customer "John Customer" and driver "Jane Driver"
    And payment has been confirmed
    And the system time is "2025-10-19T15:00:00Z"

  @REV-001 @smoke @critical_path
  Scenario: Customer submits comprehensive review for driver
    Given I am logged in as customer "John Customer"
    And I am viewing completed order "ORD-001"
    When I click "Review Driver" button
    Then I should see review modal with title "Submit Review"
    
    When I provide ratings:
      | criteria          | rating |
      | Overall           | 5      |
      | Professionalism   | 5      |
      | Communication     | 4      |
      | Timeliness        | 5      |
      | Package Condition | 5      |
    And I write comment "Excellent service! Very professional and on time."
    And I click "Submit Review"
    Then I should see "Review submitted successfully"
    And the review should be saved with type "customer_to_driver"
    And driver's average rating should be updated
    And driver should receive notification "You received a 5-star review for order ORD-001"
    And I should not be able to review this driver again for this order

  @REV-002 @validation
  Scenario: Review requires overall rating
    Given I am on review modal for driver
    When I try to submit without selecting overall rating
    Then I should see error "Please provide an overall rating"
    And review should not be submitted

  @REV-003 @validation
  Scenario: Cannot review before delivery completion
    Given order "ORD-001" status is "in_transit"
    When I attempt to access review form
    Then I should see error "Can only review completed orders"
    And review form should not be accessible

  @REV-004 @validation
  Scenario: Cannot submit duplicate review
    Given I have already reviewed driver for order "ORD-001"
    When I attempt to submit another review for same order
    Then I should see error "Review already submitted"
    And no duplicate review should be created

  @REV-005 @critical_path
  Scenario: Driver submits review for customer
    Given I am logged in as driver "Jane Driver"
    And I am viewing completed order "ORD-001"
    When I click "Review Customer" button
    Then I should see review modal
    
    When I provide overall rating "5"
    And I write comment "Great customer, clear instructions and friendly."
    And I submit the review
    Then I should see "Review submitted successfully"
    And the review should be saved with type "driver_to_customer"
    And customer's average rating should be updated
    And customer should receive notification "You received a 5-star review for order ORD-001"

  @REV-006 @ui
  Scenario: Star rating is interactive
    Given I am on review modal
    When I hover over star 4
    Then stars 1-4 should highlight in yellow
    When I click star 4
    Then stars 1-4 should be filled yellow
    And stars 5 should be gray
    When I click star 5
    Then all 5 stars should be filled yellow

  @REV-007 @ui
  Scenario: Detailed ratings are optional
    Given I am reviewing driver
    When I provide only overall rating "5"
    And I submit without detailed ratings
    Then review should be accepted
    And detailed ratings should be null in database

  @REV-008 @ui
  Scenario: Review comment is optional
    Given I am on review modal
    When I select overall rating "5"
    And I leave comment empty
    And I submit review
    Then review should be accepted
    And comment should be null in database

  @REV-009 @business_logic
  Scenario: Driver rating is recalculated after review
    Given driver "Jane Driver" has:
      | current_rating    | 4.5  |
      | total_reviews     | 10   |
    When customer submits 5-star review
    Then driver's new rating should be calculated as:
      """
      (4.5 * 10 + 5) / 11 = 4.55
      """
    And driver profile should show updated rating

  @REV-010 @ui
  Scenario: View all reviews for an order
    Given both parties have reviewed each other for order "ORD-001"
    When I click "View Reviews" button
    Then I should see reviews modal
    And I should see:
      - Customer's review of driver
      - Driver's review of customer
    And each review should show:
      | reviewer_name  |
      | reviewer_role  |
      | overall_rating |
      | comment        |
      | created_date   |

  @REV-011 @ui
  Scenario: Empty state when no reviews exist
    Given no reviews have been submitted for order "ORD-001"
    When customer clicks "View Reviews"
    Then I should see:
      """
      📋
      No reviews yet for this order
      """

  @REV-012 @ui
  Scenario: Review buttons appear only for delivered orders
    When order status is "accepted"
    Then I should not see "Review Driver" button
    
    When order status is "delivered"
    Then I should see "Review Driver" button
    And button should be green with star icon

  @REV-013 @api
  Scenario: Submit review via API
    Given I am authenticated as customer
    When I POST to "/api/orders/ORD-001/review" with:
      | reviewType              | customer_to_driver         |
      | rating                  | 5                          |
      | comment                 | Excellent service          |
      | professionalismRating   | 5                          |
      | communicationRating     | 4                          |
      | timelinessRating        | 5                          |
      | conditionRating         | 5                          |
    Then I should receive success response
    And response should include:
      | message | Review submitted successfully |
      | review.id | generated_id                |
      | review.reviewType | customer_to_driver   |
      | review.rating | 5                        |

  @REV-014 @api
  Scenario: Get reviews for order via API
    Given both parties have submitted reviews
    When I GET "/api/orders/ORD-001/reviews"
    Then I should receive array of reviews with:
      | id                      |
      | reviewType              |
      | reviewerName            |
      | revieweeName            |
      | reviewerRole            |
      | rating                  |
      | comment                 |
      | professionalismRating   |
      | communicationRating     |
      | timelinessRating        |
      | conditionRating         |
      | createdAt               |

  @REV-015 @api
  Scenario: Check review status for order
    Given I am customer who completed order
    When I GET "/api/orders/ORD-001/review-status"
    Then I should receive:
      | canReview | true/false |
      | userRole  | customer   |
      | reviews.toDriver | submitted/not_submitted |
      | reviews.toPlatform | submitted/not_submitted |

  @REV-016 @ui
  Scenario: Review modal shows order context
    Given I am reviewing order "ORD-001"
    When review modal opens
    Then I should see order details:
      | Order Number | ORD-001           |
      | Order Title  | Laptop Delivery   |
      | Driver Name  | Jane Driver       |
    And context helps me remember the delivery

  @REV-017 @ui
  Scenario: Detailed ratings for driver reviews
    Given I am reviewing driver
    Then I should see these rating categories:
      | Professionalism   |
      | Communication     |
      | Timeliness        |
      | Package Condition |
    And each category should have 5-star selector
    And overall rating should be separate

  @REV-018 @validation
  Scenario: Rating must be between 1 and 5
    Given I am on review modal
    When I attempt to submit rating "0"
    Then I should see error "Rating must be between 1 and 5"
    
    When I attempt to submit rating "6"
    Then I should see error "Rating must be between 1 and 5"

  @REV-019 @data_persistence
  Scenario: Review is correctly stored in database
    When customer submits review
    Then review record should contain:
      | order_id                | ORD-001              |
      | reviewer_id             | john_customer_id     |
      | reviewee_id             | jane_driver_id       |
      | reviewer_role           | customer             |
      | review_type             | customer_to_driver   |
      | rating                  | 5                    |
      | comment                 | text                 |
      | professionalism_rating  | 5                    |
      | communication_rating    | 4                    |
      | timeliness_rating       | 5                    |
      | condition_rating        | 5                    |
      | created_at              | timestamp            |
    And UNIQUE constraint should prevent duplicates

  @REV-020 @ui
  Scenario: Loading state during review submission
    When I submit review
    Then submit button should show "Submitting..." with spinner
    And button should be disabled
    And I should not be able to close modal
    When submission completes
    Then success message should appear
    And modal should close automatically after 2 seconds

  @REV-021 @integration
  Scenario: Review notification is delivered
    When driver receives review
    Then notification should be created with:
      | user_id  | jane_driver_id                           |
      | order_id | ORD-001                                  |
      | type     | new_review                               |
      | title    | New Review Received                      |
      | message  | You received a 5-star review for order ORD-001 |
      | is_read  | false                                    |
    And notification sound should play
    And text-to-speech should announce it

  @REV-022 @ui
  Scenario: View reviews modal displays detailed breakdowns
    Given customer submitted detailed review
    When I view reviews for order
    Then I should see overall rating prominently
    And I should see breakdown:
      | Professionalism   | ★★★★★ |
      | Communication     | ★★★★☆ |
      | Timeliness        | ★★★★★ |
      | Package Condition | ★★★★★ |
    And comment should be displayed in quote style

  @REV-023 @security
  Scenario: Only order participants can review
    Given order "ORD-001" is between John and Jane
    And another user "Bob" is logged in
    When Bob attempts to review order "ORD-001"
    Then Bob should receive error "Unauthorized to view this order"
    And review should not be created

  @REV-024 @business_logic
  Scenario: Customer with no reviews has default rating
    Given customer "New Customer" just registered
    And has never received a review
    Then customer's rating should be 5.00
    And rating should be marked as "No reviews yet"

  @REV-025 @ui
  Scenario: Cancel review submission
    Given I am filling review form
    When I click "Cancel" button
    Then review modal should close
    And no review should be submitted
    And I should return to order details

  @REV-026 @ui
  Scenario: Review form has clear validation
    Given I am on review modal
    When I try to submit without overall rating
    Then overall rating section should highlight in red
    And error message should appear below stars
    When I select a rating
    Then validation error should clear
    And submit button should become enabled

  @REV-027 @data_validation
  Scenario: Comment has reasonable length limit
    Given I am writing review comment
    When I enter comment longer than 5000 characters
    Then form should prevent further input
    Or system should trim to 5000 characters
    And I should see character counter

  @REV-028 @integration
  Scenario: Multiple reviews affect rating correctly
    Given driver has these reviews:
      | order    | rating |
      | ORD-001  | 5      |
      | ORD-002  | 4      |
      | ORD-003  | 5      |
      | ORD-004  | 3      |
    Then driver's average rating should be 4.25
    And rating should be displayed as "4.3" (rounded)

  @REV-029 @ui
  Scenario: Review button shows submission status
    Given order is delivered
    And I have not reviewed driver
    Then button should say "⭐ Review Driver"
    
    When I submit review
    Then button should change to "✅ Review Submitted"
    And button should be disabled
    And button should have different color (gray)

  @REV-030 @business_logic
  Scenario: Platform review types are supported (future)
    # These review types are defined but not fully implemented in UI
    Given review types include:
      | customer_to_driver   |
      | driver_to_customer   |
      | customer_to_platform |
      | driver_to_platform   |
    Then system should accept all types
    And each type should update appropriate ratings
    # NOTE: Platform reviews not yet in UI but API supports them