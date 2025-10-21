## ============================================================================
## PHASE 4: MUTUAL REVIEW AND RATING SYSTEM
## ============================================================================

Feature: Mutual Review System
As a user of the platform
I want to rate and review other parties after order completion
So that trust and accountability are maintained in the marketplace

Background:
  Given order "ORD-001" has been delivered
  And the order was between customer "John Doe" and driver "Jane Smith"

## ============================================================================
## Customer Reviews Driver
## ============================================================================

@REV-001
Scenario: Customer submits comprehensive review for driver
  Given I am logged in as customer "John Doe"
  And I am viewing completed order "ORD-001"
  When I click on "Review Driver"
  And I provide the following ratings:
    | criteria          | rating |
    | Overall           | 5      |
    | Professionalism   | 5      |
    | Communication     | 4      |
    | Timeliness        | 5      |
    | Package Condition | 5      |
  And I write comment "Excellent service! Very professional and on time."
  And I submit the review
  Then I should see "Review submitted successfully"
  And the driver's average rating should be updated
  And the driver should receive a notification about the new review
  And I should not be able to review this driver again for this order

@REV-002
Scenario: Customer provides minimum required review
  Given I am logged in as customer "John Doe"
  And I am viewing completed order "ORD-001"
  When I click on "Review Driver"
  And I select overall rating "3"
  And I submit the review without additional comments
  Then the review should be saved successfully
  And the driver's rating should be recalculated

@REV-003
Scenario: Customer attempts to review before delivery completion
  Given I am logged in as customer "John Doe"
  And order "ORD-001" has status "in_transit"
  When I attempt to access the review form
  Then I should see error "Can only review completed orders"
  And the review form should not be accessible

@REV-004
Scenario: Customer attempts duplicate review
  Given I am logged in as customer "John Doe"
  And I have already reviewed driver for order "ORD-001"
  When I attempt to submit another review for the same order
  Then I should see error "Review already submitted"
  And no duplicate review should be created

## ============================================================================
## Driver Reviews Customer
## ============================================================================

@REV-005
Scenario: Driver submits review for customer
  Given I am logged in as driver "Jane Smith"
  And I am viewing completed order "ORD-001"
  When I click on "Review Customer"
  And I provide the following ratings:
    | criteria        | rating |
    | Overall         | 5      |
    | Communication   | 5      |
    | Cooperation     | 4      |
    | Clear Instructions | 5   |
  And I write comment "Great customer, clear instructions and friendly."
  And I submit the review
  Then I should see "Review submitted successfully"
  And the customer's average rating should be updated
  And the customer should receive a notification about the new review

@REV-006
Scenario: Driver provides constructive feedback
  Given I am logged in as driver "Jane Smith"
  And I am viewing completed order "ORD-001"
  When I click on "Review Customer"
  And I select overall rating "3"
  And I write comment "Customer was late to pickup point, but package was well prepared."
  And I submit the review
  Then the review should be saved with the comment
  And the customer should be notified of the feedback

## ============================================================================
## Platform Reviews (Customer Perspective)
## ============================================================================

@REV-007
Scenario: Customer reviews the platform experience
  Given I am logged in as customer "John Doe"
  And I am viewing completed order "ORD-001"
  When I click on "Review Platform"
  And I provide the following ratings:
    | criteria            | rating |
    | Overall Experience  | 5      |
    | Ease of Use         | 5      |
    | Driver Quality      | 5      |
    | Support Quality     | 4      |
  And I write comment "Great platform! Easy to use and found reliable drivers quickly."
  And I submit the review
  Then I should see "Thank you for your feedback"
  And the platform review should be recorded
  And the review should be available in platform statistics

@REV-008
Scenario: Customer reports platform issues through review
  Given I am logged in as customer "John Doe"
  And I am viewing completed order "ORD-001"
  When I click on "Review Platform"
  And I select overall rating "2"
  And I write comment "App crashed twice during order tracking. Needs improvement."
  And I submit the review
  Then the review should be flagged for admin attention
  And platform statistics should reflect the low rating

