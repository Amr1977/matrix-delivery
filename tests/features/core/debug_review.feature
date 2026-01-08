Feature: Debug Review Submission

  Scenario: Bob reviews Alice after delivery (Debug)
    Given the order "Urgent Documents" is delivered
    When "Bob" reviews "Alice" with "5" stars and comment "Great customer, easy pickup."
    Then the review should be submitted successfully
