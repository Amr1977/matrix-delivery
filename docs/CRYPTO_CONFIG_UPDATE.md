# Crypto Payment Configuration Update

## ✅ Changes Made

Updated crypto payment implementation to use centralized `PAYMENT_CONFIG` instead of hardcoded values:

### Files Updated:

1. **`backend/scripts/deploy-escrow.js`**
   - ✅ Imports `PAYMENT_CONFIG` from `paymentConfig.ts`
   - ✅ Uses `PAYMENT_CONFIG.COMMISSION_RATE * 10000` (converts 0.15 to 1500 basis points)
   - ✅ Displays `PAYMENT_CONFIG.COMMISSION_RATE_PERCENT` in logs

2. **`backend/test/contracts/MatrixDeliveryEscrow.test.js`**
   - ✅ Imports `PAYMENT_CONFIG` from `paymentConfig.ts`
   - ✅ Uses `PAYMENT_CONFIG.COMMISSION_RATE * 10000` for test constant
   - ✅ All tests now use centralized configuration

### Before (Hardcoded):
```javascript
const commissionRate = 1500; // 15% in basis points ❌ Magic number
```

### After (Centralized):
```javascript
const { PAYMENT_CONFIG } = require('../config/paymentConfig.ts');
const commissionRate = PAYMENT_CONFIG.COMMISSION_RATE * 10000; // ✅ From config
```

## 🎯 Benefits:

1. **Single Source of Truth** - Change commission in one place (`paymentConfig.ts`)
2. **Consistency** - All payment methods (Paymob, Stripe, Crypto) use same rate
3. **Easy Updates** - Modify `PAYMENT_CONFIG.COMMISSION_RATE` to change everywhere
4. **Type Safety** - TypeScript ensures correct usage

## 📊 Commission Rate Sync:

| Component | Old Value | New Value | Source |
|-----------|-----------|-----------|--------|
| Paymob Service | `0.15` (hardcoded) | `PAYMENT_CONFIG.COMMISSION_RATE` | ✅ Config |
| Crypto Deployment | `1500` (hardcoded) | `PAYMENT_CONFIG.COMMISSION_RATE * 10000` | ✅ Config |
| Crypto Tests | `1500` (hardcoded) | `PAYMENT_CONFIG.COMMISSION_RATE * 10000` | ✅ Config |
| Smart Contract | `1500` (constructor param) | From deployment script | ✅ Config |

## 🔄 How to Change Commission Rate:

**Option 1: Edit Config File (Recommended)**
```typescript
// backend/config/paymentConfig.ts
export const PAYMENT_CONFIG = {
  COMMISSION_RATE: 0.12,              // Change to 12%
  COMMISSION_RATE_PERCENT: 12,        // Update display
  // ...
};
```

**Option 2: Environment Variable (Future)**
> [!NOTE]
> Not currently implemented. Use Option 1 (config file) instead.

## ⚠️ Important Notes:

1. **Smart Contract is Immutable** - Once deployed, the commission rate in the smart contract can only be changed via the `updateCommissionRate()` function (owner only)

2. **Redeployment** - If you change `PAYMENT_CONFIG.COMMISSION_RATE` and redeploy the smart contract, new contracts will use the new rate

3. **Existing Contracts** - For already deployed contracts, you must call `updateCommissionRate()` on-chain to sync with the new config

## 🧪 Testing:

Run crypto tests to verify:
```bash
cd backend
npx hardhat test test/contracts/MatrixDeliveryEscrow.test.js
```

All tests should pass with the centralized configuration! ✅
