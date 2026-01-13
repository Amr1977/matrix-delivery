# Bug Fix Report: Platform Wallet Update API Error

## 🐛 Issue Description

**Error**: `PUT http://localhost:5000/api/admin/topups/platform-wallets/1` returned 400 error:
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "paymentMethod",
      "message": "\"paymentMethod\" is not allowed"
    }
  ]
}
```

**Root Cause**: The frontend was sending `paymentMethod` field in wallet update requests, but the backend validation schema explicitly excludes this field from updates (which is correct - payment method should be immutable after creation).

## 🔍 Analysis

### Backend Validation (Correct)
In `backend/routes/adminTopups.js`, the `updateWalletSchema` (lines 108-125) correctly excludes `paymentMethod`:

```javascript
const updateWalletSchema = Joi.object({
  phoneNumber: Joi.string().trim().max(20).optional().allow(null, ''),
  instapayAlias: Joi.string().trim().max(100).optional().allow(null, ''),
  holderName: Joi.string().trim().min(1).max(100).optional(),
  dailyLimit: Joi.number().positive().optional(),
  monthlyLimit: Joi.number().positive().optional(),
  isActive: Joi.boolean().optional()
  // Note: paymentMethod is NOT included - it's immutable
});
```

### Frontend Issue (Fixed)
The frontend API service was using `Partial<WalletFormData & { isActive: boolean }>` which included `paymentMethod` from `WalletFormData`.

## ✅ Solution Implemented

### 1. Created New Type for Updates
**File**: `frontend/src/services/api/types.ts`

Added new `WalletUpdateData` interface that excludes `paymentMethod`:

```typescript
export interface WalletUpdateData {
    phoneNumber?: string;
    instapayAlias?: string;
    holderName?: string;
    dailyLimit?: number;
    monthlyLimit?: number;
    isActive?: boolean;
}
```

### 2. Updated API Service
**File**: `frontend/src/services/api/platformWallets.ts`

Changed the update method signature:

```typescript
// Before (incorrect)
update: async (
  id: number, 
  data: Partial<WalletFormData & { isActive: boolean }>
): Promise<UpdateWalletResponse>

// After (correct)
update: async (
  id: number, 
  data: WalletUpdateData
): Promise<UpdateWalletResponse>
```

### 3. Updated AdminWalletsPanel Component
**File**: `frontend/src/components/admin/AdminWalletsPanel.tsx`

#### Fixed Edit Wallet Handler:
```typescript
const handleEditWallet = async (formData: WalletFormData) => {
    if (!editingWallet) return;

    setFormLoading(true);
    try {
        // Exclude paymentMethod from update data since it's not allowed by backend
        const { paymentMethod, ...updateData } = formData;
        await platformWalletsApi.update(editingWallet.id, updateData);
        // ... rest of the function
    } catch (err: any) {
        throw new Error(err.message || 'Failed to update wallet');
    } finally {
        setFormLoading(false);
    }
};
```

#### Fixed Toggle Active Handler:
```typescript
const performToggleActive = async (wallet: PlatformWallet) => {
    try {
        const updateData: WalletUpdateData = {  // Changed type
            isActive: !wallet.isActive
        };
        await platformWalletsApi.update(wallet.id, updateData);
        // ... rest of the function
    } catch (err: any) {
        setError(err.message || 'Failed to update wallet status');
    } finally {
        setShowConfirmDeactivate(null);
    }
};
```

## 🧪 Testing

The fix ensures that:
1. **Create operations** still use `WalletFormData` (includes `paymentMethod`)
2. **Update operations** use `WalletUpdateData` (excludes `paymentMethod`)
3. **Type safety** prevents accidentally sending immutable fields
4. **Backend validation** passes without errors

## 📋 Files Modified

1. `frontend/src/services/api/types.ts` - Added `WalletUpdateData` interface
2. `frontend/src/services/api/platformWallets.ts` - Updated API method signature
3. `frontend/src/components/admin/AdminWalletsPanel.tsx` - Fixed update handlers

## ✅ Verification

The fix addresses the core issue by:
- ✅ Preventing `paymentMethod` from being sent in update requests
- ✅ Maintaining type safety with proper TypeScript interfaces
- ✅ Preserving the ability to update all other allowed fields
- ✅ Keeping create operations unchanged (they still need `paymentMethod`)

## 🎯 Impact

- **Wallet editing** now works without validation errors
- **Wallet activation/deactivation** works correctly
- **Type safety** improved with proper separation of create vs update data
- **Backend validation** alignment maintained

The Admin Wallet Management feature is now fully functional! 🚀