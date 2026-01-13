# Design Document: Admin Wallet Management

## Overview

This design document covers the refactoring of the Admin Panel navigation from horizontal tabs to a side menu, and the creation of the Admin Wallet Management UI. The system enables administrators to manage platform wallets (Smart Wallets and InstaPay accounts) that users send payments to for balance top-ups.

The backend API endpoints already exist in `backend/routes/adminTopups.js`. This design focuses on frontend implementation only.

## Architecture

### High-Level Component Structure

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Top Navbar (existing)                          │
├──────────────┬──────────────────────────────────────────────────────────┤
│              │                                                           │
│   AdminSide  │                    Main Content Area                      │
│    Menu      │                                                           │
│              │  ┌─────────────────────────────────────────────────────┐ │
│  ┌────────┐  │  │                                                     │ │
│  │Overview│  │  │   Active Panel (based on selected menu item)        │ │
│  ├────────┤  │  │                                                     │ │
│  │Health  │  │  │   - Overview Dashboard                              │ │
│  ├────────┤  │  │   - System Health                                   │ │
│  │Payments│  │  │   - AdminPaymentsPanel (Top-Up Verification)        │ │
│  │ ├─TopUp│  │  │   - AdminWalletsPanel (Wallet Management)           │ │
│  │ └─Wallet│ │  │   - Users Management                                │ │
│  ├────────┤  │  │   - Orders Management                               │ │
│  │Users   │  │  │   - Analytics                                       │ │
│  ├────────┤  │  │   - Logs Viewer                                     │ │
│  │Orders  │  │  │   - Settings                                        │ │
│  ├────────┤  │  │                                                     │ │
│  │Analytics│ │  └─────────────────────────────────────────────────────┘ │
│  ├────────┤  │                                                           │
│  │Logs    │  │                                                           │
│  ├────────┤  │                                                           │
│  │Settings│  │                                                           │
│  └────────┘  │                                                           │
│              │                                                           │
└──────────────┴──────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
AdminPanel.js (refactored)
├── AdminSideMenu.tsx (NEW)
│   ├── MenuItem (Overview, Health, Users, Orders, Analytics, Logs, Settings)
│   └── ExpandableMenuItem (Payments)
│       ├── SubMenuItem (Top-Up Verification) + Badge
│       └── SubMenuItem (Wallet Management)
├── Main Content Area
│   ├── Overview Dashboard (existing)
│   ├── SystemHealthDashboard (existing)
│   ├── AdminPaymentsPanel (existing)
│   ├── AdminWalletsPanel.tsx (NEW)
│   │   ├── WalletCard.tsx (NEW)
│   │   ├── WalletForm.tsx (NEW)
│   │   └── UsageProgressBar.tsx (NEW)
│   ├── Users Management (existing)
│   ├── Orders Management (existing)
│   ├── Analytics (existing)
│   ├── LogsViewer (existing)
│   └── Settings (existing)
```

## Components and Interfaces

### 1. AdminSideMenu Component (NEW)

```typescript
interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  subItems?: SubMenuItem[];
}

interface SubMenuItem {
  id: string;
  label: string;
  badge?: number;
}

