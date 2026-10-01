# AI Coding Agent Prompt — Courier Career Network ("LinkedIn for Couriers")

Paste as a standalone task to your local agent with `matrix-delivery` as the working directory. Follow `.agent/rules.md` and `AGENTS.md` conventions (parameterized SQL, `services/api/` on the frontend, i18n via `locales.js`, security-first).

## Current state (verified)

- `users` already carries real courier signal: `vehicle_type, rating (default 5.00), completed_deliveries, is_available, is_verified, license_number, service_area_zone`. No career-history table, no tiering, no team/leader concept, no public-profile concept anywhere in the codebase (checked — none of `seniority`, `team_leader`, `courier profile route` exist today). This is greenfield.
- `node-cron` is already a dependency and already used for scheduled jobs elsewhere (offer expiry etc. from earlier phases) — reuse that pattern for the tiering recalculation job, don't add a second scheduler.
- Driver `rating`/`completed_deliveries` are live-updated somewhere in the existing order-completion/review flow — find and read that code first (search for where `completed_deliveries` gets incremented) so the new tier system reads from the same source of truth rather than recomputing deliveries independently.

## Product goal

Couriers get a public, shareable profile (`/couriers/:id` or similar) showing their career on the platform: tenure, completed deliveries, rating, verified badges, and a visible seniority tier — the same instinct as a LinkedIn profile, but for delivery work, positioning the platform as the courier's professional record, not just a gig app. Add a lightweight "team leader" role for couriers who supervise others.

## Design decisions (state these plainly, don't silently vary them)

- **Tiers**: `junior`, `mid`, `senior`, `team_leader`. Thresholds should be a config table, not hardcoded constants, since the business will want to tune them without a redeploy:
  - `courier_tier_rules(tier_name, min_completed_deliveries, min_tenure_days, min_rating, min_team_size)` — a team_leader tier additionally requires an assigned team (see below), not just deliveries/rating.
- **Career history is an append-only timeline**, not just derived stats — record discrete events (`joined_platform`, `tier_promoted`, `verified`, `milestone_deliveries_100/500/1000`, `badge_earned`, `joined_team`, `became_team_leader`) so the profile can show a real history, not just a current snapshot.
- **Privacy**: profile visibility is opt-in per courier (`is_profile_public boolean default false` on `users` or a new `courier_profiles` table) — do not make delivery-worker data public by default without consent; this is a real person's work history and location-adjacent data (service area). Public profile view must never expose phone/address/exact home location — only city/service area zone, tier, stats, and career events they've consented to show.
- **Teams**: a `courier_teams` concept where a `team_leader`-tier courier is linked to N couriers they lead — needed both for the team_leader tier's own qualification and for any future team-performance features. Keep it simple: one leader per team, a courier belongs to at most one team.

## Rules

1. Read the existing order-completion/rating-update code path before writing the tier recalculation job — reuse its numbers, don't recompute `completed_deliveries` from `orders`/`marketplace_order_delivery_fsm` independently if a trusted running total already exists on `users`.
2. Migrations additive, next number `027` (after the e-shop prompt's `024`–`026`, adjust if you're running these prompts out of order — check `ls backend/migrations` for the real next number before writing the file).
3. Tier promotion/demotion must be logged as a career event, never a silent field update — the whole point is an auditable history.
4. No public endpoint returns a courier's phone, exact address, email, or precise home coordinates — service-area zone (already a `users` column) and city are the most granular location info allowed on a public profile.
5. Test after every phase (`npm run test:backend`, `npm run test:frontend`).

## Phase 1 — Schema

- [ ] `027_create_courier_career_tables.sql`:
  ```sql
  CREATE TABLE courier_tier_rules (
    id SERIAL PRIMARY KEY,
    tier_name VARCHAR(30) NOT NULL UNIQUE,
    display_order INTEGER NOT NULL,
    min_completed_deliveries INTEGER NOT NULL DEFAULT 0,
    min_tenure_days INTEGER NOT NULL DEFAULT 0,
    min_rating NUMERIC(3,2) NOT NULL DEFAULT 0,
    min_team_size INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE courier_teams (
    id SERIAL PRIMARY KEY,
    leader_user_id VARCHAR(255) NOT NULL REFERENCES users(id),
    name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE courier_team_members (
    id SERIAL PRIMARY KEY,
    team_id INTEGER NOT NULL REFERENCES courier_teams(id) ON DELETE CASCADE,
    courier_user_id VARCHAR(255) NOT NULL REFERENCES users(id),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(courier_user_id)
  );

  CREATE TABLE courier_career_events (
    id SERIAL PRIMARY KEY,
    courier_user_id VARCHAR(255) NOT NULL REFERENCES users(id),
    event_type VARCHAR(50) NOT NULL,
    event_detail JSONB,
    occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX idx_career_events_courier ON courier_career_events(courier_user_id, occurred_at DESC);
  ```
