Feature: Authorization Security
  As a security requirement
  The system must prevent unauthorized access to resources
  And enforce proper role-based access control at both API and UI layers

  Background:
    Given the system is running
    And test users exist:
      | userId      | email              | role     |
      | admin-1     | admin@test.com     | admin    |
      | customer-1  | customer1@test.com | customer |
      | customer-2  | customer2@test.com | customer |
      | driver-1    | driver1@test.com   | driver   |
      | driver-2    | driver2@test.com   | driver   |

  # Horizontal Privilege Escalation Prevention
  @api @ui @security
  Scenario: User cannot access another user's order
    Given "customer-1" has an order "order-123"
    When "customer-2" tries to access order "order-123"
    Then access should be denied with status 403

  @api @ui @security
  Scenario: User cannot modify another user's profile
    When "customer-1" tries to update profile for "customer-2"
    Then access should be denied with status 403

  @api @security
  Scenario: User cannot view another user's balance
    When "customer-1" tries to view balance for "customer-2"
    Then access should be denied with status 403

  # Vertical Privilege Escalation Prevention
  @api @ui @security
  Scenario: Non-admin cannot access admin dashboard
    When "customer-1" tries to access "/api/admin/stats"
    Then access should be denied with status 403

  @api @security
  Scenario: Customer cannot manage users
    When "customer-1" tries to access "/api/admin/users"
    Then access should be denied with status 403

  @api @security
  Scenario: Driver cannot access vendor routes
    When "driver-1" tries to access "/api/vendors"
    Then access should be denied with status 403

  # Role-Based Access Control
  @api @ui @security
  Scenario: Only assigned driver can update order status
    Given "customer-1" has order "order-456" assigned to "driver-1"
    When "driver-2" tries to update status of order "order-456" to "picked_up"
    Then access should be denied with status 403

  @api @security
  Scenario: Admin can access all user resources
    Given "customer-1" has an order "order-789"
    When "admin-1" tries to access order "order-789"
    Then access should be granted with status 200

  # Ownership Verification
  @api @security
  Scenario: Users can only cancel their own orders
    Given "customer-1" has order "order-999" with status "pending"
    When "customer-2" tries to cancel order "order-999"
    Then access should be denied with status 403

  @api @ui @security
  Scenario: Users can only view their own transactions
    When "customer-1" tries to access "/api/balance/transactions" for "customer-2"
    Then access should be denied with status 403

  # Mixed Scenarios
  @api @security
  Scenario: Driver can only bid on unassigned orders
    Given "customer-1" has order "order-888" assigned to "driver-1"
    When "driver-2" tries to bid on order "order-888"
    Then access should be denied with status 403

  @ui @security
  Scenario: Unauthorized user sees proper error message
    When "customer-1" navigates to admin dashboard
    Then user should see "Access Denied" message
    And user should be redirected to home page