## ============================================================================
## Platform Reviews (Driver Perspective)
## ============================================================================

@REV-009
Scenario: Driver reviews the platform experience
  Given I am logged in as driver "Jane Smith"
  And I am viewing completed order "ORD-001"
  When I click on "Review Platform"
  And I provide the following ratings:
    | criteria                  | rating |
    | Overall Experience        | 4      |
    | Order Availability        | 5      |
    | Payment Process           | 4      |
    | Customer Quality          | 5      |
  And I write comment "Good platform for finding delivery jobs. Payment could be faster."
  And I submit the review
  Then I should see "Thank you for your feedback"
  And the driver's platform review should be recorded

@REV-010
Scenario: Driver provides feature suggestions
  Given I am logged in as driver "Jane Smith"
  And I am viewing completed order "ORD-001"
  When I click on "Review Platform"
  And I select overall rating "4"
  And I write comment "Would be great to have in-app navigation integration."
  And I submit the review
  Then the suggestion should be recorded for product team review

## ============================================================================
## Review Visibility and Display
## ============================================================================

@REV-011
Scenario: Viewing user's review history
  Given I am viewing driver profile for "Jane Smith"
  When I navigate to the reviews section
  Then I should see all reviews received by the driver
  And I should see:
    | field              | value |
    | Average Rating     | 4.8   |
    | Total Reviews      | 25    |
    | 5-star reviews     | 20    |
    | 4-star reviews     | 4     |
    | 3-star reviews     | 1     |
  And reviews should be sorted by most recent first
  And each review should show:
    - Rating stars
    - Review date
    - Order number (anonymized)
    - Comment
    - Detailed ratings breakdown

@REV-012
Scenario: Filtering reviews by rating
  Given I am viewing driver profile for "Jane Smith"
  And the driver has 25 total reviews
  When I filter by "5 stars"
  Then I should see only 5-star reviews
  And the count should show "20 reviews"

@REV-013
Scenario: Viewing mutual reviews for an order
  Given I am logged in as customer "John Doe"
  And both parties have reviewed each other for order "ORD-001"
  When I view the order details
  Then I should see:
    - My review of the driver
    - Driver's review of me
    - Both platform reviews
  And all reviews should be timestamped
  And I should see rating breakdowns for each review

## ============================================================================
## Review Verification and Trust Indicators
## ============================================================================

@REV-014
Scenario: Verified delivery review badge
  Given order "ORD-001" was completed with GPS tracking
  And customer submitted a review
  When viewing the review
  Then I should see "Verified Delivery" badge
  And the badge should indicate GPS-confirmed completion

@REV-015
Scenario: High-quality reviewer indicator
  Given customer "John Doe" has submitted 50+ reviews
  And 90% of reviews include detailed comments
  When viewing any of John's reviews
  Then I should see "Trusted Reviewer" badge
  And other users can see this credibility indicator

@REV-016
Scenario: Response to review
  Given I am driver "Jane Smith"
  And customer "John Doe" left a 3-star review with concern
  When I view the review
  And I click "Respond to Review"
  And I write "Thank you for feedback. I apologize for the delay and have improved my time management."
  And I submit the response
  Then my response should be visible below the review
  And the customer should be notified of my response

## ============================================================================
## Platform Review Analytics
## ============================================================================

@REV-017
Scenario: Admin views platform review statistics
  Given I am logged in as admin
  When I navigate to "Platform Reviews Dashboard"
  Then I should see:
    | metric                          | value |
    | Overall Platform Rating         | 4.6   |
    | Total Platform Reviews          | 1,250 |
    | Customer Reviews                | 680   |
    | Driver Reviews                  | 570   |
    | Average Customer Rating         | 4.5   |
    | Average Driver Rating           | 4.7   |
  And I should see trending feedback themes
  And I should see common improvement suggestions

