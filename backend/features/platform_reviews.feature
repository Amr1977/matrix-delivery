Feature: Platform Reviews
  As a registered user
  I want to submit reviews for the platform
  So that I can share my feedback with others

  Background:
    Given I am authenticated as a regular user

  Scenario: User submits a valid review
    Given I have not reviewed the platform today
    When I submit a review with:
      | rating | 5 |
      | content | Excellent service and fast delivery! |
      | professionalism_rating | 5 |
      | communication_rating | 5 |
      | timeliness_rating | 5 |
      | package_condition_rating | 5 |
    Then the response status should be 201
    And the response should contain:
      | rating | 5 |
      | content | Excellent service and fast delivery! |
      | upvotes | 0 |
      | is_approved | 1 |

  Scenario: User submits an invalid review
    When I submit a review with:
      | rating | 6 |
      | content | This rating is too high |
    Then the response status should be 400
    And the response should ensure validation errors exist

  Scenario: User views reviews
    Given there are 5 approved reviews in the system
    When I request the reviews list
    Then the response status should be 200
    And the response should include a list of reviews
    And the list should contain at least 5 reviews

  Scenario: User votes on a review
    Given there is an existing review
    And I have not voted on this review
    When I upvote the review
    Then the response status should be 200
    And the review upvote count should increase by 1

  Scenario: User flags a review
    Given there is an existing review
    And I have not flagged this review
    When I flag the review as "Inappropriate"
    Then the response status should be 200
    And the review flag count should increase by 1