- [ ] `028_add_courier_profile_fields.sql`: add to `users` — `current_tier VARCHAR(30)`, `is_profile_public BOOLEAN DEFAULT false`, `tier_updated_at TIMESTAMP`. Seed `courier_tier_rules` with sensible starting defaults (e.g. junior: 0 deliveries; mid: 200 deliveries + 60 days tenure + 4.3 rating; senior: 800 deliveries + 180 days + 4.6 rating; team_leader: senior thresholds + min_team_size 1) — flag these as placeholder numbers the user should tune, don't present them as final.
- [ ] Backfill: a one-time script that inserts a `joined_platform` career event for every existing driver, dated from their `users.created_at`, so tenure calculations aren't broken for existing accounts.

## Phase 2 — Backend

- [ ] `backend/modules/courierCareer/` (new module, follow the `modules/marketplace` layering pattern: controllers/services/repositories/routes): 
  - `tierService.recalculateTier(userId)` — reads current stats + `courier_tier_rules`, determines eligible tier, writes `users.current_tier` + `tier_updated_at` and a `tier_promoted`/`tier_demoted` career event only on actual change.
  - `courierProfileService.getPublicProfile(userId)` — returns only the allowed public fields (Rule 4), throws/404s if `is_profile_public` is false and requester isn't the courier or an admin.
  - `courierTeamService` — create team (courier must already be `senior` tier or above per rules), add/remove member, list team + aggregate team stats.
  - Routes: `GET /api/couriers/:id/profile` (public-safe), `PATCH /api/couriers/me/profile-visibility`, `GET /api/couriers/:id/career-history`, `POST /api/couriers/teams`, `POST /api/couriers/teams/:id/members`, `GET /api/couriers/directory` (paginated, public-profile couriers only, filterable by tier/city).
- [ ] Cron job (register alongside the existing `node-cron` jobs, same file/pattern) running daily: recalculate tiers for all active couriers, batched, logging counts promoted/demoted.
- [ ] Wire `tier_promoted` events to the existing FCM notification service, if one is already wired to driver push tokens, so a courier gets notified when they level up — check `fcm_tokens` usage in existing driver notification code before adding a second push pathway.

## Phase 3 — Frontend

- [ ] Public courier profile page: name, photo (reuse `users.profile_picture_url`, already exists), tier badge, city/service area, rating, completed deliveries, tenure ("courier since X"), career timeline (chronological list from `career_events`), team info if they're a team leader or member. No PII beyond what Rule 4 allows, enforced by the backend response shape, not just hidden in the UI.
- [ ] Courier-facing settings: toggle for `is_profile_public`, with a plain-language explanation of exactly what becomes visible (list the fields) before they turn it on — this is a consent screen, treat it like one, not a buried checkbox.
- [ ] Courier directory/search page (only for couriers who opted in), filterable by city/tier — this is the "network" part of "career network," so it needs to be genuinely browsable, not just individual profile links.
- [ ] Tier badge component reusable across the app (order tracking screen, courier's own dashboard) so the tier is visible where customers already see driver info, not just on the dedicated profile page.
- [ ] All strings through `useI18n()`/`locales.js`.

## Phase 4 — Verify

- [ ] Test: a courier with `is_profile_public = false` returns 404/403 on the public profile endpoint for any non-owner, non-admin requester.
- [ ] Test: public profile response never contains phone/email/exact address/precise coordinates — assert on the response shape directly, not just the UI.
- [ ] Test: tier recalculation produces the expected tier for a set of synthetic courier stat combinations, including edge cases at exact threshold boundaries.
- [ ] Test: `team_leader` tier is only reachable with `min_team_size` actually satisfied — a senior courier with zero team members should not auto-promote to team_leader even if every other threshold is met.
- [ ] Manual pass: promote a test courier through tiers by adjusting their stats, confirm career events are recorded and the public profile reflects the new tier.

## Output format

Same as usual: path + full content or diff per file, phase summary at the end of each phase.

## Stop conditions

- If you can't find where `users.completed_deliveries`/`rating` currently gets updated (Rule 1) — stop and ask the user rather than guessing at a second update path; a courier stat system with two independent writers will drift.
- If the tier thresholds you're about to seed would immediately promote/demote a large share of existing real couriers (check counts before seeding on a non-empty `users` table) — stop and show the user the distribution before committing to default numbers, since that's a product/business decision, not a technical one.
