# Requirements Document

## Introduction

This specification defines the requirements for refactoring the Admin Panel navigation from horizontal tabs to a side menu, and adding the Admin Wallet Management UI feature. This feature allows platform administrators to manage platform wallets (Smart Wallets and InstaPay accounts) that users send payments to for balance top-ups.

The backend API endpoints already exist (`backend/routes/adminTopups.js`). This spec focuses on:
1. Migrating all existing admin tabs to a side menu navigation
2. Creating the wallet management UI to consume existing endpoints

## Glossary

- **Admin_Panel**: Backend interface for administrators to manage platform operations
- **Platform_Wallet**: The platform's receiving wallet/account for each payment method
- **Smart_Wallet**: Mobile money services (Vodafone Cash, Orange Money, Etisalat Cash, WE Pay)
- **InstaPay**: Egypt's national instant payment network
- **Side_Menu**: Navigation menu on the left side of the admin panel
- **Top_Navbar**: The existing header/navbar at the top of the admin panel

---

## Requirements

### Requirement 1: Admin Panel Side Menu Navigation

**User Story:** As an administrator, I want all admin features accessible from a side menu, so that I have more screen space for content and better navigation.

#### Acceptance Criteria

1. THE Admin_Panel SHALL replace horizontal tabs with a vertical side menu
2. THE Side_Menu SHALL contain all existing tabs: Overview, Health, Payments, Users, Orders, Analytics, Logs, Settings
3. THE Side_Menu SHALL be positioned on the left side of the screen
4. THE Side_Menu SHALL NOT overlap or cover the Top_Navbar (respect navbar height)
5. THE Side_Menu SHALL highlight the currently active menu item
6. THE Side_Menu SHALL support collapsible sections for grouped items
7. THE Side_Menu SHALL use icons alongside text labels for each menu item
8. WHEN the screen width is reduced THEN THE Side_Menu SHALL collapse to show only icons
9. THE main content area SHALL adjust to fill remaining space beside the Side_Menu

### Requirement 2: Payments Section with Sub-Navigation

**User Story:** As an administrator, I want the Payments section to have sub-items, so that I can access both top-up verification and wallet management.

#### Acceptance Criteria

1. THE Side_Menu SHALL display "Payments" as an expandable section
2. WHEN an admin clicks "Payments" THEN THE Side_Menu SHALL expand to show sub-items
3. THE Payments section SHALL contain sub-items: "Top-Up Verification" and "Wallet Management"
4. WHEN an admin clicks "Top-Up Verification" THEN THE Admin_Panel SHALL display the existing AdminPaymentsPanel
5. WHEN an admin clicks "Wallet Management" THEN THE Admin_Panel SHALL display the AdminWalletsPanel
6. THE Side_Menu SHALL show pending top-up count badge next to "Top-Up Verification"
7. THE Payments section SHALL remain expanded when any sub-item is active

### Requirement 3: Platform Wallet List Display

**User Story:** As an administrator, I want to view all platform wallets, so that I can see which payment accounts are configured.

#### Acceptance Criteria

1. THE AdminWalletsPanel SHALL display a list of all platform wallets
2. FOR each wallet THE AdminWalletsPanel SHALL show: payment method, phone number/alias, holder name, active status
3. FOR each wallet THE AdminWalletsPanel SHALL show usage statistics: daily used, daily limit, monthly used, monthly limit
4. THE AdminWalletsPanel SHALL visually distinguish active wallets from inactive wallets
5. THE AdminWalletsPanel SHALL group wallets by payment method type (Smart Wallets vs InstaPay)
6. WHEN daily_used reaches 80% of daily_limit THEN THE AdminWalletsPanel SHALL display a warning indicator
7. THE AdminWalletsPanel SHALL support refreshing the wallet list

### Requirement 4: Create New Platform Wallet

**User Story:** As an administrator, I want to add new platform wallets, so that users have accounts to send payments to.

#### Acceptance Criteria

1. THE AdminWalletsPanel SHALL provide an "Add Wallet" button
2. WHEN an admin clicks "Add Wallet" THEN THE Admin_Panel SHALL display a creation form
3. THE creation form SHALL require: payment method selection, holder name
4. WHEN payment method is a Smart Wallet THEN THE form SHALL require phone number
5. WHEN payment method is InstaPay THEN THE form SHALL require InstaPay alias
6. THE form SHALL allow setting daily and monthly limits (with defaults: 50,000 / 500,000 EGP)
7. WHEN the form is submitted THEN THE Admin_Panel SHALL call POST /api/admin/topups/platform-wallets
8. WHEN creation succeeds THEN THE Admin_Panel SHALL refresh the wallet list and show success message
9. WHEN creation fails THEN THE Admin_Panel SHALL display the error message

### Requirement 5: Update Platform Wallet

**User Story:** As an administrator, I want to update platform wallet details, so that I can change phone numbers, limits, or holder names.

#### Acceptance Criteria

1. FOR each wallet THE AdminWalletsPanel SHALL provide an "Edit" button
2. WHEN an admin clicks "Edit" THEN THE Admin_Panel SHALL display an edit form pre-filled with current values
3. THE edit form SHALL allow updating: phone number/alias, holder name, daily limit, monthly limit
4. WHEN the form is submitted THEN THE Admin_Panel SHALL call PUT /api/admin/topups/platform-wallets/:id
5. WHEN update succeeds THEN THE Admin_Panel SHALL refresh the wallet list and show success message
6. WHEN update fails THEN THE Admin_Panel SHALL display the error message

### Requirement 6: Activate/Deactivate Platform Wallet

**User Story:** As an administrator, I want to enable or disable platform wallets, so that I can control which accounts users can send payments to.

#### Acceptance Criteria

1. FOR each wallet THE AdminWalletsPanel SHALL provide a toggle or button to change active status
2. WHEN an admin deactivates a wallet THEN THE Admin_Panel SHALL call PUT /api/admin/topups/platform-wallets/:id with isActive=false
3. WHEN a wallet is deactivated THEN THE AdminWalletsPanel SHALL visually indicate the inactive status
4. WHEN an admin activates a wallet THEN THE Admin_Panel SHALL call PUT /api/admin/topups/platform-wallets/:id with isActive=true
5. THE Admin_Panel SHALL show a confirmation dialog before deactivating a wallet
6. WHEN deactivation succeeds THEN THE Admin_Panel SHALL show a warning that users will no longer see this wallet

### Requirement 7: Wallet Usage Statistics

**User Story:** As an administrator, I want to see wallet usage statistics, so that I can monitor transaction volumes and limits.

#### Acceptance Criteria

1. FOR each wallet THE AdminWalletsPanel SHALL display a progress bar for daily usage (daily_used / daily_limit)
2. FOR each wallet THE AdminWalletsPanel SHALL display a progress bar for monthly usage (monthly_used / monthly_limit)
3. WHEN usage exceeds 80% THEN THE progress bar SHALL change color to yellow/warning
4. WHEN usage exceeds 95% THEN THE progress bar SHALL change color to red/danger
5. THE AdminWalletsPanel SHALL show last reset timestamps for daily and monthly counters

### Requirement 8: Responsive Design

**User Story:** As an administrator, I want the wallet management UI to work on different screen sizes, so that I can manage wallets from various devices.

#### Acceptance Criteria

1. THE AdminWalletsPanel SHALL be responsive and work on desktop and tablet screens
2. THE wallet list SHALL use a card layout on smaller screens
3. THE Side_Menu SHALL collapse to icons on smaller screens
4. THE forms SHALL stack fields vertically on smaller screens

