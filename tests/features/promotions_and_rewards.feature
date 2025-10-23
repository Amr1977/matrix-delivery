@promotions_rewards
Feature: Promotions and Rewards System

  Background:
    Given the P2P delivery platform is running
    And the database is clean

  @PR-001
  Scenario: Generate referral link
    Given I am on the "Refer a Friend" page
    When I click "Get My Referral Link"
    Then I should receive a unique referral link
    And the link should contain my user ID
    And I should be able to copy the link

  @PR-002
  Scenario: Friend registers using referral link
    Given I have shared my referral link with "Alice"
    When Alice clicks the referral link
    And Alice completes registration
    Then Alice should be marked as referred by me
    And I should receive notification "Alice joined using your referral"
    And Alice should see "You were referred by a friend"

  @PR-003
  Scenario: Referrer receives reward
    Given I referred user "Alice"
    And Alice just completed her first order
    When the order is delivered successfully
    Then $10 credit should be added to my account
    And I should receive notification "You earned $10 referral reward"
    And credit should be available immediately

  @PR-004
  Scenario: View referral statistics
    Given I am on "Refer a Friend" page
    When I view my referral stats
    Then I should see:
      | total_referrals | 8 friends |
      | pending_referrals | 2 signed up |
      | completed_referrals | 6 completed orders |
      | total_earned | $60 in credits |
    And I should see list of referred friends (names hidden)

  @PR-005
  Scenario: Loyalty points for completed orders
    Given I complete order "ORD-001" worth $25
    When order is marked as delivered
    Then I should earn 25 loyalty points (1 point per $1)
    And I should see "You earned 25 points!"
    And points should be added to my balance

  @PR-006
  Scenario: Redeem loyalty points
    Given I have 500 loyalty points
    And I am creating a new order worth $30
    When I click "Use Points"
    And I select "Redeem 250 points for $5 off"
    And I confirm redemption
    Then 250 points should be deducted
    And $5 discount should be applied
    And new order total should be $25

  @PR-007
  Scenario: View loyalty tier status
    Given I am a member of loyalty program
    When I navigate to "Loyalty Program"
    Then I should see my current tier:
      | current_tier | Silver |
      | points_balance | 850 points |
      | next_tier | Gold (at 1000 points) |
      | points_to_next | 150 points |
    And I should see tier benefits:
      | Silver benefits | |
      | - 5% bonus points on orders | |
      | - Priority customer support | |
      | - Exclusive promo codes | |

  @PR-008
  Scenario: Seasonal promotion campaign
    Given there is active promotion "Holiday Special"
    When I open the app
    Then I should see promotional banner
    And promotion details:
      | campaign | Holiday Special |
      | offer | 30% off all orders |
      | valid_dates | Dec 20-26, 2025 |
      | code | HOLIDAY30 |
      | terms | Min order $15 |
    When I create order and apply "HOLIDAY30"
    Then 30% discount should be applied

  @PR-009
  Scenario: First-time user promotion
    Given I just completed registration
    When I navigate to create first order
    Then I should see "First Order Special"
    And automatic 25% discount should be applied
    And I should see "Welcome bonus: -25%"
    And no promo code entry required

  @PR-010
  Scenario: Driver incentive bonus
    Given I am a driver
    And there is "Weekend Bonus" campaign
    When I complete 10 deliveries on weekend
    Then I should receive $50 bonus
    And I should see "Weekend goal completed! +$50"
    And bonus should be added to my earnings
