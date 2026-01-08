# Order Review System

## Overview

The order review system allows customers and drivers to rate and review each other after an order is completed. This feature is critical for maintaining trust and quality in the platform.

## Database Schema

### Reviews Table

```sql
CREATE TABLE reviews (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,           -- User submitting the review
    order_id VARCHAR(255) NOT NULL,
    reviewer_id VARCHAR(255) NOT NULL,       -- Same as user_id (redundant for clarity)
    reviewee_id VARCHAR(255),                -- User being reviewed (NULL for platform reviews)
    reviewer_role VARCHAR(50) NOT NULL,      -- customer, driver
    review_type VARCHAR(50) NOT NULL,        -- customer_to_driver, driver_to_customer, etc.
    rating INTEGER NOT NULL,                 -- 1-5 stars
    comment TEXT,
    professionalism_rating INTEGER,
    communication_rating INTEGER,
    timeliness_rating INTEGER,
    condition_rating INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);
```

## Review Types

1. **customer_to_driver**: Customer reviews the assigned driver
2. **driver_to_customer**: Driver reviews the customer
3. **customer_to_platform**: Customer reviews the platform service
4. **driver_to_platform**: Driver reviews the platform service

## API Endpoints

### Submit Review

```
POST /api/orders/:orderId/review
```

**Authentication**: Required (JWT token)

**Request Body**:

```json
{
  "reviewType": "customer_to_driver",
  "rating": 5,
  "comment": "Excellent driver, very fast.",
  "professionalismRating": 5,
  "communicationRating": 5,
  "timelinessRating": 5,
  "conditionRating": 5
}
```

**Response**:

```json
{
  "message": "Review submitted successfully"
}
```

## Business Logic

### Authorization Rules

- Only users involved in the order can submit reviews
- Reviews can only be submitted for `delivered` orders
- Each user can submit one review per review type per order
- **customer_to_driver**: Only the customer who created the order
- **driver_to_customer**: Only the assigned driver
- **platform reviews**: Either customer or assigned driver

### Review Submission Flow

1. Verify order exists and is in `delivered` status
2. Check user authorization (customer or assigned driver)
3. Verify no duplicate review exists for this order/reviewer/review type
4. Insert review with all required fields including `user_id`
5. Update reviewee's average rating (if reviewing a user)
6. Send notification to reviewee

## Implementation

### Backend Service

The review submission logic is implemented in:

- **Router**: `backend/routes/orders.js` - Route handler
- **Service**: `backend/services/orderService.js` - Business logic

```javascript
// backend/routes/orders.js
router.post("/:orderId/review", verifyToken, async (req, res) => {
  try {
    const result = await orderService.submitReview(
      req.params.orderId,
      req.user.userId,
      req.body,
    );
    res.json(result);
  } catch (error) {
    logger.error(`Review submission error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});
```

### Frontend Components

- **ReviewModal.js**: Modal dialog for submitting reviews
- **OrderCard.js**: Displays review button for delivered orders
- **HistoryTab.js**: Shows review history

## Recent Fix (2026-01-08)

### Issue

Review submissions were failing with:

```
null value in column "user_id" of relation "reviews" violates not-null constraint
```

### Root Cause

The `INSERT INTO reviews` statement in `orderService.submitReview()` was missing the `user_id` column, despite it being a `NOT NULL` column in the database schema.

### Solution

Updated `backend/services/orderService.js` line 1657:

**Before**:

```javascript
INSERT INTO reviews(
  id, order_id, reviewer_id, reviewee_id, reviewer_role,
  review_type, rating, comment, ...
) VALUES($1, $2, $3, $4, $5, $6, $7, $8, ...)
```

**After**:

```javascript
INSERT INTO reviews(
  id, user_id, order_id, reviewer_id, reviewee_id, reviewer_role,
  review_type, rating, comment, ...
) VALUES($1, $3, $2, $3, $4, $5, $6, $7, $8, ...)
```

The `user_id` column now receives the reviewer's ID (same as `reviewer_id`).

### Verification

- **E2E Test**: `tests/features/core/order_lifecycle.feature`
- **Result**: ✅ PASSED (1 scenario, 22 steps, 7m19s)
- **Commit**: `37c1961`

## Testing

### E2E Test Coverage

The `order_lifecycle.feature` test covers:

1. Order creation by customer
2. Driver bidding
3. Customer accepting bid
4. Driver pickup and delivery
5. Customer confirming delivery
6. **Review submission by both parties**
7. Wallet balance verification

### Manual Testing Checklist

- [ ] Customer can review driver after delivery
- [ ] Driver can review customer after delivery
- [ ] Review appears in History tab
- [ ] Reviewee receives notification
- [ ] Average rating updates correctly
- [ ] Cannot submit duplicate reviews
- [ ] Cannot review before delivery is confirmed

## Related Files

- `backend/services/orderService.js` - Main business logic
- `backend/routes/orders.js` - API route handlers
- `frontend/src/components/ReviewModal.js` - UI component
- `tests/features/core/order_lifecycle.feature` - E2E test
- `tests/steps/core/e2e/order_lifecycle.e2e.js` - Test implementation

## Troubleshooting

### Review button not appearing

- Check order status is `delivered`
- Verify user is customer or assigned driver
- Check if review was already submitted

### Review submission fails

- Verify JWT token is valid and contains `userId`
- Check order exists and is in `delivered` status
- Ensure no duplicate review exists
- Check database connection and schema

### Rating not updating

- Verify `reviewee_id` is correct
- Check the average rating calculation query
- Ensure database transaction commits successfully
