@takaful_benefits
Feature: Takaful Benefit Claims
  As a courier
  I want to claim Takaful benefits
  So that I can receive support when needed

  Background:
    Given the system is running
    And a driver "benefit_driver" exists
    And "benefit_driver" has contributed 500 EGP to Takaful

  # ========================================
  # Gold-Indexed Loans
  # ========================================

  @gold_loans @TBN-001
  Scenario: Loan amount converted to gold grams
    Given current gold price is 2000 EGP per gram
    When driver requests a loan of 10000 EGP
    Then the loan should be recorded as 5 grams of 24k gold
    And the gold price at loan time should be stored

  @gold_loans @TBN-002
  Scenario: Loan repayment calculated in current gold value
    Given driver has a loan of 5 grams outstanding
    And current gold price is 2200 EGP per gram
    When driver makes a payment of 1 gram
    Then 2200 EGP should be deducted from earnings
    And remaining balance should be 4 grams

  @gold_loans @TBN-003
  Scenario: Loan protects fund from inflation
    Given driver took loan of 10000 EGP when gold was 2000 EGP/gram
    And driver repays after gold increased to 2500 EGP/gram
    When full loan is repaid
    Then total repaid should be 12500 EGP
    And Takaful fund purchasing power is preserved

  # ========================================
  # Life Event Claims
  # ========================================

  @life_events @TBN-004
  Scenario: Driver claims marriage bonus
    Given "benefit_driver" has been active for 6+ months
    When driver submits marriage claim with certificate
    Then claim should be created with type "marriage_bonus"
    And claim status should be "pending"

  @life_events @TBN-005
  Scenario: Driver claims newborn bonus
    Given "benefit_driver" has been active for 6+ months
    When driver submits newborn claim with birth certificate
    Then claim should be created with type "newborn_bonus"
    And claim status should be "pending"

  @life_events @TBN-006
  Scenario: Death compensation to family
    Given "benefit_driver" passed away
    When family submits death compensation claim
    Then claim should be created with type "death_compensation"
    And beneficiary details should be recorded

  # ========================================
  # Professional Development
  # ========================================

  @professional_development @TBN-007
  Scenario: Driver claims driving course reimbursement
    When driver submits claim for professional driving course
    Then claim should be created with type "driving_course"
    And evidence (certificate) should be required

  @professional_development @TBN-008
  Scenario: Driver claims maintenance training
    When driver submits claim for motorcycle maintenance course
    Then claim should be created with type "maintenance_training"
    And claim should specify vehicle type

  # ========================================
  # Health & Wellness
  # ========================================

  @health_wellness @TBN-009
  Scenario: Driver claims gym membership
    When driver submits gym membership claim
    Then claim should be created with type "gym"
    And partner gym discount should be applied

  @health_wellness @TBN-010
  Scenario: Driver claims self-defense course
    When driver submits self-defense course claim
    Then claim should be created with type "self_defense"
    And course provider should be verified

  # ========================================
  # Claim Processing
  # ========================================

  @claim_processing @TBN-011
  Scenario: Admin approves claim
    Given a pending claim exists
    When admin approves the claim
    Then claim status should be "approved"
    And payment should be scheduled

  @claim_processing @TBN-012
  Scenario: Admin rejects claim with reason
    Given a pending claim exists
    When admin rejects the claim with reason "Insufficient evidence"
    Then claim status should be "rejected"
    And rejection reason should be recorded

  @claim_processing @TBN-013
  Scenario: Claim paid from Takaful fund
    Given an approved claim of 500 EGP
    When payment is processed
    Then 500 EGP should be deducted from Takaful fund
    And claim status should be "paid"
    And driver should receive notification
