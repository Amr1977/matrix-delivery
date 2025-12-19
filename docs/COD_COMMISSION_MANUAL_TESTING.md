# COD Commission & Debt Management - Manual Testing Guide

## 📋 Overview

This guide provides step-by-step instructions for manually testing the COD commission and debt management system. Follow these test scenarios to verify all functionality is working correctly.

---

## ⚙️ Prerequisites

Before starting tests, ensure:
- ✅ Backend server is running
- ✅ Frontend is deployed/running
- ✅ Test database is accessible
- ✅ You have test accounts for:
  - Customer account
  - Driver account (with vehicle)
  - Admin account (optional, for monitoring)

---

## 🧪 Test Scenarios

### Test 1: Basic COD Order with Commission Deduction

**Objective:** Verify 15% commission is deducted from driver balance on COD order completion.

**Steps:**
1. **Setup:**
   - Login as driver
   - Note current balance (e.g., 500 EGP)
   - Logout

2. **Create Order:**
   - Login as customer
   - Create new order with:
     - Amount: 100 EGP
     - Payment method: Cash on Delivery (COD)
   - Publish order

3. **Accept & Deliver:**
   - Login as driver
   - Accept the order bid
   - Mark order as picked up
   - Mark order as delivered

4. **Confirm Payment:**
   - Confirm COD payment received (100 EGP cash)
   - System should process payment

5. **Verify Results:**
   - Go to Balance Dashboard
   - Check COD Earnings Summary shows:
     - Cash Collected: 100 EGP
     - Platform Commission (15%): -15 EGP
     - Net Earnings: 85 EGP
     - Current Balance: 485 EGP (500 - 15)

**Expected Result:** ✅ Balance reduced by 15 EGP (commission)

---

### Test 2: Debt Creation (Negative Balance)

**Objective:** Verify driver balance can go negative when commission exceeds available balance.

**Steps:**
1. **Setup:**
   - Login as driver
   - If balance is high, withdraw funds to leave only 10 EGP
   - Logout

2. **Create & Complete Order:**
   - Follow Test 1 steps to create and complete a 100 EGP COD order

3. **Verify Results:**
   - Go to Balance Dashboard
   - Check balance shows: -5 EGP
   - Verify "(Debt)" indicator appears next to balance
   - Check COD Earnings Summary shows:
     - Cash Collected: 100 EGP
     - Platform Commission (15%): -15 EGP
     - Net Earnings: 85 EGP
     - Current Balance: -5 EGP (Debt)

**Expected Result:** ✅ Balance goes negative, debt indicator shows

---

### Test 3: Warning Threshold (-150 EGP)

**Objective:** Verify warning notification appears when balance falls below -150 EGP.

**Steps:**
1. **Setup:**
   - Set driver balance to -140 EGP (use admin tools or complete multiple orders)

2. **Complete Order:**
   - Create and complete a 100 EGP COD order
   - Commission: 15 EGP
   - New balance: -155 EGP

3. **Verify Results:**
   - Go to Balance Dashboard
   - Check for warning box with message:
     "⚠️ Your balance is low. Please deposit funds to continue accepting orders."
   - Verify warning box has yellow/orange styling
   - Confirm driver can still accept new orders

**Expected Result:** ✅ Warning displays, driver can still work

---

### Test 4: Blocking Threshold (-200 EGP)

**Objective:** Verify driver is blocked from accepting orders at -200 EGP debt.

**Steps:**
1. **Setup:**
   - Set driver balance to exactly -200 EGP

2. **Try to Accept Order:**
   - Login as customer, create new order
   - Login as driver
   - Try to accept/bid on the order

3. **Verify Results:**
   - Bid acceptance should FAIL
   - Error message should appear:
     "Cannot accept order: Balance (-200 EGP) below minimum threshold (-200 EGP). Please deposit funds to continue accepting orders."
   - Go to Balance Dashboard
   - Check for critical error box:
     "🚫 You cannot accept new orders until your balance is above -200 EGP."
   - Verify "Deposit Now" button is visible

