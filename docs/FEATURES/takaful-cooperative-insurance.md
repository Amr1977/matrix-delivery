# Takaful (تأمين تكافلي) Cooperative Insurance System

> **Milestone Document** - A cooperative insurance system for Matrix Delivery couriers, funded by 5% contribution from each delivery. Provides comprehensive benefits including health, pension, loans, equipment coverage, and emergency vehicle services.

*Created: 2026-01-04*

---

## Table of Contents

1. [Overview](#overview)
2. [Commission Structure](#commission-structure)
3. [Takaful Benefits](#takaful-benefits)
4. [Fund Management](#fund-management)
5. [Database Schema](#database-schema)
6. [API Endpoints](#api-endpoints)
7. [Implementation Checklist](#implementation-checklist)

---

## Overview

### What is Takaful?

**Takaful (تأمين تكافلي)** is a cooperative Islamic insurance model where participants contribute to a common fund that provides mutual financial assistance in times of need. Unlike conventional insurance, Takaful is based on:

- **Mutual cooperation** (التعاون)
- **Shared responsibility** (التكافل)
- **No interest** (لا ربا)

### Why Takaful for Couriers?

Delivery couriers face unique risks:
- Health emergencies during work
- Vehicle breakdowns
- Equipment damage
- Financial hardships

A cooperative fund ensures that all couriers are protected while maintaining fairness and transparency.

---

## Commission Structure

### Total Deduction: 15%

```
┌─────────────────────────────────────────────────────┐
│ DELIVERY FEE BREAKDOWN                              │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Platform Commission: 10%                            │
│ ├── Platform operations                             │
│ ├── Technology infrastructure                       │
│ ├── Customer support                                │
│ └── Marketing & growth                              │
│                                                     │
│ Takaful Contribution: 5%                            │
│ ├── Health insurance (تأمين صحي)                   │
│ ├── Pension fund (معاشات)                          │
│ ├── Interest-free loans (قروض حسنة)                │
│ ├── Equipment insurance (تأمين معدات)              │
│ ├── Approved mechanics (ميكانيكية معتمدين)         │
│ ├── Mobile mechanic (خدمة الميكانيكي المتنقل)      │
│ └── Emergency tricycle (خدمة تروسيكل الطوارئ)      │
│                                                     │
│ TOTAL DEDUCTION: 15%                                │
│ COURIER RECEIVES: 85%                               │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Example Calculation

| Order Delivery Fee | 100 EGP |
|-------------------|---------|
| Platform (10%) | - 10 EGP |
| Takaful (5%) | - 5 EGP |
| **Courier Receives** | **85 EGP** |

---

## Takaful Benefits

### Category A: Health & Wellness (الصحة و العافية)

#### 1. Health Insurance (تأمين صحي)

| Coverage | Description |
|----------|-------------|
| Medical Expenses | Coverage for illness and injuries |
| Work Accidents | Emergency treatment during delivery |
| Hospitalization | In-patient care coverage |
| Medications | Prescription drug coverage |

#### 2. Gym Memberships (اشتراكات جيم)

| Feature | Description |
|---------|-------------|
| Partner Gyms | Discounted/free memberships |
| Fitness Classes | Access to group workouts |
| Health Monitoring | Regular health checkups |

#### 3. Self-Defense Courses (دورات دفاع عن النفس)

| Feature | Description |
|---------|-------------|
| Certified Training | Professional self-defense courses |
| Personal Safety | Protection during night deliveries |
| Situational Awareness | Threat recognition training |

---

### Category B: Financial Security (الأمان المالي)

#### 4. Pension Fund (معاشات)

| Feature | Description |
|---------|-------------|
| Monthly Contribution | Portion of Takaful goes to retirement |
| Retirement Payout | Available after X years of service |
| Disability Pension | If courier cannot work |

#### 5. Interest-Free Loans (قروض حسنة)

> **Gold-Indexed System**: Loans are calculated and repaid in equivalent grams of 24-karat gold to protect against inflation.

| Feature | Description |
|---------|-------------|
| Emergency Loans | Quick access in hardship |
| Vehicle Loans | For purchasing/repairing vehicles |
| Personal Loans | Family emergencies |
| **Loan Value** | Converted to grams of 24k gold |
| **Repayment** | In gold-equivalent EGP at time of payment |

**Example:**
```
Loan: 10,000 EGP when gold = 2,000 EGP/gram
      = 5 grams of 24k gold

Repayment after 6 months when gold = 2,200 EGP/gram:
      = 5 grams × 2,200 = 11,000 EGP

This protects the fund from inflation while
providing fair, interest-free financing.
```

#### 6. Educational Grants & Loans (منح و قروض تعليمية)

| Type | Description |
|------|-------------|
| Educational Grants | Financial aid for courier's education |
| Children Education | Support for courier's children schooling |
| Skill Development | Professional certification courses |
| Loan Option | Gold-indexed educational loans |

---

### Category C: Life Events (مناسبات الحياة)

#### 7. Marriage Bonus (مكافأة زواج)

| Feature | Description |
|---------|-------------|
| Cash Gift | One-time payment on marriage |
| Eligibility | Active courier for 6+ months |
| Amount | Based on contribution history |

#### 8. Newborn Bonus (مكافأة مولود)

| Feature | Description |
|---------|-------------|
| Baby Gift | Cash payment on child birth |
| Supplies Support | Baby essentials package |
| Eligibility | Active courier for 6+ months |

#### 9. Death Compensation (تعويضات وفيات)

| Coverage | Description |
|----------|-------------|
| Courier Death | Payment to family |
| Funeral Expenses | Coverage for burial costs |
| Family Support | Ongoing support for dependents |

---

### Category D: Professional Development (التطوير المهني)

#### 10. Professional Driving Courses (دورات قيادة احترافية معتمدة)

| Feature | Description |
|---------|-------------|
| Certified Training | Road safety & defensive driving |
| License Upgrades | Support for license categories |
| Traffic Law | Understanding regulations |

#### 11. Vehicle Maintenance Training (دورات تعليم صيانة مركبات)

| Vehicle Type | Training Covers |
|--------------|-----------------|
| Motorcycle (موتوسيكل) | Basic repairs, maintenance |
| Tricycle (تروسيكل) | Specialized 3-wheeler care |
| Car (سيارة) | Automotive fundamentals |
| All Vehicles | General mechanical skills |

---

### Category E: Vehicle & Equipment (المركبات و المعدات)

#### 12. Equipment Insurance (تأمين معدات)

| Coverage | Description |
|---------|-------------|
| Phone Damage | Screen repair, water damage |
| Delivery Bags | Damaged/lost thermal bags |
| GPS Devices | Tracker replacements |
| Partner Merchants | Discounts at approved vendors |

#### 13. Approved Mechanics (ميكانيكية معتمدين)

| Feature | Description |
|---------|-------------|
| Partner Network | Vetted mechanics across the city |
| Discounted Rates | 20-30% off standard prices |
| Quality Guarantee | Work backed by platform |
| Priority Service | Faster turnaround for couriers |

#### 14. Mobile Mechanic Service (خدمة الميكانيكي المتنقل)

| Feature | Description |
|---------|-------------|
| On-Location Repair | Mechanic comes to courier |
| Basic Repairs | Tire change, battery jump, chain |
| 24/7 Availability | Emergency support any time |
| Response Time | Target: 30 minutes |

#### 15. Emergency Tricycle Service (خدمة تروسيكل الطوارئ)

| Feature | Description |
|---------|-------------|
| Vehicle Breakdown | Tricycle picks up courier + package |
| Continues Delivery | Courier can complete order |
| Transports Vehicle | Tricycle tows/carries motorcycle |
| Available Areas | Major city zones |

---

## Fund Management

### Takaful Fund Balance

```
┌─────────────────────────────────────────────────────┐
│ TAKAFUL FUND DASHBOARD                              │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Current Balance:        150,000 EGP                 │
│ Total Contributions:    500,000 EGP                 │
│ Total Payouts:         350,000 EGP                  │
│                                                     │
│ Monthly Breakdown:                                  │
│ ├── Health Claims:      50,000 EGP                  │
│ ├── Loans Disbursed:    30,000 EGP                  │
│ ├── Mechanic Services:  15,000 EGP                  │
│ ├── Emergency Transfers: 5,000 EGP                  │
│ └── Admin Costs:         5,000 EGP                  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Fund Thresholds

| Level | Balance | Action |
|-------|---------|--------|
| Healthy | > 100,000 EGP | Normal operations |
| Warning | 50,000 - 100,000 | Alert admin |
| Critical | < 50,000 | Limit non-essential claims |

### Transparency

- Monthly reports published to all couriers
- Annual audit by independent party
- Courier representatives on oversight committee

---

## Database Schema

### Commission Configuration

```sql
CREATE TABLE commission_config (
  id SERIAL PRIMARY KEY,
  platform_rate DECIMAL(5,4) DEFAULT 0.10,  -- 10%
  takaful_rate DECIMAL(5,4) DEFAULT 0.05,   -- 5%
  effective_from DATE DEFAULT CURRENT_DATE,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Takaful Fund

```sql
CREATE TABLE takaful_fund (
  id SERIAL PRIMARY KEY,
  balance DECIMAL(12,2) DEFAULT 0,
  total_contributions DECIMAL(12,2) DEFAULT 0,
  total_payouts DECIMAL(12,2) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to update on each contribution/payout
CREATE OR REPLACE FUNCTION update_takaful_balance()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE takaful_fund SET 
    balance = balance + NEW.amount,
    total_contributions = total_contributions + GREATEST(NEW.amount, 0),
    total_payouts = total_payouts + GREATEST(-NEW.amount, 0),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Contributions

```sql
CREATE TABLE takaful_contributions (
  id SERIAL PRIMARY KEY,
  courier_id TEXT REFERENCES users(id),
  order_id TEXT REFERENCES orders(id),
  amount DECIMAL(10,2) NOT NULL,
  delivery_fee DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_takaful_contributions_courier ON takaful_contributions(courier_id);
CREATE INDEX idx_takaful_contributions_date ON takaful_contributions(created_at);
```

### Benefit Claims

```sql
CREATE TABLE takaful_claims (
  id SERIAL PRIMARY KEY,
  courier_id TEXT REFERENCES users(id),
  
  -- Claim Type
  claim_type TEXT NOT NULL,
    -- 'health', 'loan', 'mechanic', 'mobile_mechanic', 
    -- 'tricycle', 'equipment', 'emergency_transfer'
  
  -- Details
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  evidence_urls TEXT[],  -- Photos, receipts, etc.
  
  -- Processing
  status TEXT DEFAULT 'pending',
    -- 'pending', 'approved', 'paid', 'rejected'
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

CREATE INDEX idx_takaful_claims_courier ON takaful_claims(courier_id);
CREATE INDEX idx_takaful_claims_status ON takaful_claims(status);
```

### Interest-Free Loans (Gold-Indexed)

```sql
-- Gold price tracking
CREATE TABLE gold_prices (
  id SERIAL PRIMARY KEY,
  price_per_gram DECIMAL(10,2) NOT NULL,  -- 24k gold in EGP
  recorded_at DATE UNIQUE DEFAULT CURRENT_DATE,
  source TEXT  -- 'central_bank', 'market', 'manual'
);

CREATE TABLE takaful_loans (
  id SERIAL PRIMARY KEY,
  courier_id TEXT REFERENCES users(id),
  
  -- Loan Details (Gold-Indexed)
  principal_egp DECIMAL(10,2) NOT NULL,       -- Original amount in EGP
  principal_gold_grams DECIMAL(10,4) NOT NULL, -- Converted to 24k gold grams
  gold_price_at_loan DECIMAL(10,2) NOT NULL,   -- Gold price when loan taken
  
  remaining_gold_grams DECIMAL(10,4),          -- Balance in gold grams
  monthly_deduction_gold DECIMAL(10,4),        -- Monthly payment in gold grams
  
  purpose TEXT,
  loan_type TEXT, -- 'emergency', 'vehicle', 'educational', 'personal'
  
  -- Status
  status TEXT DEFAULT 'pending',
    -- 'pending', 'active', 'paid', 'defaulted'
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Track loan repayments (in current gold price)
CREATE TABLE takaful_loan_payments (
  id SERIAL PRIMARY KEY,
  loan_id INTEGER REFERENCES takaful_loans(id),
  order_id TEXT REFERENCES orders(id),
  
  -- Payment in gold equivalent
  gold_grams_paid DECIMAL(10,4),
  gold_price_at_payment DECIMAL(10,2),
  egp_amount DECIMAL(10,2),  -- Actual EGP = gold_grams × current_price
  
  remaining_gold_grams DECIMAL(10,4),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Benefit Claims

```sql
CREATE TABLE takaful_claims (
  id SERIAL PRIMARY KEY,
  courier_id TEXT REFERENCES users(id),
  
  -- Claim Type (expanded)
  claim_type TEXT NOT NULL,
    -- Health & Wellness
    -- 'health', 'gym', 'self_defense'
    -- 
    -- Financial
    -- 'loan', 'educational_grant', 'educational_loan'
    --
    -- Life Events  
    -- 'marriage_bonus', 'newborn_bonus', 'death_compensation'
    --
    -- Professional Development
    -- 'driving_course', 'maintenance_training'
    --
    -- Vehicle & Equipment
    -- 'mechanic', 'mobile_mechanic', 'tricycle', 'equipment'
    -- 
    -- Emergency
    -- 'emergency_transfer'
  
  -- Details
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  evidence_urls TEXT[],  -- Photos, receipts, certificates
  
  -- For life events
  event_date DATE,
  beneficiary_name TEXT,
  
  -- Processing
  status TEXT DEFAULT 'pending',
    -- 'pending', 'approved', 'paid', 'rejected'
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

CREATE INDEX idx_takaful_claims_courier ON takaful_claims(courier_id);
CREATE INDEX idx_takaful_claims_status ON takaful_claims(status);
CREATE INDEX idx_takaful_claims_type ON takaful_claims(claim_type);
```

---

## API Endpoints

### Get Courier's Takaful Summary

```
GET /api/takaful/summary
Authorization: Bearer <token>

Response:
{
  totalContributed: 1500.00,
  benefitsUsed: 500.00,
  availableLoanLimit: 2000.00,
  activeLoan: {
    remaining: 800.00,
    monthlyDeduction: 100.00
  },
  recentClaims: [...]
}
```

### Submit Claim

```
POST /api/takaful/claims
Authorization: Bearer <token>
Body: {
  type: "mechanic",
  amount: 250.00,
  description: "Motorcycle chain replacement",
  evidenceUrls: ["https://..."]
}

Response:
{
  claimId: "claim-123",
  status: "pending",
  estimatedReviewTime: "24 hours"
}
```

### Request Loan

```
POST /api/takaful/loans
Authorization: Bearer <token>
Body: {
  amount: 1000.00,
  purpose: "Vehicle repair",
  preferredMonthlyDeduction: 100.00
}

Response:
{
  loanId: "loan-456",
  status: "pending",
  message: "Your loan request is being reviewed"
}
```

---

## Implementation Checklist

### Phase 1: Commission System
- [ ] Add `takaful_contribution` column to order transactions
- [ ] Update `balanceService.deductCommission` for 10% + 5%
- [ ] Create commission breakdown in courier earnings view
- [ ] Show Takaful contribution on order completion

### Phase 2: Fund Infrastructure
- [ ] Create takaful_fund table
- [ ] Create takaful_contributions table
- [ ] Create takaful_claims table
- [ ] Implement fund balance triggers
- [ ] Admin dashboard for fund overview

### Phase 3: Courier Benefits UI
- [ ] Takaful summary page for couriers
- [ ] Show total contributions
- [ ] Show benefits used
- [ ] Claims submission form
- [ ] Claims history view

### Phase 4: Loans System
- [ ] Create takaful_loans table
- [ ] Loan application form
- [ ] Loan approval workflow (admin)
- [ ] Auto-deduction from earnings
- [ ] Payment tracking

### Phase 5: Emergency Services
- [ ] Partner mechanic network integration
- [ ] Mobile mechanic dispatch system
- [ ] Emergency tricycle dispatch
- [ ] Track service usage

---

*This document represents a milestone in Matrix Delivery's commitment to courier welfare through cooperative mutual support.*
