# P2P Delivery Platform - BDD Feature Files (Accumulative)
# Each scenario has a unique ID for reference

## ============================================================================
## PHASE 1: USER MANAGEMENT
## ============================================================================

Feature: User Registration and Authentication
As a new user
I want to register and login to the platform
So that I can use delivery services

Background:
Given the P2P delivery platform is running
And the database is clean

@UR-001
Scenario: Successful customer registration
Given I am on the registration page
When I fill in the registration form with:
| field | value |
| name | John Doe |
| email | john@example.com |
| password | SecurePass123! |
| phone | +1234567890 |
| user_type | customer |
And I submit the registration form
Then I should see a success message "Registration successful"
And I should receive a verification email at "john@example.com"
And my account should be created with:
| field | value |
| status | pending_verification |
| completed_orders | 0 |
| average_rating | 0 |
| member_since | 2025-10-19 |

@UR-002
Scenario: Successful driver registration
Given I am on the registration page
When I fill in the registration form with:
| field | value |
| name | Jane Driver |
| email | jane@example.com |
| password | SecurePass123! |
| phone | +1234567891 |
| user_type | driver |
| vehicle_type | bike |
And I submit the registration form
Then I should see a success message "Registration successful"
And I should receive a verification email at "jane@example.com"
And my account should be created with:
| field | value |
| status | pending_verification |
| completed_orders | 0 |
| average_rating | 0 |
| member_since | 2025-10-19 |

@UR-003
Scenario: Registration with existing email
Given a user exists with email "existing@example.com"
When I attempt to register with email "existing@example.com"
Then I should see an error message "Email already registered"
And no new account should be created

@UR-004
Scenario: Successful login
Given I am a registered user with:
| email | john@example.com |
| password | SecurePass123! |
| status | verified |
When I login with email "john@example.com" and password "SecurePass123!"
Then I should be redirected to the dashboard
And I should see a welcome message "Welcome back, John"

@UR-005
Scenario: Login with incorrect password
Given I am a registered user with email "john@example.com"
When I login with email "john@example.com" and password "WrongPassword"
Then I should see an error message "Invalid credentials"
And I should remain on the login page

## ============================================================================
## PHASE 2: ORDER MANAGEMENT
## ============================================================================

Feature: Order Creation and Management
As a customer
I want to create and manage delivery orders
So that I can send packages through the platform

Background:
Given I am logged in as a customer
And I am on the dashboard

@OM-001
Scenario: Create a new delivery order
Given I am on the "Create Order" page
When I fill in the order details:
| field | value |
| pickup_address | 123 Main St, City A |
| delivery_address | 456 Oak Ave, City B |
| package_description | Electronics |
| package_weight | 2.5 kg |
| estimated_value | $150 |
| delivery_date | 2025-10-20 |
| special_instructions | Handle with care |
And I submit the order
Then I should see a success message "Order created successfully"
And I should see order ID "ORD-001"
And the order status should be "pending_bids"

@OM-002
Scenario: View order details
Given I have created order "ORD-001"
When I navigate to order details
Then I should see:
| field | value |
| order_id | ORD-001 |
| status | pending_bids |
| pickup_address | 123 Main St, City A |
| delivery_address | 456 Oak Ave, City B |
| created_date | 2025-10-19 |
| estimated_delivery | 2025-10-20 |

@OM-003
Scenario: Track order status
Given I have order "ORD-001" with status "in_transit"
When I check order tracking
Then I should see current status "in_transit"
And I should see location updates
And I should see estimated delivery time

## ============================================================================
## PHASE 3: DRIVER OPERATIONS
## ============================================================================

Feature: Driver Bidding System
As a driver
I want to bid on delivery orders
So that I can earn money by delivering packages

Background:
Given I am logged in as a driver
And I am available for deliveries

@DB-001
Scenario: Driver places bid on order
Given there is an available order "ORD-001"
When I view the order details
And I place a bid with:
| field | value |
| bid_amount | $25 |
| estimated_pickup_time | 2025-10-19 14:00 |
| estimated_delivery_time | 2025-10-19 16:00 |
| message | I can pick up immediately |
Then my bid should be submitted successfully
And the customer should be notified of the new bid

@DB-002
Scenario: Customer accepts driver bid
Given driver "Jane Driver" has placed a bid on order "ORD-001"
When I view the bid details
And I accept the bid
Then the order status should change to "accepted"
And Jane Driver should be assigned to the order
And Jane Driver should be notified of acceptance

@DB-003
Scenario: Driver completes delivery
Given I am assigned to order "ORD-001"
And I have picked up the package
When I mark the delivery as completed
Then the order status should change to "delivered"
And the customer should be notified
And payment should be processed

## ============================================================================
## PHASE 4: PAYMENT SYSTEM
## ============================================================================

Feature: Payment Processing
As a user
I want to make secure payments
So that I can complete transactions on the platform

Background:
Given I am logged in as a customer
And I have a valid payment method

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

## ============================================================================
## PHASE 5: PROMOTIONS AND REWARDS
## ============================================================================

Feature: Referral Program
As a user
I want to refer friends and earn rewards
So that I can get benefits for bringing new users to the platform

Background:
Given I am logged in as a verified user

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

Feature: Loyalty Program
As a customer
I want to earn and redeem loyalty points
So that I can get discounts and benefits

Background:
Given I am a member of the loyalty program

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

Feature: Promotional Campaigns
As a user
I want to participate in promotional campaigns
So that I can get discounts and special offers

Background:
Given the platform has active promotions

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
