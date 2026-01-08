# Driver Cash Balance Management - Implementation Context

**Date**: 2026-01-08  
**Status**: Partially Implemented - Needs API & Frontend Completion

---

## Current Implementation Status

### ✅ What's Already Implemented

#### 1. Database Schema

- **Location**: `backend/migrations/20260104_emergency_transfer.sql`
- **Column**: `users.available_cash DECIMAL(10,2) DEFAULT 0`
- **Purpose**: Tracks cash driver has available for upfront payments

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS available_cash DECIMAL(10,2) DEFAULT 0;
COMMENT ON COLUMN users.available_cash IS 'Cash the driver has available for upfront payments';
```

#### 2. Backend Usage (Emergency Transfer)

- **File**: `backend/services/emergencyTransferService.js`
- **Lines**: 149, 154, 261, 265
- **File**: `backend/routes/emergency.js`
- **Lines**: 57, 61

**Current Queries**:

```javascript
// Finding drivers with sufficient cash
SELECT u.id, u.name, u.available_cash, u.last_lat, u.last_lng
FROM users u
WHERE u.primary_role = 'driver'
  AND u.available_cash >= $2  -- Filters by upfront payment amount

// Checking driver's cash before assignment
SELECT available_cash FROM users WHERE id = $1
const driverCash = parseFloat(driverResult.rows[0]?.available_cash) || 0;
```

#### 3. BDD Test Specification

- **File**: `tests/features/backend/courier_cash_registry.feature`
- **Test Scenarios**:
  - `@CCR-001`: Driver sets available cash in profile
  - `@CCR-002`: Driver updates available cash
  - `@CCR-003`: Orders filtered by courier cash capacity
  - `@CCR-004`: Orders also filtered by distance
  - `@CCR-005`: Zero upfront orders visible to all

---

## ❌ What's Missing

### 1. API Endpoints (PRIORITY: HIGH)

**Need to Add to** `backend/routes/users.js`:

```javascript
/**
 * GET /api/users/me/cash-balance
 * Get driver's available cash balance (driver-only)
 */
