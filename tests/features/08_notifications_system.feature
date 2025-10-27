@notifications @implemented
Feature: Real-time Notification System
  As a user
  I want to receive notifications about important events
  So that I stay informed about my orders

  Background:
    Given the P2P delivery platform is running
    And the database is clean and initialized
    And test customer "John Customer" is logged in with email "john@example.com"
    And test driver "Jane Driver" with email "jane@example.com" exists
    And the system time is "2025-10-19T12:00:00Z"

  @NOT-001 @smoke @critical_path
  Scenario: Customer receives notification when bid is placed
    Given customer has order "ORD-001" with status "pending_bids"
    When driver "Jane Driver" places bid of "$20.00"
    Then customer should receive notification:
      | type    | new_bid                                            |
      | title   | New Bid Received                                   |
      | message | Jane Driver placed a bid of $20.00 on your order ORD-001 |
      | order_id| ORD-001                                            |
      | is_read | false                                              |
    And notification should be stored in notifications table
    And notification should appear in notification dropdown
    And unread count should increase by 1

  @NOT-002 @audio
  Scenario: Notification plays sound
    When user receives a new notification
    Then notification sound should play
    And sound should be audible beep tone
    And sound volume should be 0.3 (30%)
    And sound duration should be approximately 0.3 seconds

  @NOT-003 @audio @accessibility
  Scenario: Notification uses text-to-speech
    When user receives notification with title "New Bid Received"
    And message "Jane Driver placed a bid of $20.00"
    Then text-to-speech should announce:
      """
      New notification: New Bid Received. Jane Driver placed a bid of $20.00
      """
    And voice should be male with pitch 0.7
    And speech rate should be normal (1.0)
    And volume should be 0.8 (80%)

  @NOT-004 @ui
  Scenario: Notification bell shows unread count
    Given customer has 3 unread notifications
    When customer views the header
    Then notification bell icon should display "🔔"
    And bell should have red badge showing "3"
    And badge should be positioned at top-right of bell
    And bell should have pulsing animation

  @NOT-005 @ui
  Scenario: View notifications dropdown
    Given customer has notifications
    When customer clicks notification bell
    Then dropdown should appear below bell
    And dropdown should show maximum height 24rem
    And dropdown should be scrollable
    And dropdown should display:
      | Notifications header |
      | List of notifications |
    And dropdown should have white background
    And dropdown should have shadow

  @NOT-006 @ui
  Scenario: Notification list displays correctly
    Given customer has these notifications:
      | title                 | message                          | created_at          | is_read |
      | New Bid Received      | Jane placed bid $20              | 2025-10-19 12:00    | false   |
      | Bid Accepted          | Your bid was accepted            | 2025-10-19 11:00    | true    |
      | Package Picked Up     | Driver picked up package         | 2025-10-19 10:00    | false   |
    When customer opens notification dropdown
    Then notifications should be sorted by date (newest first)
    And unread notifications should have blue background
    And read notifications should have white background
    And each notification should show:
      | title (bold)      |
      | message (normal)  |
      | timestamp         |

  @NOT-007 @interaction
  Scenario: Mark notification as read
    Given customer has unread notification with id "123"
    When customer clicks on the notification
    Then notification should be marked as read
    And API should be called: PUT /api/notifications/123/read
    And notification background should change to white
    And unread count should decrease by 1

  @NOT-008 @ui
  Scenario: Empty state in notifications
    Given customer has no notifications
    When customer opens notification dropdown
    Then dropdown should display:
      """
      No notifications
      """
    And message should be centered
    And message should be gray color

  @NOT-009 @api
  Scenario: Get notifications via API
    Given I am authenticated as customer
    When I GET "/api/notifications"
    Then I should receive array of notifications:
      | id        |
      | orderId   |
      | type      |
      | title     |
      | message   |
      | isRead    |
      | createdAt |
    And notifications should be limited to 50 most recent
    And notifications should be sorted by created_at DESC

  @NOT-010 @api
  Scenario: Mark notification as read via API
    Given I have notification with id "123"
    When I PUT to "/api/notifications/123/read"
    Then I should receive success response
    And notification is_read should be set to true
    And response should include message "Notification marked as read"

  @NOT-011 @security
  Scenario: User can only access their own notifications
    Given notification "123" belongs to customer "John"
    And another customer "Alice" is logged in
    When Alice attempts to access notification "123"
    Then Alice should receive error "Notification not found"
    And Alice should get HTTP status 404

  @NOT-012 @integration
  Scenario: Notification created when bid is accepted
    Given driver "Jane" has bid on order "ORD-001"
    When customer accepts Jane's bid
    Then Jane should receive notification:
      | type    | bid_accepted                                         |
      | title   | Bid Accepted!                                        |
      | message | Your bid of $20.00 has been accepted for order ORD-001 |

  @NOT-013 @integration
  Scenario: Notification created when order is picked up
    Given order "ORD-001" is assigned to driver "Jane"
    When driver marks order as "picked_up"
    Then customer should receive notification:
      | type    | order_picked_up                                  |
      | title   | Package Picked Up                                |
      | message | Jane Driver has picked up your package for order ORD-001 |

  @NOT-014 @integration
  Scenario: Notification created when order is in transit
    When driver marks order as "in_transit"
    Then customer should receive notification:
      | type    | order_in_transit                                 |
      | title   | Package In Transit                               |
      | message | Your package for order ORD-001 is now in transit |

  @NOT-015 @integration
  Scenario: Notification created when order is delivered
    When driver marks order as "delivered"
    Then customer should receive notification:
      | type    | order_delivered                                  |
      | title   | Order Delivered                                  |
      | message | Your order ORD-001 has been delivered successfully! |

  @NOT-016 @integration
  Scenario: Notification created when payment is confirmed
    When driver confirms payment
    Then customer should receive notification:
      | type    | payment_completed                                |
      | title   | Payment Confirmed                                |
      | message | Payment of $20.00 has been confirmed for order ORD-001 |

  @NOT-017 @integration
  Scenario: Notification created when review is received
    When customer submits review for driver
    Then driver should receive notification:
      | type    | new_review                                       |
      | title   | New Review Received                              |
      | message | You received a 5-star review for order ORD-001   |

  @NOT-018 @audio
  Scenario: Avoid notification sound spam
    Given customer has just received notification with sound
    When another notification arrives within 1 second
    Then sound should not play again
    But text-to-speech should still work

  @NOT-019 @audio
  Scenario: Track which notifications have been spoken
    Given notification "123" has been spoken via TTS
    When notification list is refreshed
    Then notification "123" should not be spoken again
    And system should maintain set of spoken notification IDs

  @NOT-020 @ui
  Scenario: Notification dropdown closes when clicking outside
    Given notification dropdown is open
    When customer clicks anywhere outside dropdown
    Then dropdown should close
    And notification bell should return to normal state

  @NOT-021 @ui
  Scenario: Notification dropdown scrolls smoothly
    Given customer has 20 notifications
    When customer opens dropdown
    Then only visible notifications should render initially
    And customer should be able to scroll smoothly
    And scroll should be smooth on mobile devices

  @NOT-022 @polling
  Scenario: Notifications are polled periodically
    Given customer is logged in and viewing dashboard
    Then notifications should be fetched every 30 seconds
    And orders should be fetched every 30 seconds
    And polling should happen in background
    And polling should not disrupt user interaction

  @NOT-023 @polling
  Scenario: Polling stops when user is inactive
    Given customer has been idle for 5 minutes
    Then notification polling should pause
    When customer becomes active again
    Then polling should resume

  @NOT-024 @data_persistence
  Scenario: Notification is stored correctly in database
    When notification is created
    Then notification record should contain:
      | id        | auto_increment |
      | user_id   | recipient_id   |
      | order_id  | ORD-001        |
      | type      | new_bid        |
      | title     | text           |
      | message   | text           |
      | is_read   | false          |
      | created_at| timestamp      |
    And foreign key constraints should be enforced

  @NOT-025 @ui
  Scenario: Notification timestamp is human-readable
    Given notification was created at "2025-10-19T12:00:00Z"
    And current time is "2025-10-19T12:05:00Z"
    When customer views notification
    Then timestamp should display "5 minutes ago"
    
    Given notification was created "2 hours ago"
    Then timestamp should display "2 hours ago"
    
    Given notification was created "yesterday"
    Then timestamp should display full date "Oct 18, 2025"

  @NOT-026 @ui
  Scenario: Unread count is prominently displayed
    Given customer has 5 unread notifications
    Then bell badge should show "5"
    And badge should be red background
    And badge should be white text
    And badge should be circular
    And badge size should be 1.25rem

  @NOT-027 @ui
  Scenario: Notification icon types
    Given different notification types
    Then each type should have appropriate icon:
      | new_bid           | 💰 |
      | bid_accepted      | ✅ |
      | order_picked_up   | 📦 |
      | order_in_transit  | 🚚 |
      | order_delivered   | ✅ |
      | payment_completed | 💳 |
      | new_review        | ⭐ |

  @NOT-028 @interaction
  Scenario: Click notification navigates to related order
    Given notification is related to order "ORD-001"
    When customer clicks the notification
    Then notification should be marked as read
    And dropdown should close
    And customer should be navigated to order "ORD-001" details
    Or order should be highlighted in orders list

  @NOT-029 @performance
  Scenario: Notification system is performant
    Given customer has 50 notifications
    When customer opens dropdown
    Then dropdown should render within 200ms
    And scrolling should be smooth at 60fps
    And no janky animations should occur

  @NOT-030 @accessibility
  Scenario: Notification system is accessible
    Given customer is using screen reader
    Then notification bell should have aria-label "Notifications"
    And unread count should be announced
    And dropdown should have proper ARIA roles
    And keyboard navigation should work:
      | Tab       | Focus bell icon      |
      | Enter     | Open dropdown        |
      | Arrow Down| Navigate notifications |
      | Enter     | Mark as read         |
      | Escape    | Close dropdown       |

  @NOT-031 @audio
  Scenario: TTS voice preference for male voice
    When text-to-speech is triggered
    Then system should prefer male voices in this order:
      | David (Microsoft)    |
      | Alex (Apple)         |
      | James                |
      | Daniel               |
      | Paul                 |
      | Mark                 |
      | George               |
    And if no male voice available, use default voice
    And pitch should be set to 0.7 for deeper voice

  @NOT-032 @error_handling
  Scenario: Handle TTS failure gracefully
    Given text-to-speech is not supported in browser
    When notification is received
    Then sound should still play
    And notification should still appear
    And no error should be shown to user
    And error should be logged to console

  @NOT-033 @error_handling
  Scenario: Handle notification sound failure gracefully
    Given audio context is not available
    When notification is received
    Then notification should still appear visually
    And text-to-speech should still work
    And no error should be shown to user

  @NOT-034 @business_logic
  Scenario: Notification types are comprehensive
    Given system supports these notification types:
      | new_bid           |
      | bid_accepted      |
      | order_picked_up   |
      | order_in_transit  |
      | order_delivered   |
      | payment_completed |
      | new_review        |
    Then each type should trigger appropriate notification
    And each should have unique title and message template
    And all should be tested

  @NOT-035 @integration
  Scenario: Notifications work across multiple tabs
    Given customer has application open in 2 tabs
    When notification is received in tab 1
    Then both tabs should show updated notification count
    And both tabs should play sound (if focused)
    And notification should sync across tabs

  @NOT-036 @ui
  Scenario: Notification dropdown has maximum width
    Given notification dropdown is open
    Then dropdown should have width 24rem (384px)
    And dropdown should be responsive on mobile
    And dropdown should adjust to screen size

  @NOT-037 @validation
  Scenario: Notification creation validates required fields
    When creating notification without user_id
    Then creation should fail
    And error should be logged
    
    When creating notification without title
    Then creation should fail
    
    When creating notification without message
    Then creation should fail

  @NOT-038 @cleanup
  Scenario: Old notifications are retained
    Given customer has notifications from 6 months ago
    When customer views notifications
    Then all notifications should still be visible
    And old notifications should not be auto-deleted
    # NOTE: Future enhancement could add cleanup after 1 year

  @NOT-039 @ui
  Scenario: Mark all as read functionality (future)
    # Not currently implemented but useful for future
    Given customer has multiple unread notifications
    When customer clicks "Mark All as Read"
    Then all notifications should be marked as read
    And unread count should become 0
    And all notification backgrounds should turn white

  @NOT-040 @filtering
  Scenario: Filter notifications by type (future)
    # Not currently implemented but useful for future
    Given customer has various notification types
    When customer filters by "Orders"
    Then only order-related notifications should show
    When customer filters by "Payments"
    Then only payment notifications should show