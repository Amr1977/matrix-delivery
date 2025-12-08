import { TableSchema } from '../types';

/**
 * Locations table schema
 * Stores location data for countries, cities, areas, streets
 */
export const locationsSchema: TableSchema = {
    name: 'locations',

    createStatement: `
    CREATE TABLE IF NOT EXISTS locations (
      id SERIAL PRIMARY KEY,
      country VARCHAR(100) NOT NULL,
      city VARCHAR(100) NOT NULL,
      area VARCHAR(100) NOT NULL,
      street VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(country, city, area, street)
    )
  `,

    indexes: []
};

/**
 * Location cache table schema
 * Caches expensive location lookups
 */
export const locationCacheSchema: TableSchema = {
    name: 'location_cache',

    createStatement: `
    CREATE TABLE IF NOT EXISTS location_cache (
      cache_key VARCHAR(255) PRIMARY KEY,
      payload JSONB NOT NULL,
      expires_at TIMESTAMP NOT NULL
    )
  `,

    indexes: []
};

/**
 * Coordinate mappings table schema
 * Maps coordinates to locations for reverse geocoding
 */
export const coordinateMappingsSchema: TableSchema = {
    name: 'coordinate_mappings',

    createStatement: `
    CREATE TABLE IF NOT EXISTS coordinate_mappings (
      id SERIAL PRIMARY KEY,
      location_key VARCHAR(100) NOT NULL UNIQUE,
      country VARCHAR(100) NOT NULL,
      city VARCHAR(100) NOT NULL,
      lat_min DECIMAL(10,8) NOT NULL,
      lat_max DECIMAL(10,8) NOT NULL,
      lng_min DECIMAL(11,8) NOT NULL,
      lng_max DECIMAL(11,8) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `,

    indexes: []
};
