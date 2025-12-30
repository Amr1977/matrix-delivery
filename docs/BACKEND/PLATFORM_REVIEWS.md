# Platform Reviews Feature Documentation

## Overview
The Platform Reviews feature allows users (Customers, Drivers, Vendors) to submit reviews about their experience with the Matrix Delivery platform. Users can rate various aspects (Professionalism, Communication, Timeliness, Package Condition) and leave text feedback. The system also supports community engagement through upvoting and flagging reviews.

## 1. Database Schema
The feature utilizes three main tables in the PostgreSQL database:

### `platform_reviews`
Stores the reviews submitted by users.
- `id` (UUID): Primary Key
- `user_id` (UUID): Foreign Key to `users`
- `rating` (Integer): Overall rating (1-5)
- `content` (Text): Review text content
- `professionalism_rating`, `communication_rating`, `timeliness_rating`, `package_condition_rating` (Integer, 1-5): Detailed aspect ratings
- `upvotes` (Integer): Counter for upvotes (default 0)
- `flag_count` (Integer): Counter for flags (default 0)
- `is_approved` (Boolean): Moderation status (default true, auto-hidden if flags > 2)
- `is_featured` (Boolean): Featured status (default false)
- `created_at`, `updated_at` (Timestamp)

### `platform_review_votes`
Tracks upvotes to prevent duplicate voting.
- `review_id` (UUID): Foreign Key to `platform_reviews`
- `user_id` (UUID): Foreign Key to `users`
- PRIMARY KEY (`review_id`, `user_id`)

### `platform_review_flags`
Tracks flags to prevent duplicate flagging and store reasons.
- `review_id` (UUID): Foreign Key to `platform_reviews`
- `user_id` (UUID): Foreign Key to `users`
- `reason` (Text): Reason for flagging
- PRIMARY KEY (`review_id`, `user_id`)

## 2. API Endpoints

### `POST /api/reviews`
Submit a new review.
- **Auth**: Required (`verifyToken`)
- **Rate Limit**: 1 review per user per 24 hours (Disabled in Test Env).
- **Body**:
  ```json
  {
    "rating": 5,
    "content": "Great Service!",
    "professionalism_rating": 5,
    "communication_rating": 5,
    "timeliness_rating": 5,
    "package_condition_rating": 5
  }
  ```

### `GET /api/reviews`
List approved reviews.
- **Auth**: Public
- **Query Params**: `page` (default 1), `limit` (default 10), `sort` ("recent" or "upvotes")

### `POST /api/reviews/:id/vote`
Upvote a review.
- **Auth**: Required
- **Rate Limit**: 10 votes per hour.

### `POST /api/reviews/:id/flag`
Flag a review as inappropriate.
- **Auth**: Required
- **Body**: `{ "reason": "Spam" }`
- **Effect**: If a review receives > 2 flags, `is_approved` is set to `FALSE` automatically.

### `PATCH /api/reviews/:id/admin`
Admin moderation endpoint.
- **Auth**: Admin Only
- **Body**: `{ "is_approved": true, "is_featured": true, "github_issue_link": "..." }`

## 3. Testing

### Integration Tests
Located in `backend/tests/integration/platformReviews.test.js`.
These tests match the deployment environment and verify:
- Database schema consistency (using `resetDatabase` in setup).
- API request/response flows.
- Authentication and Authorization (JWT audience checks).
- Rate Limiting behavior (verified 429 in prod, disabled in test).
- Database persistence of Votes and Flags.

**Run Integration Tests:**
```bash
npm run test:integration
# or specifically
npx cross-env NODE_OPTIONS="--max-old-space-size=4096" jest tests/integration/platformReviews.test.js --runInBand
```

### BDD Tests (Cucumber)
Located in `backend/features/platform_reviews.feature`.
These tests cover user scenarios in Gherkin syntax:
- Submitting valid/invalid reviews.
- Viewing reviews.
- Voting and Flagging.

**Run BDD Tests:**
```bash
npx cucumber-js backend/features/platform_reviews.feature
```

### Unit Tests
Logic is currently encapsulated within the Route handlers (`backend/routes/reviews.js`) and validated via Integration/BDD tests.
Specific service-layer unit tests are not applicable as no dedicated `ReviewService` exists yet.
