# Matrix Delivery - Planning Documents

This directory contains planning documents and design proposals for future features.

## Documents

### Architecture Remediation Plan
**File:** `2026-03-26_ARCHITECTURE_REMEDIATION_PLAN.md`  
**Date:** March 26, 2026  
**Status:** Active  
**Effort:** 16-week phased program  

Program-level refactor roadmap focused on strangler migration, safety gates, and architecture consistency.

### Architecture Remediation Progress Tracker
**File:** `2026-03-26_ARCHITECTURE_REMEDIATION_PROGRESS.md`  
**Date:** March 26, 2026  
**Status:** Active  

Living checklist and dated implementation log for tracking refactor execution.

---

### Order State Enhancement Plan
**File:** `2025-12-09_order-state-enhancement-plan.md`  
**Date:** December 9, 2025  
**Status:** Pending Approval  
**Effort:** 12-15 developer days  

Comprehensive plan for adding three new order states:
- `draft` - Customers can save orders before publishing
- `completed` - Customer confirmation after delivery
- `disputed` - Customer can raise disputes for resolution

**Impact:** 15 backend files, 18 frontend files, 22 test files

---

## Naming Convention

Planning documents follow this format:
```
YYYY-MM-DD_feature-name-plan.md
```

This ensures chronological ordering and easy retrieval.
