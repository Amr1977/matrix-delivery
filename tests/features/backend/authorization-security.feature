Feature: Authorization Security
  As a security-conscious system
  I want to enforce proper authorization controls
  So that users can only access their own resources

  Background:
    Given the system is running
    And test users exist:
      | userId     | email              | role     |
      | admin-1    | admin@test.com     | admin    |
      | customer-1 | customer1@test.com | customer |
      | customer-2 | customer2@test.com | customer |
      | driver-1   | driver1@test.com   | driver   |
      | driver-2   | driver2@test.com   | driver   |

  # ============ HORIZONTAL PRIVILEGE ESCALATION ============

  @api @security
  Scenario: User cannot access another user's order details
    Given "customer-1" has an order "order-123"
    When "customer-2" tries to access order "order-123"
    Then access should be denied with status 403

  @api @security
  Scenario: User can only update own profile
    When "customer-1" tries to update their own profile
    Then access should be granted with status 200

  @api @security
  Scenario: Driver cannot bid on order assigned to another driver
    Given "customer-1" has order "order-888" assigned to "driver-1"
    When "driver-2" tries to bid on order "order-888"
    Then access should be denied with status 400

  # ============ VERTICAL PRIVILEGE ESCALATION ============

  @api @security
  Scenario: Non-admin cannot access admin user list
    When "customer-1" tries to access "/api/admin/users"
    Then access should be denied with status 403

  @api @security
  Scenario: Non-admin cannot access admin dashboard
    When "customer-1" tries to access "/api/admin/stats"
    Then access should be denied with status 403

  @api @security
  Scenario: Non-admin cannot view user details
    When "customer-1" tries to access "/api/admin/users/customer-2"
    Then access should be denied with status 403

  # ============ ROLE-BASED ACCESS CONTROL ============

  @api @security
  Scenario: Only assigned driver can update order status
    Given "customer-1" has order "order-456" assigned to "driver-1"
    When "driver-2" tries to update status of order "order-456" to "picked_up"
    Then access should be denied with status 403

  @api @security
  Scenario: Admin can access all user resources
    Given "customer-1" has an order "order-789"
    When "admin-1" tries to access "/api/admin/users"
    Then access should be granted with status 200

  # ============ OWNERSHIP VERIFICATION ============

  @api @security
  Scenario: Users can only cancel their own orders (via admin route)
    Given "customer-1" has order "order-999" with status "pending_bids"
    When "admin-1" tries to cancel order "order-999"
    Then access should be granted with status 200

  @api @security
  Scenario: Customer can accept bid on their own order
    Given "customer-1" has order "order-555" with status "pending_bids"
    And "driver-1" has placed bid on order "order-555"
    When "customer-1" tries to accept bid on order "order-555"
    Then access should be granted with status 200

  @ui @security
  Scenario: Unauthorized user sees proper error message
    When "customer-1" navigates to admin dashboard
    Then user should see "Access Denied" message
