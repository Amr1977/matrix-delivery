# Payment Configuration Guide

## 📋 Overview

The payment system uses a centralized configuration file to manage all payment-related settings, eliminating magic numbers and making the system easier to maintain and modify.

## 📁 Configuration File

**Location:** `backend/config/paymentConfig.ts`

### Key Features:
- ✅ **No Magic Numbers** - All rates and fees defined in one place
- ✅ **Type-Safe** - Full TypeScript support
- ✅ **Easy to Modify** - Change commission rates without touching business logic
- ✅ **Utility Functions** - Helper functions for calculations
- ✅ **Validation** - Built-in payment amount validation

---

## ⚙️ Configuration Structure

```typescript
export const PAYMENT_CONFIG = {
  // Platform commission rate
  COMMISSION_RATE: 0.15,              // 15% as decimal
  COMMISSION_RATE_PERCENT: 15,        // 15% for display
  
  // Minimum amounts
  MIN_DIGITAL_PAYMENT_AMOUNT: 5,      // 5 EGP minimum
  
  // Processing fees by method
  FEES: {
    CARD: 0.025,      // 2.5%
    WALLET: 0.025,    // 2.5%
    COD: 0,           // Free
  },
  
  // Currency settings
  DEFAULT_CURRENCY: 'EGP',
  SUPPORTED_CURRENCIES: ['EGP', 'USD', 'EUR'],
  
  // Payment method configuration
  PAYMENT_METHODS: {
    CARD: { enabled: true, name: 'Credit/Debit Card', fee: 0.025, minAmount: 5 },
    WALLET: { enabled: true, name: 'Mobile Wallet', fee: 0.025, minAmount: 5 },
    COD: { enabled: true, name: 'Cash on Delivery', fee: 0, minAmount: 0 },
  },
  
  // Timeouts
  TIMEOUTS: {
    PAYMENT_INTENT_EXPIRY: 3600000,   // 1 hour
    AUTH_TOKEN_EXPIRY: 3600000,       // 1 hour
  },
};
```

---

## 🛠️ Utility Functions

### 1. Calculate Commission

```typescript
import { calculateCommission } from '../config/paymentConfig';

// Calculate 15% commission
const { commission, payout, rate } = calculateCommission(100);
// Result: { commission: 15.00, payout: 85.00, rate: 0.15 }

// Custom commission rate
const custom = calculateCommission(100, 0.10); // 10%
// Result: { commission: 10.00, payout: 90.00, rate: 0.10 }
```

### 2. Calculate Payment Fee

```typescript
import { calculatePaymentFee } from '../config/paymentConfig';

const cardFee = calculatePaymentFee(100, 'card');
// Result: 2.50 (2.5% of 100)

const walletFee = calculatePaymentFee(100, 'wallet');
// Result: 2.50

const codFee = calculatePaymentFee(100, 'cod');
// Result: 0.00
```

### 3. Calculate Total with Fees

```typescript
import { calculateTotalWithFees } from '../config/paymentConfig';

const total = calculateTotalWithFees(100, 'card');
// Result: 102.50 (100 + 2.5% fee)
```

### 4. Validate Payment Amount

```typescript
import { validatePaymentAmount } from '../config/paymentConfig';

const validation = validatePaymentAmount(3, 'card');
// Result: { valid: false, error: 'Minimum amount for Credit/Debit Card is 5 EGP' }

const valid = validatePaymentAmount(10, 'card');
// Result: { valid: true }
```

---

## 📝 Usage Examples

### In Services

```typescript
// paymobService.ts
import { PAYMENT_CONFIG, calculateCommission } from '../config/paymentConfig';

// Calculate commission
const { commission, payout } = calculateCommission(amountEGP);

// Store in database
await client.query(`
  INSERT INTO platform_revenue (order_id, commission_amount, commission_rate)
  VALUES ($1, $2, $3)
`, [orderId, commission, PAYMENT_CONFIG.COMMISSION_RATE]);
```

### In Routes

```typescript
// payments.js
const { validatePaymentAmount } = require('../config/paymentConfig');

router.post('/create', async (req, res) => {
  const { amount, paymentMethod } = req.body;
  
  // Validate amount
  const validation = validatePaymentAmount(amount, paymentMethod);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }
  
  // Process payment...
});
```

### In Frontend