**Expected Result:** ✅ Driver blocked at exactly -200 EGP

---

### Test 5: Excessive Debt Blocking

**Objective:** Verify driver with debt > -200 EGP cannot accept orders.

**Steps:**
1. **Setup:**
   - Set driver balance to -250 EGP (or any value < -200)

2. **Try to Accept Order:**
   - Create new order as customer
   - Try to accept as driver

3. **Verify Results:**
   - Bid acceptance fails
   - Error message shows current balance and threshold
   - Critical warning box appears on dashboard
   - Driver cannot bypass restriction

**Expected Result:** ✅ Driver completely blocked from new orders

---

### Test 6: Debt Recovery

**Objective:** Verify driver can deposit funds to clear debt and resume accepting orders.

**Steps:**
1. **Setup:**
   - Driver balance at -250 EGP (blocked)
   - Verify driver cannot accept orders

2. **Deposit Funds:**
   - Go to Balance Dashboard
   - Click "Deposit Now" button (or use deposit form)
   - Deposit 300 EGP
   - Confirm deposit

3. **Verify Recovery:**
   - Check new balance: 50 EGP (positive)
   - Verify warning/error boxes disappear
   - Try to accept a new order
   - Bid acceptance should SUCCEED

**Expected Result:** ✅ Driver can work again after deposit

---

### Test 7: Multiple Orders Debt Accumulation

**Objective:** Verify debt accumulates correctly from multiple COD orders.

**Steps:**
1. **Setup:**
   - Driver balance: 0 EGP

2. **Complete 5 Orders:**
   - Create and complete 5 separate COD orders
   - Each order: 100 EGP
   - Total cash collected: 500 EGP
   - Total commission: 75 EGP (5 × 15)

3. **Verify Results:**
   - Final balance: -75 EGP
   - COD Earnings Summary shows:
     - Cash Collected: 500 EGP
     - Platform Commission (15%): -75 EGP
     - Net Earnings: 425 EGP
     - Current Balance: -75 EGP (Debt)
   - Driver can still accept orders (above -200 threshold)

**Expected Result:** ✅ Debt accumulates correctly

---

### Test 8: Realistic Daily Scenario

**Objective:** Test a realistic driver workday with mixed balance states.

**Steps:**
1. **Morning - Starting Balance:**
   - Driver starts with 50 EGP

2. **Complete 10 Orders:**
   - Order amounts: 80, 120, 95, 150, 75, 110, 85, 130, 90, 100 EGP
   - Total: 1,035 EGP
   - Total commission: 155.25 EGP (15%)

3. **Verify End of Day:**
   - Final balance: -105.25 EGP (50 - 155.25)
   - Cash in hand: 1,035 EGP
   - Net earnings: 879.75 EGP (1,035 - 155.25)
   - Driver shows debt but can still work (above -200)
   - Warning appears (below -150)

**Expected Result:** ✅ All calculations correct, driver functional

---

### Test 9: Threshold Edge Case (Exactly -200 EGP)

**Objective:** Verify blocking happens at EXACTLY -200 EGP (not -201).

**Steps:**
1. **Setup:**
   - Driver balance: 0 EGP

2. **Create Debt to -199 EGP:**
   - Complete orders to reach -199 EGP
   - Verify driver CAN accept orders

3. **Push to -200 EGP:**
   - Complete one more small order to reach exactly -200 EGP

4. **Verify Blocking:**
   - Try to accept new order
   - Should be BLOCKED
   - Error message should show -200 EGP threshold

**Expected Result:** ✅ Blocking at exactly -200, not before

---

### Test 10: Balance Dashboard UI

**Objective:** Verify all UI elements display correctly.

**Steps:**
1. **Complete COD Order:**
   - Complete at least one COD order

