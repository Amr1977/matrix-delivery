# Requirements Document

## Introduction

This specification defines the requirements for making the Matrix Delivery payment system production-ready for Egypt. The implementation is divided into phases:

- **Phase 1**: Balance Top-Up (Smart Wallets & InstaPay) + Admin Verification
- **Phase 2**: Balance Withdrawal + Admin Processing
- **Phase 3**: Escrow System Integration (Order Payment, Driver Earnings, Cancellation)
- **Phase 4**: Advanced Features (Emergency Transfers, Disputes, Reporting)

This document covers **Phase 1** requirements only. Subsequent phases will be added after Phase 1 is complete.

All payments require manual admin verification to ensure security. Crypto payments are postponed due to regulatory restrictions in Egypt.

## Glossary

- **Payment_System**: The complete payment processing infrastructure handling all payment methods
- **Smart_Wallet**: Mobile money services provided by Egyptian telecom operators (Vodafone Cash, Orange Money, Etisalat Cash, WE Pay)
- **InstaPay**: Egypt's national instant payment network operated by the Central Bank of Egypt (no merchant API available)
- **Platform_Wallet**: The platform's receiving wallet/account for each payment method
- **Transaction_Reference**: Unique identifier from the payment provider confirming a transaction
- **Admin_Panel**: Backend interface for administrators to verify payments and process withdrawals

---

## Phase 1: Balance Top-Up & Admin Verification

### Requirement 1: Smart Wallet Top-Up Flow

**User Story:** As a user (driver or customer), I want to top-up my balance using my mobile wallet (Vodafone Cash, Orange Money, Etisalat Cash, WE Pay), so that I have funds available for orders.

#### Acceptance Criteria

1. WHEN a user selects smart wallet top-up THEN THE Payment_System SHALL display available wallet options with platform wallet numbers
2. WHEN a user selects a wallet type THEN THE Payment_System SHALL display the platform's wallet phone number and holder name for that provider
3. THE Payment_System SHALL display clear transfer instructions in Arabic and English
4. WHEN a user completes the transfer THEN THE Payment_System SHALL allow them to submit transaction reference number and amount
5. THE Payment_System SHALL create a pending top-up record with submitted details
6. THE Payment_System SHALL support minimum top-up amount of 10 EGP
7. THE Payment_System SHALL support maximum single top-up of 10000 EGP
8. WHEN top-up details are submitted THEN THE Payment_System SHALL display estimated confirmation time (5-30 minutes)
9. WHEN a top-up request is created THEN THE Payment_System SHALL notify administrators via push notification
10. THE Payment_System SHALL apply the same top-up flow for both drivers and customers

### Requirement 2: InstaPay Top-Up Flow

**User Story:** As a user (driver or customer), I want to top-up my balance using InstaPay, so that I can use my bank account without gateway fees.

#### Acceptance Criteria

1. WHEN a user selects InstaPay top-up THEN THE Payment_System SHALL display the platform's InstaPay alias (IPA) and recipient name
2. THE Payment_System SHALL display step-by-step InstaPay transfer instructions in Arabic and English
3. WHEN a user completes the transfer THEN THE Payment_System SHALL allow them to submit the transaction reference and amount
4. THE Payment_System SHALL create a pending top-up record requiring manual admin verification
5. THE Payment_System SHALL support minimum top-up amount of 10 EGP
6. THE Payment_System SHALL support maximum single top-up of 10000 EGP
7. THE Payment_System SHALL display estimated manual confirmation time (5-30 minutes during business hours)
8. WHEN a top-up request is created THEN THE Payment_System SHALL notify administrators via push notification
9. THE Payment_System SHALL apply the same top-up flow for both drivers and customers

### Requirement 3: Duplicate Transaction Detection

**User Story:** As a platform operator, I want to prevent duplicate top-up submissions, so that users don't accidentally create multiple requests for the same transaction.

#### Acceptance Criteria