@REV-018
Scenario: Identifying problem areas through reviews
  Given platform has 100+ reviews mentioning "payment issues"
  When admin reviews feedback analytics
  Then "payment issues" should be highlighted as trending concern
  And admin should see affected order IDs
  And priority level should be marked as "High"

## ============================================================================
## Review Incentives and Reminders
## ============================================================================

@REV-019
Scenario: Automatic review reminder after delivery
  Given order "ORD-001" was marked as delivered
  When 24 hours have passed
  And customer has not submitted a review
  Then customer should receive notification "Please review your delivery experience"
  And driver should receive similar reminder
  And reminders should include direct link to review form

@REV-020
Scenario: Review completion milestone
  Given customer "John Doe" submits their 10th review
  When the review is submitted
  Then customer should see "Milestone Achievement" message
  And customer should receive "Active Reviewer" badge on profile
  And customer may receive loyalty reward or discount code

## ============================================================================
## Fraud Prevention and Review Integrity
## ============================================================================

@REV-021
Scenario: Detecting suspicious review patterns
  Given driver "Jane Smith" received 10 five-star reviews
  And all reviews were submitted within 1 hour
  And all reviews are from new accounts
  When fraud detection system analyzes the pattern
  Then reviews should be flagged for manual review
  And driver's rating should show "Under Review" status
  And flagged reviews should not count toward average until verified

@REV-022
Scenario: Preventing review manipulation
  Given customer "John Doe" and driver "Jane Smith"
  And they have completed 5 orders together
  When attempting to leave 6th review for Jane
  Then system should flag potential collusion
  And review should require admin approval
  And warning should be issued to both parties

@REV-023
Scenario: Reporting inappropriate review
  Given I am driver "Jane Smith"
  And customer left review with offensive language
  When I click "Report Review"
  And I select reason "Inappropriate content"
  And I submit the report
  Then review should be sent to moderation queue
  And review should be hidden pending investigation
  And I should receive confirmation "Report submitted"

## ============================================================================
## Rating Impact on User Standing
## ============================================================================

@REV-024
Scenario: Low rating warning for driver
  Given driver "Jane Smith" has average rating of 3.2
  And rating has been below 3.5 for 30 days
  When system performs daily rating check
  Then driver should receive warning email
  And warning should state "Your rating is below platform standards"
  And guidance for improvement should be provided
  And account may be reviewed if rating doesn't improve

@REV-025
Scenario: Excellent rating benefits
  Given driver "Jane Smith" maintains 4.9+ rating
  And has completed 100+ deliveries
  When customers search for drivers
  Then Jane should appear at top of search results
  And profile should show "Top Rated Driver" badge
  And Jane should receive priority for high-value orders
  And customers should see "Highly Recommended" indicator

@REV-026
Scenario: Rating recovery program
  Given driver "Jane Smith" rating dropped to 3.8
  And Jane enrolls in "Rating Recovery Program"
  When Jane completes 10 consecutive orders with 4+ stars
  Then system should send congratulations message
  And "Improving Service" badge should be displayed
  And negative weight on old reviews should be reduced

## ============================================================================
## Review Response and Engagement
## ============================================================================

@REV-027
Scenario: Customer receives driver response to review
  Given I am customer "John Doe"
  And I left a 3-star review mentioning "late delivery"
  When driver "Jane Smith" responds to my review
  Then I should receive notification "Driver responded to your review"
  And I should be able to update my review after reading response
  And I can change rating within 7 days of driver response

@REV-028
Scenario: Public thank you for positive review
  Given I am driver "Jane Smith"
  And customer "John Doe" left 5-star review
  When I view the review
  And I click "Say Thanks"
  And I write "Thank you for the kind words! It was a pleasure serving you."
  Then my thank you message should be public
  And customer should be notified
  And this demonstrates good customer service

## ============================================================================
## Multi-dimensional Rating System
## ============================================================================

