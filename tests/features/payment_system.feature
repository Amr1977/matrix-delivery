@payment_system
Feature: Payment Processing

  Background:
    Given the P2P delivery platform is running
    And the database is clean

  @PP-001
  Scenario: Process payment for order
    Given I have order "ORD-001" with total cost $30
    When I proceed to payment
    And I select payment method "credit_card"
    And I enter payment details:
      | field | value |
      | card_number | 4111111111111111 |
      | expiry_date | 12/25 |
      | cvv | 123 |
      | name | John Doe |
    And I confirm payment
    Then payment should be processed successfully
    And I should receive payment confirmation
    And the order should be marked as "paid"

  @PP-002
  Scenario: Process refund for cancelled order
    Given I have a paid order "ORD-001" that was cancelled
    When I request a refund
    Then the refund should be processed within 3-5 business days
    And I should receive refund confirmation
    And the amount should be credited to my original payment method
