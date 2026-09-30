-- Migration 027: Create courier career tables
-- Creates tables for courier tier rules, teams, team members, and career events

CREATE TABLE IF NOT EXISTS courier_tier_rules (
    id SERIAL PRIMARY KEY,
    tier_name VARCHAR(30) NOT NULL UNIQUE,
    display_order INTEGER NOT NULL,
    min_completed_deliveries INTEGER NOT NULL DEFAULT 0,
    min_tenure_days INTEGER NOT NULL DEFAULT 0,
    min_rating NUMERIC(3,2) NOT NULL DEFAULT 0,
    min_team_size INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS courier_teams (
    id SERIAL PRIMARY KEY,
    leader_user_id VARCHAR(255) NOT NULL REFERENCES users(id),
    name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS courier_team_members (
    id SERIAL PRIMARY KEY,
    team_id INTEGER NOT NULL REFERENCES courier_teams(id) ON DELETE CASCADE,
    courier_user_id VARCHAR(255) NOT NULL REFERENCES users(id),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(courier_user_id)
);

CREATE TABLE IF NOT EXISTS courier_career_events (
    id SERIAL PRIMARY KEY,
    courier_user_id VARCHAR(255) NOT NULL REFERENCES users(id),
    event_type VARCHAR(50) NOT NULL,
    event_detail JSONB,
    occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_career_events_courier ON courier_career_events(courier_user_id, occurred_at DESC);