@REV-029
Scenario: Detailed rating breakdown for driver
  Given customer is reviewing driver "Jane Smith"
  When customer submits review with:
    | Professionalism   | 5 stars |
    | Communication     | 4 stars |
    | Timeliness        | 5 stars |
    | Package Handling  | 5 stars |
    | Overall           | 5 stars |
  Then driver profile should display:
    - Overall: 5.0
    - Professionalism: 5.0
    - Communication: 4.0
    - Timeliness: 5.0
    - Package Handling: 5.0
  And customers can filter by specific criteria

@REV-030
Scenario: Customer service rating dimensions
  Given driver is reviewing customer "John Doe"
  When driver submits review with:
    | Communication      | 5 stars |
    | Cooperation        | 5 stars |
    | Clear Instructions | 4 stars |
    | Punctuality        | 5 stars |
    | Overall            | 5 stars |
  Then customer profile should show these breakdowns
  And drivers can see customer's cooperation rating

## ============================================================================
## Review-based Matching and Recommendations
## ============================================================================

@REV-031
Scenario: High-rated customer gets priority matching
  Given customer "John Doe" has 4.9+ rating
  And posts a new order
  When drivers view available orders
  Then John's order should be highlighted as "Excellent Customer"
  And more drivers should bid on the order
  And John should receive faster service

@REV-032
Scenario: Avoiding low-rated users
  Given driver "Jane Smith" can set rating preferences
  When Jane sets minimum customer rating to 4.0
  Then orders from customers below 4.0 should not be shown
  And Jane only sees orders from reliable customers
  And this improves service quality

## ============================================================================
## Anonymous and Constructive Feedback
## ============================================================================

@REV-033
Scenario: Anonymous feedback to platform about user
  Given I am customer "John Doe"
  And I had concerning experience with driver "Jane Smith"
  When I click "Private Feedback to Platform"
  And I describe issue without public review
  And I submit confidential feedback
  Then feedback goes directly to platform admin
  And driver does not see the feedback
  And admin can investigate without public impact
  And my identity is protected

@REV-034
Scenario: Constructive criticism guidelines
  Given customer is writing review for driver
  When customer types potentially offensive language
  Then system should show warning
  And suggest rephrasing: "Please keep feedback constructive"
  And provide examples of helpful criticism
  And block submission if profanity detected

## ============================================================================
## Review Notifications and Timing
## ============================================================================

@REV-035
Scenario: Immediate review prompt after delivery
  Given order "ORD-001" was just marked delivered
  When customer confirms delivery in app
  Then review prompt should appear immediately
  And prompt should say "How was your experience?"
  And customer can choose "Review Now" or "Remind Me Later"
  And later option schedules reminder for 24 hours

@REV-036
Scenario: Review deadline enforcement
  Given order "ORD-001" was delivered 30 days ago
  And neither party has submitted reviews
  When 30-day window closes
  Then review option should be disabled
  And message should show "Review period has expired"
  And this prevents delayed fraudulent reviews

## ============================================================================
## Platform Transparency and Trust
## ============================================================================

@REV-037
Scenario: Viewing platform's response to reviews
  Given 50+ customers mentioned "slow customer support"
  When I view platform reviews
  Then I should see official platform response
  And response should address the concern
  And show actions taken: "We've hired 10 new support staff"
  And include timeline for improvement
  And this demonstrates accountability

@REV-038
Scenario: Public platform improvement roadmap
  Given platform has analyzed all reviews
  When users visit "Improvements" page
  Then they should see top requested features
  And status of each request (planned/in progress/completed)
  And voting system for feature priorities
  And this shows platform listens to feedback

## ============================================================================
## Cross-platform Review Integration
## ============================================================================

@REV-039
Scenario: Verified external reviews
  Given driver "Jane Smith" has reviews on external platforms
  When Jane connects external accounts
  And verifies ownership
  Then external reviews should display on profile
  And marked as "External Verified Review"
  And aggregate rating includes both sources
  And this builds comprehensive reputation

## ============================================================================
## Review Quality and Helpfulness
## ============================================================================

