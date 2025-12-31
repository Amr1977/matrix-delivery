Feature: Basic Review Functionality
  As a user
  I want to leave reviews for completed orders
  So that I can provide feedback and maintain trust

  Background:
    Given the P2P delivery platform is running
    And the database is clean
    And there is a registered customer account
    And setup test driver
    And there is a completed order

  Scenario: Submit a basic review
    When I submit a review with rating "4" and comment "Good service"
    Then the review should be saved successfully
    And the driver's rating should be updated