1. WHEN a user submits a transaction reference THEN THE Payment_System SHALL check if it already exists
2. IF the transaction reference already exists THEN THE Payment_System SHALL reject the submission with message "This transaction was already submitted"
3. WHEN a duplicate is detected THEN THE Payment_System SHALL display the existing request status to the user
4. THE Payment_System SHALL enforce transaction reference uniqueness per payment method

### Requirement 4: Admin Payment Verification

**User Story:** As a platform administrator, I want to verify pending top-up requests by checking transaction details, so that user balances are updated accurately.

#### Acceptance Criteria

1. THE Admin_Panel SHALL display all pending top-up requests sorted by submission time
2. FOR each pending request THE Admin_Panel SHALL show: user info, wallet type, transaction reference, amount, submission time
3. WHEN an admin verifies a top-up THEN THE Payment_System SHALL credit the amount to user's available_balance
4. WHEN an admin rejects a top-up THEN THE Payment_System SHALL require a rejection reason
5. WHEN a top-up is verified or rejected THEN THE Payment_System SHALL notify the user via push notification
6. THE Admin_Panel SHALL allow filtering pending requests by payment method and date range
7. THE Payment_System SHALL log all verification actions with admin ID and timestamp
8. THE Admin_Panel SHALL display count of pending requests as a badge/indicator

### Requirement 5: Platform Wallet Management

**User Story:** As a platform administrator, I want to manage platform wallet accounts for each payment method, so that users can send payments to the correct accounts.

#### Acceptance Criteria

1. THE Payment_System SHALL maintain platform wallet records for each active payment method
2. FOR each platform wallet THE Payment_System SHALL store: wallet type, phone number/alias, holder name, active status
3. THE Payment_System SHALL support multiple wallets per provider for load balancing
4. WHEN a wallet is deactivated THEN THE Payment_System SHALL stop displaying it as a payment option
5. THE Payment_System SHALL support daily and monthly transaction limits per wallet
6. WHEN a wallet approaches its limit (80%) THEN THE Payment_System SHALL alert administrators
7. THE Payment_System SHALL allow administrators to add, update, and deactivate platform wallets
8. THE Payment_System SHALL use round-robin or least-used selection when multiple wallets exist for same provider

### Requirement 6: User Balance Display

**User Story:** As a user, I want to see my current balance clearly, so that I know how much I have available.

#### Acceptance Criteria

1. THE Payment_System SHALL display user's available_balance prominently in the app
2. THE Payment_System SHALL show balance in EGP with 2 decimal places
3. THE Payment_System SHALL update balance display in real-time after verification
4. THE Payment_System SHALL display pending top-up requests with their status
5. THE Payment_System SHALL show transaction history with filtering by type and date

### Requirement 7: Top-Up Notifications

**User Story:** As a user, I want to receive notifications about my top-up status, so that I know when my balance is updated.

#### Acceptance Criteria

1. WHEN a top-up request is submitted THEN THE Payment_System SHALL send confirmation notification to user
2. WHEN a top-up is verified THEN THE Payment_System SHALL send success notification with new balance
3. WHEN a top-up is rejected THEN THE Payment_System SHALL send rejection notification with reason
4. THE Payment_System SHALL support both push notifications and in-app notifications
5. THE Payment_System SHALL maintain notification history for users to review

### Requirement 8: Payment Security (Phase 1)

**User Story:** As a platform operator, I want basic security measures for top-up operations, so that the system is protected from abuse.

#### Acceptance Criteria

1. THE Payment_System SHALL implement rate limiting on top-up endpoints (10 requests per minute per user)
2. THE Payment_System SHALL log all top-up attempts with IP address, user ID, and timestamp
3. THE Payment_System SHALL validate all user inputs to prevent injection attacks
4. THE Payment_System SHALL encrypt sensitive payment data at rest
5. WHEN suspicious activity is detected (e.g., rapid submissions) THEN THE Payment_System SHALL flag for manual review