@REV-040
Scenario: Marking reviews as helpful
  Given I am viewing driver "Jane Smith" profile
  And I see multiple reviews
  When I click "Helpful" on detailed, informative review
  Then helpful count should increase
  And helpful reviews should rank higher
  And reviewers with helpful reviews get reputation boost
  And this promotes quality feedback

@REV-041
Scenario: Minimum review length for detailed rating
  Given customer is reviewing driver
  When customer provides detailed comment (200+ words)
  And includes specific examples
  Then review should be marked "Detailed Review"
  And customer receives bonus reputation points
  And review is weighted higher in calculations
  And this encourages meaningful feedback

## ============================================================================
## Dispute Resolution Through Reviews
## ============================================================================

@REV-042
Scenario: Review-based dispute escalation
  Given customer "John Doe" leaves 1-star review
  And claims package was damaged
  When driver "Jane Smith" contests the review
  And provides photo evidence of good condition
  Then dispute should escalate to admin review
  And both parties should provide documentation
  And admin makes final decision on review validity
  And unfair review may be removed

@REV-043
Scenario: Mediation offer after negative review
  Given driver receives 2-star review
  And customer mentions specific issues
  When driver responds professionally
  And offers to make it right
  Then platform should offer free mediation service
  And both parties can resolve issue
  And customer may update review after resolution
  And this promotes conflict resolution

## ============================================================================
## Seasonal and Contextual Reviews
## ============================================================================

@REV-044
Scenario: Weather-adjusted rating expectations
  Given order was delivered during severe weather
  And customer reviews driver
  When customer rates timeliness as 3 stars
  Then system should note weather conditions
  And display "Delivery during severe weather" badge
  And other users see context
  And driver's overall timeliness not heavily impacted

@REV-045
Scenario: Holiday surge period consideration
  Given order was during holiday rush
  And driver completed 50 orders that week
  When customers review the driver
  Then reviews should be tagged "Holiday Period"
  And users can filter by normal vs peak periods
  And this provides fair assessment context

## ============================================================================
## Review System Health Monitoring
## ============================================================================

@REV-046
Scenario: Platform monitors review system health
  Given platform tracks review metrics
  When daily analysis runs
  Then system should calculate:
    | metric                        | threshold |
    | Review submission rate        | >60%      |
    | Average time to review        | <48 hours |
    | Reviews with comments         | >70%      |
    | Flagged reviews ratio         | <2%       |
    | Review response rate          | >40%      |
  And alerts trigger if thresholds not met
  And this ensures system integrity

@REV-047
Scenario: A/B testing review prompts
  Given platform wants to improve review rates
  When testing different prompt messages
  Then Group A sees: "Share your experience"
  And Group B sees: "Help others make informed decisions"
  And platform measures response rates
  And implements more effective prompt
  And this optimizes user engagement

## ============================================================================
## Legal and Compliance
## ============================================================================

@REV-048
Scenario: GDPR-compliant review data handling
  Given customer "John Doe" requests data deletion
  When GDPR request is processed
  Then customer's reviews should be anonymized
  And personal identifying info removed
  And reviews remain but show "Former User"
  And ratings stay in driver's average
  And this balances privacy with platform integrity

@REV-049
Scenario: Review content moderation
  Given automated system scans all reviews
  When review contains:
    - Personal contact information
    - Discriminatory language
    - Threats or harassment
    - False claims
  Then review should be auto-flagged
  And held for manual moderation
  And submitter notified of guidelines violation
  And clean version may be requested

## ============================================================================
## Review System Success Metrics
## ============================================================================

@REV-050
Scenario: Measuring review system effectiveness
  Given platform has mutual review system active
  When analyzing 6-month performance
  Then success metrics should show:
    | metric                              | target    | actual  |
    | Orders with both reviews complete   | >80%      | 85%     |
    | Average rating across platform      | 4.2-4.5   | 4.4     |
    | Users with 10+ reviews              | >50%      | 62%     |
    | Review-related disputes             | <5%       | 3%      |
    | User trust score improvement        | +15%      | +22%    |
  And this validates system value
  And guides future improvements