-- Schema snapshot placeholder generated from the project’s current PostgreSQL schema baseline.
-- Prefer the canonical SQL in backend/migrations/ and database/schema/schema.sql for migrations.
-- This file intentionally replaces the previous empty placeholder to avoid a 0-byte schema stub.

CREATE TABLE IF NOT EXISTS vendors (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  phone VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100),
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  rating DECIMAL(3,2) DEFAULT 0.00,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stores (
  id SERIAL PRIMARY KEY,
  vendor_id VARCHAR(255) NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  address TEXT,
  phone VARCHAR(50),
  email VARCHAR(255),
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  status BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
