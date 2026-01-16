Feature: Admin Withdrawal Processing

  Background:
    Given the database is initialized
    And an admin user exists for withdrawals
    And a driver user exists with balance 5000.00
    And the driver has a pending withdrawal request for 1000.00 EGP

  Scenario: Admin views pending withdrawal requests
    When the admin requests the list of pending withdrawals
    Then the response should contain the pending withdrawal request
    And the total count should be 1

  Scenario: Admin approves a withdrawal request
    When the admin approves the withdrawal request with reference "REF123456"
    Then the withdrawal request status should be "completed"
    And the driver's held balance should decrease by 1000.00
    And the driver's available balance should remain unchanged
    And the transaction status should be "completed"

  Scenario: Admin rejects a withdrawal request
    When the admin rejects the withdrawal request with reason "Invalid wallet number"
    Then the withdrawal request status should be "rejected"
    And the driver's held balance should decrease by 1000.00
    And the driver's available balance should increase by 1000.00
    And the transaction status should be "failed"