2. **Check Dashboard Elements:**
   - ✅ COD Earnings Summary section visible
   - ✅ Cash Collected shows correct amount
   - ✅ Platform Commission shows -15% with minus sign
   - ✅ Net Earnings highlighted/emphasized
   - ✅ Current Balance shows with debt indicator if negative
   - ✅ Warning box appears at < -150 EGP
   - ✅ Error box appears at ≤ -200 EGP
   - ✅ Deposit button visible when blocked
   - ✅ All amounts formatted correctly (EGP)
   - ✅ Colors appropriate (red for negative, green for positive)

**Expected Result:** ✅ All UI elements present and styled correctly

---

## 🔍 Verification Checklist

After completing all tests, verify:

### Backend
- [ ] Commission calculated correctly (15%)
- [ ] Balance can go negative
- [ ] Debt tracked in database
- [ ] Order blocking works at -200 EGP
- [ ] Deposits clear debt
- [ ] All transactions logged

### Frontend
- [ ] Earnings summary displays
- [ ] Commission shown separately
- [ ] Debt indicator appears
- [ ] Warning at -150 EGP
- [ ] Critical alert at -200 EGP
- [ ] Deposit button functional
- [ ] All amounts formatted correctly

### Business Logic
- [ ] Drivers keep 85% of COD orders
- [ ] Platform collects 15% commission
- [ ] Drivers blocked at -200 EGP debt
- [ ] Warning sent at -150 EGP
- [ ] Debt recovery works
- [ ] No bypass possible

---

## 🐛 Common Issues & Troubleshooting

### Issue: Commission not deducted
**Check:**
- Payment method is "COD"
- Order status is "delivered"
- Payment confirmation completed
- Backend logs for errors

### Issue: Driver not blocked at -200 EGP
**Check:**
- Balance is exactly ≤ -200 (not -199)
- `canAcceptOrders()` being called
- Frontend checking balance correctly
- Cache cleared

### Issue: Warning not showing
**Check:**
- Balance is < -150 EGP
- Dashboard refreshed
- Component rendering correctly
- CSS loaded

### Issue: Earnings not displaying
**Check:**
- Driver has completed COD orders
- API endpoint `/api/payments/earnings` working
- Data fetched successfully
- Check browser console for errors

---

## 📊 Test Data Reference

### Sample Balances for Testing
- **Positive:** 500 EGP (normal operation)
- **Low:** 10 EGP (will create debt)
- **Warning:** -175 EGP (warning threshold)
- **Threshold:** -200 EGP (blocking point)
- **Blocked:** -250 EGP (cannot work)

### Sample Order Amounts
- **Small:** 50 EGP (commission: 7.50 EGP)
- **Medium:** 100 EGP (commission: 15 EGP)
- **Large:** 200 EGP (commission: 30 EGP)

### Expected Commission Calculations
| Order Amount | Commission (15%) | Driver Keeps (85%) |
|--------------|------------------|-------------------|
| 50 EGP       | 7.50 EGP        | 42.50 EGP        |
| 100 EGP      | 15 EGP          | 85 EGP           |
| 150 EGP      | 22.50 EGP       | 127.50 EGP       |
| 200 EGP      | 30 EGP          | 170 EGP          |
| 500 EGP      | 75 EGP          | 425 EGP          |

---

## ✅ Sign-Off

After completing all tests:

**Tester Name:** ___________________  
**Date:** ___________________  
**Environment:** [ ] Development [ ] Staging [ ] Production  
**Overall Status:** [ ] Pass [ ] Fail  

**Notes:**
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

---

## 📞 Support

If you encounter issues during testing:
- Check backend logs: `pm2 logs backend`
- Check browser console for frontend errors
- Verify database state: `SELECT * FROM user_balances WHERE user_id = [driver_id]`
- Review transaction history: `SELECT * FROM balance_transactions WHERE user_id = [driver_id]`

**Contact:** Development Team