```typescript
// PaymentMethodSelector.tsx
const CARD_FEE = 0.025; // Import from shared config in production

const calculateTotal = (amount: number) => {
  const fee = amount * CARD_FEE;
  return amount + fee;
};
```

---

## 🔧 How to Change Commission Rate

### Option 1: Modify Config File (Recommended)

```typescript
// backend/config/paymentConfig.ts
export const PAYMENT_CONFIG = {
  COMMISSION_RATE: 0.12,              // Change to 12%
  COMMISSION_RATE_PERCENT: 12,        // Update display value
  // ... rest of config
};
```

### Option 2: Environment Variable (Future Enhancement)

> [!NOTE]
> Currently not implemented. Commission rate is managed in `paymentConfig.ts`.

```bash
# Future: Could read from environment
# COMMISSION_RATE=0.12
```

---

## 📊 Commission Calculation Examples

| Order Amount | Commission (15%) | Driver Payout (85%) |
|--------------|------------------|---------------------|
| 100 EGP | 15.00 EGP | 85.00 EGP |
| 250 EGP | 37.50 EGP | 212.50 EGP |
| 500 EGP | 75.00 EGP | 425.00 EGP |
| 1000 EGP | 150.00 EGP | 850.00 EGP |

---

## 🎯 Benefits of Centralized Configuration

### Before (Magic Numbers):
```typescript
// ❌ Scattered throughout codebase
const commission = amount * 0.15;  // What is 0.15?
const fee = amount * 0.025;        // Why 0.025?
```

### After (Centralized Config):
```typescript
// ✅ Clear and maintainable
const { commission } = calculateCommission(amount);
const fee = calculatePaymentFee(amount, 'card');
```

### Advantages:
1. **Single Source of Truth** - One place to update rates
2. **Type Safety** - TypeScript catches errors at compile time
3. **Easier Testing** - Mock configuration for tests
4. **Better Documentation** - Self-documenting code
5. **Flexibility** - Easy to add new payment methods
6. **Consistency** - Same calculations everywhere

---

## 🧪 Testing

```typescript
import { calculateCommission, PAYMENT_CONFIG } from '../config/paymentConfig';

describe('Payment Configuration', () => {
  it('should calculate 15% commission correctly', () => {
    const { commission, payout } = calculateCommission(100);
    expect(commission).toBe(15.00);
    expect(payout).toBe(85.00);
  });
  
  it('should use correct commission rate', () => {
    expect(PAYMENT_CONFIG.COMMISSION_RATE).toBe(0.15);
  });
});
```

---

## 🚀 Future Enhancements

### 1. Dynamic Commission Rates
```typescript
// Different rates for different user tiers
const getCommissionRate = (userTier: string) => {
  const rates = {
    'free': 0.15,      // 15%
    'pro': 0.10,       // 10%
    'elite': 0.07,     // 7%
  };
  return rates[userTier] || PAYMENT_CONFIG.COMMISSION_RATE;
};
```

### 2. Time-Based Rates
```typescript
// Promotional periods
const getCommissionRate = (date: Date) => {
  if (isPromotionalPeriod(date)) {
    return 0.10; // 10% during promo
  }
  return PAYMENT_CONFIG.COMMISSION_RATE;
};
```

### 3. Volume-Based Rates
```typescript
// Lower rates for high-volume drivers
const getCommissionRate = (monthlyOrders: number) => {
  if (monthlyOrders > 100) return 0.10;  // 10%
  if (monthlyOrders > 50) return 0.12;   // 12%
  return PAYMENT_CONFIG.COMMISSION_RATE;  // 15%
};
```

---

## ✅ Checklist for Changing Rates

- [ ] Update `COMMISSION_RATE` in `paymentConfig.ts`
- [ ] Update `COMMISSION_RATE_PERCENT` for display
- [ ] Run tests to ensure calculations are correct
- [ ] Update documentation if needed
- [ ] Deploy to staging and test
- [ ] Notify users of rate changes (if applicable)
- [ ] Deploy to production
- [ ] Monitor revenue metrics

---

## 📚 Related Files

- **Config:** `backend/config/paymentConfig.ts`
- **Service:** `backend/services/paymobService.ts`
- **Routes:** `backend/routes/payments.js`
- **Migration:** `backend/migrations/add_paymob_support.sql`
- **Frontend:** `frontend/src/components/payments/`

---

**Last Updated:** December 12, 2025  
**Version:** 1.0.0