router.get("/me/cash-balance", verifyToken, async (req, res, next) => {
  try {
    // Verify user is a driver
    const result = await pool.query(
      "SELECT available_cash, primary_role, granted_roles FROM users WHERE id = $1",
      [req.user.userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = result.rows[0];
    const isDriver =
      user.primary_role === "driver" ||
      (user.granted_roles && user.granted_roles.includes("driver"));

    if (!isDriver) {
      return res
        .status(403)
        .json({ error: "Only drivers can access cash balance" });
    }

    res.json({
      availableCash: parseFloat(user.available_cash) || 0,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/users/me/cash-balance
 * Update driver's available cash balance (driver-only)
 */
router.put("/me/cash-balance", verifyToken, async (req, res, next) => {
  try {
    const { availableCash } = req.body;

    // Validation
    if (typeof availableCash !== "number" || availableCash < 0) {
      return res.status(400).json({
        error: "Available cash must be a positive number",
      });
    }

    // Verify user is a driver
    const userCheck = await pool.query(
      "SELECT primary_role, granted_roles FROM users WHERE id = $1",
      [req.user.userId],
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = userCheck.rows[0];
    const isDriver =
      user.primary_role === "driver" ||
      (user.granted_roles && user.granted_roles.includes("driver"));

    if (!isDriver) {
      return res.status(403).json({
        error: "Only drivers can update cash balance",
      });
    }

    // Update available cash
    const result = await pool.query(
      "UPDATE users SET available_cash = $1 WHERE id = $2 RETURNING available_cash",
      [availableCash, req.user.userId],
    );

    logger.info("Driver updated available cash", {
      userId: req.user.userId,
      availableCash,
      category: "driver",
    });

    res.json({
      availableCash: parseFloat(result.rows[0].available_cash),
    });
  } catch (error) {
    next(error);
  }
});
```

**Alternative Approach**: Add to existing profile endpoints:

```javascript
// In GET /api/users/me/profile (line 196)
// Add to SELECT query:
available_cash,  // Add this line after line 217

// In PUT /api/users/me/profile (line 240)
// Add to allowed updates for drivers (after line 262):
if (isDriver && typeof req.body.available_cash === 'number') {
  updates.push(`available_cash = $${i++}`);
  params.push(req.body.available_cash);
}
```

### 2. Frontend UI Components (PRIORITY: MEDIUM)

**Need to Create**:

#### Component: `frontend/src/components/driver/CashBalanceCard.jsx`

```jsx
import React, { useState, useEffect } from "react";
import axios from "axios";

const CashBalanceCard = () => {
  const [availableCash, setAvailableCash] = useState(0);
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCashBalance();
  }, []);

  const fetchCashBalance = async () => {
    try {
      const response = await axios.get("/api/users/me/cash-balance");
      setAvailableCash(response.data.availableCash);
      setInputValue(response.data.availableCash.toString());
    } catch (error) {
      console.error("Failed to fetch cash balance:", error);
    }
  };

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const response = await axios.put("/api/users/me/cash-balance", {
        availableCash: parseFloat(inputValue),
      });
      setAvailableCash(response.data.availableCash);
      setEditing(false);
    } catch (error) {
      alert("Failed to update cash balance");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cash-balance-card">
      <h3>Available Cash for Upfront Payments</h3>
      {!editing ? (
        <div>
          <p className="cash-amount">{availableCash.toFixed(2)} EGP</p>
          <button onClick={() => setEditing(true)}>Update Cash</button>
        </div>
      ) : (
        <div>
          <input
            type="number"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            min="0"
            step="0.01"
          />
          <button onClick={handleUpdate} disabled={loading}>
            {loading ? "Saving..." : "Save"}
          </button>
          <button onClick={() => setEditing(false)}>Cancel</button>
        </div>
      )}
      <p className="help-text">
        Set how much cash you have available for orders requiring upfront
        payment. Only orders within your cash capacity will be shown.
      </p>
    </div>
  );
};

export default CashBalanceCard;
```

**Where to Add**:

- Driver profile page (`frontend/src/pages/ProfilePage.js`)
- Driver settings/preferences section

### 3. Order Filtering Logic (PRIORITY: HIGH)

**Need to Update** `backend/services/orderService.js`:

In the `getOrders` method for drivers (around line 241), add cash filtering:

```javascript
// After distance filtering (line 261), add:
if (filters.driverCash !== undefined && filters.driverCash >= 0) {
  locationConditions += ` AND (o.upfront_payment IS NULL OR o.upfront_payment <= $${filterParams.length + 2})`;
  filterParams.push(filters.driverCash);

  logger.info("Cash capacity filter applied", {
    driverCash: filters.driverCash,
    category: "orders",
  });
}
```

**Update** `backend/routes/orders.js`:

```javascript
// In GET '/' route (line 12), fetch driver's available_cash:
if ((req.user.primary_role || req.user.role) === "driver") {
  // Fetch driver's available cash
  const cashResult = await pool.query(
    "SELECT available_cash FROM users WHERE id = $1",
    [req.user.userId],
  );

  if (cashResult.rows.length > 0) {
    filters.driverCash = parseFloat(cashResult.rows[0].available_cash) || 0;
  }

  // Then proceed with existing location filtering...
}
```

### 4. BDD Test Implementation (PRIORITY: LOW)

**Need to Create**: Step definitions for `courier_cash_registry.feature`

**File**: `tests/step_definitions/api/courier_cash_registry_steps.js`

```javascript
const { Given, When, Then } = require("@cucumber/cucumber");
const axios = require("axios");
const { expect } = require("chai");

Given("driver {string} has no cash registered", async function (driverName) {
  await this.updateDriverCash(driverName, 0);
});

Given(
  "driver {string} has {int} EGP available cash",
  async function (driverName, amount) {
    await this.updateDriverCash(driverName, amount);
  },
);

When("driver updates available cash to {int} EGP", async function (amount) {
  const response = await axios.put(
    `${this.baseURL}/api/users/me/cash-balance`,
    { availableCash: amount },
    { headers: { Authorization: `Bearer ${this.driverToken}` } },
  );
  this.lastResponse = response;
});

Then("driver's available cash should be {int} EGP", async function (amount) {
  const response = await axios.get(
    `${this.baseURL}/api/users/me/cash-balance`,
    { headers: { Authorization: `Bearer ${this.driverToken}` } },
  );
  expect(response.data.availableCash).to.equal(amount);
});

// Add more step definitions for order filtering scenarios...
```

---

## Implementation Priority

### Phase 1: Core API (1-2 hours)

1. ✅ Add GET `/api/users/me/cash-balance` endpoint
2. ✅ Add PUT `/api/users/me/cash-balance` endpoint
3. ✅ Add validation and driver-only checks
4. ✅ Test endpoints with Postman/curl

### Phase 2: Order Filtering (2-3 hours)

1. ✅ Update `orderService.getOrders()` to filter by cash capacity
2. ✅ Update orders router to fetch driver's available_cash
3. ✅ Test filtering logic with different upfront payment amounts
4. ✅ Verify emergency transfer integration still works

### Phase 3: Frontend UI (3-4 hours)

1. ✅ Create `CashBalanceCard` component
2. ✅ Add to driver profile page
3. ✅ Add to driver settings/preferences
4. ✅ Test UI updates and API integration
5. ✅ Add appropriate styling

### Phase 4: Testing (2-3 hours)

1. ✅ Implement BDD step definitions
2. ✅ Run courier_cash_registry.feature tests
3. ✅ Write unit tests for API endpoints
4. ✅ Test E2E flow: set cash → view filtered orders

---

## Database Verification Queries

```sql
-- Check current schema
\d users

-- View available_cash for drivers
SELECT id, name, primary_role, available_cash
FROM users
WHERE primary_role = 'driver';

-- Check if column exists
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'available_cash';

-- Test update
UPDATE users SET available_cash = 500.00 WHERE id = 'test_driver_id';
```

---

## Related Files

### Backend

- `backend/routes/users.js` - Need to add endpoints
- `backend/services/orderService.js` - Need to add filtering logic
- `backend/routes/orders.js` - Need to fetch driver cash
- `backend/services/emergencyTransferService.js` - Already uses available_cash
- `backend/routes/emergency.js` - Already uses available_cash
- `backend/migrations/20260104_emergency_transfer.sql` - Column definition

### Frontend

- `frontend/src/components/driver/CashBalanceCard.jsx` - Create new
- `frontend/src/pages/ProfilePage.js` - Add component here

### Tests

- `tests/features/backend/courier_cash_registry.feature` - Already exists
- `tests/step_definitions/api/courier_cash_registry_steps.js` - Need to create

---

## Notes & Considerations

1. **Security**: Ensure only drivers can update their cash balance
2. **Validation**: Prevent negative values
3. **UI/UX**: Make it clear this is for upfront payments, not wallet balance
4. **Order Visibility**: Orders with `upfront_payment = 0` or `NULL` should be visible to all drivers regardless of available_cash
5. **Real-time Updates**: Consider if driver's available_cash should decrease when they accept an order with upfront payment
6. **Multiple Orders**: Handle case where driver has multiple active orders with upfront payments

---

## Quick Start Commands

```bash
# View the migration
cat backend/migrations/20260104_emergency_transfer.sql

# Check BDD tests
cat tests/features/backend/courier_cash_registry.feature

# Run specific BDD test
npm run test:bdd -- --tags @courier_cash_registry

# Test API endpoint (after implementation)
curl -X GET http://localhost:5000/api/users/me/cash-balance \
  -H "Authorization: Bearer YOUR_TOKEN"

curl -X PUT http://localhost:5000/api/users/me/cash-balance \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"availableCash": 500.00}'
```

---

## Contact Context from Current Session

**Previous Work Completed**:

- ✅ Fixed review submission null user_id error (commit: 37c1961)
- ✅ Created order review system documentation
- ✅ E2E tests passing (1 scenario, 22 steps)
- ✅ All changes committed and pushed to master

**Conversation Date**: 2026-01-08
**Status**: Ready to implement driver cash balance management
