Feature: Matrix Landing Page and Reviews System
  As a user (Guest or Authenticated)
  I want to visit the landing page to see the vision of Freedom, Justice, Efficiency, and Transparency
  And see user reviews to trust the platform
  And submit my own review to share my experience
  And report inappropriate content to keep the community safe

  Background:
    Given the Matrix Delivery system is running

  Scenario: Visitor views the Matrix Landing Page content
    When I visit the Matrix Landing Page
    Then I should see the Hero section with slogan "Efficiency Unlocked. Justice Delivered. Transparency Guaranteed"
    And I should see the "Live Matrix" real-time statistics
    And I should see the "Vision" section with "Freedom", "Justice", "Efficiency", "Transparency"
    And I should see the "Evolution Badge" indicating "Beta Phase"
    And I should see the "Global Roadmap" section

  Scenario: Visitor navigates to Login page
    When I visit the Matrix Landing Page
    And I click the "Login" button
    Then I should be navigated to the Login page

  Scenario: Reviews are sorted by Upvotes and Time
    Given there are existing reviews with different upvotes
    When I visit the Matrix Landing Page
    Then I should see the reviews sorted by highest upvotes first
    And for reviews with same upvotes, older ones should appear first
    And I should see the number of upvotes and flags for each review

  Scenario: Authenticated User submits a valid review
    Given I am a registered user named "Neo"
    And I have logged in
    When I submit a review with rating 5 and comment "The system delivers freedom!"
    Then the review should be saved successfully
    And I should see "Review submitted successfully" message
    And the review should be visible in the "Voice of the People" section

  Scenario: Authenticated User flags a review
    Given I am a registered user named "Morpheus"
    And I have logged in
    And there is a review by "Smith" with comment "Content to be flagged"
    When I report the review by "Smith"
    Then the report count for that review should increase by 1
    And I should see "Review reported" message

  Scenario: Review is hidden after excessive flags
    Given there is a review by "Smith" with 2 existing flags
    And I am a registered user named "Trinity"
    And I have logged in
    When I report the review by "Smith"
    Then the review should be hidden from the public list