interface AdminSideMenuProps {
  activeItem: string;
  onItemSelect: (itemId: string) => void;
  pendingTopupCount?: number;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

// Menu items configuration
const MENU_ITEMS: MenuItem[] = [
  { id: 'overview', label: 'Overview', icon: <BarChart3 /> },
  { id: 'health', label: 'Health', icon: <Activity /> },
  { 
    id: 'payments', 
    label: 'Payments', 
    icon: <CreditCard />,
    subItems: [
      { id: 'payments-topups', label: 'Top-Up Verification' },
      { id: 'payments-wallets', label: 'Wallet Management' }
    ]
  },
  { id: 'users', label: 'Users', icon: <Users /> },
  { id: 'orders', label: 'Orders', icon: <Package /> },
  { id: 'analytics', label: 'Analytics', icon: <TrendingUp /> },
  { id: 'logs', label: 'Logs', icon: <FileText /> },
  { id: 'settings', label: 'Settings', icon: <Settings /> }
];
```

### 2. AdminWalletsPanel Component (NEW)

```typescript
interface PlatformWallet {
  id: number;
  paymentMethod: 'vodafone_cash' | 'orange_money' | 'etisalat_cash' | 'we_pay' | 'instapay';
  phoneNumber?: string;
  instapayAlias?: string;
  holderName: string;
  isActive: boolean;
  dailyLimit: number;
  monthlyLimit: number;
  dailyUsed: number;
  monthlyUsed: number;
  lastResetDaily?: string;
  lastResetMonthly?: string;
  createdAt: string;
  updatedAt: string;
}

interface AdminWalletsPanelProps {
  // No props needed - fetches data internally
}

interface WalletFormData {
  paymentMethod: string;
  phoneNumber?: string;
  instapayAlias?: string;
  holderName: string;
  dailyLimit: number;
  monthlyLimit: number;
}
```

### 3. WalletCard Component (NEW)

```typescript
interface WalletCardProps {
  wallet: PlatformWallet;
  onEdit: (wallet: PlatformWallet) => void;
  onToggleActive: (wallet: PlatformWallet) => void;
}
```

### 4. WalletForm Component (NEW)

```typescript
interface WalletFormProps {
  wallet?: PlatformWallet; // undefined for create, defined for edit
  onSubmit: (data: WalletFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}
```

### 5. UsageProgressBar Component (NEW)

```typescript
interface UsageProgressBarProps {
  used: number;
  limit: number;
  label: string;
  showPercentage?: boolean;
}

// Color thresholds
const getProgressColor = (percentage: number): string => {
  if (percentage >= 95) return 'red';    // danger
  if (percentage >= 80) return 'yellow'; // warning
  return 'green';                        // normal
};
```

## API Integration

### Existing Endpoints (from backend/routes/adminTopups.js)

```
GET  /api/admin/topups/platform-wallets
     Response: { success: boolean, wallets: PlatformWallet[] }

POST /api/admin/topups/platform-wallets
     Body: { paymentMethod, phoneNumber?, instapayAlias?, holderName, dailyLimit, monthlyLimit }
     Response: { success: boolean, message: string, wallet: PlatformWallet }

PUT  /api/admin/topups/platform-wallets/:id
     Body: { phoneNumber?, instapayAlias?, holderName?, dailyLimit?, monthlyLimit?, isActive? }
     Response: { success: boolean, message: string, wallet: PlatformWallet }
```

### Frontend API Service (NEW)

```typescript
// frontend/src/services/api/platformWallets.ts

export const platformWalletsApi = {
  // Get all platform wallets
  getAll: async (): Promise<{ wallets: PlatformWallet[] }> => {
    return api.get('/admin/topups/platform-wallets');
  },

  // Create new wallet
  create: async (data: WalletFormData): Promise<{ wallet: PlatformWallet }> => {
    return api.post('/admin/topups/platform-wallets', data);
  },

  // Update wallet
  update: async (id: number, data: Partial<WalletFormData & { isActive: boolean }>): Promise<{ wallet: PlatformWallet }> => {
    return api.put(`/admin/topups/platform-wallets/${id}`, data);
  }
};
```

## Data Models

### Payment Method Display Configuration

```typescript
const PAYMENT_METHOD_CONFIG: Record<string, { label: string; icon: string; type: 'smart_wallet' | 'instapay' }> = {
  vodafone_cash: { label: 'Vodafone Cash', icon: '📱', type: 'smart_wallet' },
  orange_money: { label: 'Orange Money', icon: '🍊', type: 'smart_wallet' },
  etisalat_cash: { label: 'Etisalat Cash', icon: '📞', type: 'smart_wallet' },
  we_pay: { label: 'WE Pay', icon: '💳', type: 'smart_wallet' },
  instapay: { label: 'InstaPay', icon: '🏦', type: 'instapay' }
};
```

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property 1: Active Menu Item Highlighting

_For any_ menu item that is clicked, the side menu SHALL visually highlight that item as active and remove highlighting from previously active items.

**Validates: Requirements 1.5**

### Property 2: Wallet Data Completeness

_For any_ platform wallet returned by the API, the AdminWalletsPanel SHALL render all required fields: payment method, phone number/alias, holder name, active status, and usage statistics.

**Validates: Requirements 3.2, 3.3**

### Property 3: Active/Inactive Visual Distinction

_For any_ platform wallet, the AdminWalletsPanel SHALL apply distinct visual styles based on the wallet's isActive status.

**Validates: Requirements 3.4**

### Property 4: Form Validation by Payment Method

_For any_ wallet creation form submission, validation SHALL require phone number when payment method is a Smart Wallet, and InstaPay alias when payment method is InstaPay.

**Validates: Requirements 4.3, 4.4, 4.5**

### Property 5: Wallet Controls Presence

_For any_ platform wallet displayed in the list, the AdminWalletsPanel SHALL provide both an Edit button and an active status toggle.

**Validates: Requirements 5.1, 6.1**

### Property 6: Usage Progress Bar Accuracy

_For any_ platform wallet, the progress bars SHALL display the correct percentage (used/limit * 100) and apply the correct color based on thresholds: green (<80%), yellow (80-94%), red (≥95%).

**Validates: Requirements 7.1, 7.2, 7.3, 7.4**

## Error Handling

### Validation Errors

| Error Code | Condition | User Message |
|------------|-----------|--------------|
| MISSING_PAYMENT_METHOD | No payment method selected | Please select a payment method |
| MISSING_HOLDER_NAME | Holder name empty | Holder name is required |
| MISSING_PHONE_NUMBER | Smart wallet without phone | Phone number is required for smart wallets |
| MISSING_INSTAPAY_ALIAS | InstaPay without alias | InstaPay alias is required |
| INVALID_LIMIT | Limit <= 0 | Limit must be a positive number |

### API Errors

| Error Code | Condition | User Message |
|------------|-----------|--------------|
| NETWORK_ERROR | API unreachable | Unable to connect. Please try again. |
| WALLET_NOT_FOUND | Wallet ID invalid | Wallet not found |
| UNAUTHORIZED | Not admin | Admin access required |

## Testing Strategy

### Unit Tests

- AdminSideMenu: menu rendering, item selection, collapse behavior
- AdminWalletsPanel: wallet list rendering, CRUD operations
- WalletCard: data display, action buttons
- WalletForm: validation, submission
- UsageProgressBar: percentage calculation, color thresholds

### Property-Based Tests

Using fast-check library:

1. **Menu Highlighting Property**: Generate random menu selections, verify only one item is active
2. **Wallet Rendering Property**: Generate random wallet data, verify all fields rendered
3. **Form Validation Property**: Generate random form data, verify validation rules
4. **Progress Bar Property**: Generate random usage values, verify correct percentage and color

### Integration Tests

- Full wallet CRUD flow: create → list → edit → deactivate
- Side menu navigation: click menu items → verify correct panel displayed
- Responsive behavior: resize viewport → verify collapse behavior

## UI/UX Specifications

### Side Menu Dimensions

```css
/* Expanded state */
.admin-side-menu {
  width: 240px;
  min-height: calc(100vh - 64px); /* Subtract navbar height */
  top: 64px; /* Below navbar */
  position: fixed;
  left: 0;
}

/* Collapsed state (icons only) */
.admin-side-menu.collapsed {
  width: 64px;
}

/* Main content adjustment */
.admin-main-content {
  margin-left: 240px; /* or 64px when collapsed */
  padding: 1.5rem;
}
```

### Responsive Breakpoints

```css
/* Tablet and below: collapse to icons */
@media (max-width: 1024px) {
  .admin-side-menu {
    width: 64px;
  }
  .admin-main-content {
    margin-left: 64px;
  }
}

/* Mobile: hide side menu, show hamburger */
@media (max-width: 768px) {
  .admin-side-menu {
    transform: translateX(-100%);
  }
  .admin-side-menu.open {
    transform: translateX(0);
  }
  .admin-main-content {
    margin-left: 0;
  }
}
```

### Color Scheme (Matrix Theme)

```css
:root {
  --menu-bg: var(--matrix-black);
  --menu-item-hover: var(--matrix-dark-green);
  --menu-item-active: var(--matrix-green);
  --menu-text: var(--matrix-bright-green);
  --menu-text-muted: var(--matrix-secondary);
  --badge-bg: var(--matrix-green);
  --badge-text: var(--matrix-black);
}
```

## Security Considerations

1. **Authorization**: All wallet management endpoints require admin role (verifyAdmin middleware)
2. **Input Validation**: All form inputs validated on frontend and backend
3. **CSRF Protection**: All POST/PUT requests include CSRF token
4. **Audit Trail**: All wallet changes logged in backend (existing)

