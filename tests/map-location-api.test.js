/**
 * Comprehensive API Tests for Map Location Picker Feature
 * Tests reverse geocoding, route calculation, and location parsing endpoints
 */

const request = require('supertest');
const app = require('../backend/app');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

// Polyfill for fetch in Node.js test environment
const https = require('https');
const http = require('http');

global.fetch = function (url, options) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;

    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options?.method || 'GET',
      headers: options?.headers || {}
    };

    const req = protocol.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            json: () => Promise.resolve(jsonData)
          });
        } catch (e) {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            json: () => Promise.resolve({ error: data })
          });
        }
      });
    });

    req.on('error', reject);

    if (options?.body) {
      req.write(options.body);
    }

    req.end();
  });
};

// Mock environment
process.env.NODE_ENV = 'test';
process.env.DB_NAME_TEST = 'matrix_delivery_test';
process.env.DB_USER = process.env.DB_USER || 'postgres';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'postgres';
process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_PORT = process.env.DB_PORT || 5432;
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret';

// Setup test database
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME_TEST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 5,
  idleTimeoutMillis: 30000,
});

// Mock user for testing
const testUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  primary_role: 'customer'
};

const testDriver = {
  id: 'test-driver-id',
  email: 'driver@example.com',
  name: 'Test Driver',
  primary_role: 'driver'
};

let testUserToken;
let testDriverToken;
const serverManager = require('./utils/serverManager');

describe('Map Location Picker API Tests', () => {
  // Use serverManager to start backend server for tests
  const baseURL = 'http://localhost:5000';

  beforeAll(async () => {
    // Start backend server if not already running
    try {
      const response = await fetch('http://localhost:5000/api/health');
      if (!response.ok) throw new Error('Not running');
      console.log('Backend already running');
    } catch (e) {
      console.log('Starting backend server via serverManager...');
      await serverManager.startBackend();
    }

    // Create test tokens
    testUserToken = jwt.sign({ ...testUser, userId: testUser.id }, process.env.JWT_SECRET, { audience: 'matrix-delivery-api', issuer: 'matrix-delivery' });
    testDriverToken = jwt.sign({ ...testDriver, userId: testDriver.id }, process.env.JWT_SECRET, { audience: 'matrix-delivery-api', issuer: 'matrix-delivery' });

    // Insert test users
    try {
      await pool.query(`
        INSERT INTO users (id, email, name, primary_role, password_hash) VALUES 
        ($1, $2, $3, 'customer', 'test_hash'),
        ($4, $5, $6, 'driver', 'test_hash')
        ON CONFLICT (id) DO NOTHING
      `, [testUser.id, testUser.email, testUser.name, testDriver.id, testDriver.email, testDriver.name]);

      // Seed user_balances for escrow support (required for order creation)
      await pool.query(`
        INSERT INTO user_balances (user_id, available_balance, pending_balance, held_balance, total_balance, currency)
        VALUES ($1, 10000, 0, 0, 10000, 'EGP'),
               ($2, 10000, 0, 0, 10000, 'EGP')
        ON CONFLICT (user_id) DO UPDATE SET available_balance = 10000, total_balance = 10000
      `, [testUser.id, testDriver.id]);
    } catch (error) {
      console.log('Error inserting test users:', error.message);
    }

    // Setup test database tables if needed
    try {
      await pool.query('DROP TABLE IF EXISTS delivery_agent_preferences CASCADE');
      await pool.query('DROP TABLE IF EXISTS driver_locations CASCADE');

      await pool.query(`
        CREATE TABLE IF NOT EXISTS delivery_agent_preferences (
          agent_id VARCHAR(255) PRIMARY KEY,
          max_distance_km DECIMAL(6,2) DEFAULT 50.00,
          accept_remote_areas BOOLEAN DEFAULT false,
          accept_international BOOLEAN DEFAULT false,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS driver_locations (
          id SERIAL PRIMARY KEY,
          driver_id VARCHAR(255) UNIQUE REFERENCES users(id) ON DELETE CASCADE,
          latitude DECIMAL(10,8) NOT NULL,
          longitude DECIMAL(11,8) NOT NULL,
          last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
    } catch (error) {
      console.log('Test database setup warning:', error.message);
    }
  });

  afterAll(async () => {
    await serverManager.stop();
    await pool.end();
  });

  describe('Reverse Geocoding API', () => {
    test('should successfully reverse geocode valid coordinates', async () => {
      const url = `${baseURL}/api/locations/reverse-geocode?lat=30.0131&lng=31.2089`;
      const response = await fetch(url);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('coordinates');
      expect(data).toHaveProperty('address');
      expect(data).toHaveProperty('locationLink');
      expect(data.coordinates).toHaveProperty('lat', 30.0130972);
      expect(data.coordinates).toHaveProperty('lng', 31.2089963);
      expect(data.address).toHaveProperty('country');
      expect(data.address).toHaveProperty('city');
      expect(data.locationLink).toMatch(/^https:\/\/www\.google\.com\/maps\?q=/);
    }, 30000);

    test('should handle coordinates near major landmarks', async () => {
      // Tahrir Square, Cairo
      const url = `${baseURL}/api/locations/reverse-geocode?lat=30.0444&lng=31.2357`;
      const response = await (await fetch(url)).json();
      expect(response.address).toBeDefined();
      expect(response.displayName).toBeDefined();
    }, 30000);

    test('should return error for invalid coordinates', async () => {
      const url = `${baseURL}/api/locations/reverse-geocode?lat=91&lng=181`;
      const response = await fetch(url);
      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.error).toMatch(/not found/i);
    });

    test('should handle ocean coordinates gracefully', async () => {
      // Coordinates in the Atlantic Ocean
      const url = `${baseURL}/api/locations/reverse-geocode?lat=25.0&lng=-40.0`;
      const response = await fetch(url);
      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    test('should require both lat and lng parameters', async () => {
      const url1 = `${baseURL}/api/locations/reverse-geocode?lat=30.0444`;
      const response1 = await fetch(url1);
      expect(response1.status).toBe(400);

      const url2 = `${baseURL}/api/locations/reverse-geocode?lng=31.2357`;
      const response2 = await fetch(url2);
      expect(response2.status).toBe(400);
    });
  });

  describe('Google Maps URL Parsing', () => {
    test('should parse standard Google Maps URL', async () => {
      const testUrl = 'https://www.google.com/maps?q=30.0444,31.2357';
      const response = await request(app)
        .post('/api/locations/parse-maps-url')
        .send({ url: testUrl })
        .expect(200);

      expect(response.body.coordinates).toEqual({ lat: 30.0444, lng: 31.2357 });
      expect(response.body.locationLink).toMatch(/maps\?q=30\.0444,31\.2357/);
      expect(response.body.address).toBeDefined();
    });

    test('should parse Google Maps @ coordinates', async () => {
      const testUrl = 'https://maps.google.com/@30.0444,31.2357,15z';
      const response = await request(app)
        .post('/api/locations/parse-maps-url')
        .send({ url: testUrl })
        .expect(200);

      expect(response.body.coordinates).toEqual({ lat: 30.0444, lng: 31.2357 });
    });

    test('should reject invalid URLs', async () => {
      await request(app)
        .post('/api/locations/parse-maps-url')
        .send({ url: 'https://example.com' })
        .expect(400);

      await request(app)
        .post('/api/locations/parse-maps-url')
        .send({ url: 'not-a-url' })
        .expect(400);
    });

    test('should require URL parameter', async () => {
      await request(app)
        .post('/api/locations/parse-maps-url')
        .send({})
        .expect(400);
    });
  });

  describe('Route Calculation API', () => {
    test('should calculate route between two valid locations', async () => {
      const pickup = { lat: 30.0131, lng: 31.2089 }; // Giza, Egypt
      const delivery = { lat: 30.0444, lng: 31.2357 }; // Cairo center

      const response = await request(app)
        .post('/api/locations/calculate-route')
        .send({ pickup, delivery })
        .expect(200);

      expect(response.body).toHaveProperty('distance_km');
      expect(response.body).toHaveProperty('estimates');
      expect(response.body.distance_km).toBeGreaterThan(0);
      expect(response.body.estimates).toHaveProperty('car');
      expect(response.body.estimates).toHaveProperty('bicycle');
      expect(response.body.estimates).toHaveProperty('walker');
    });

    test('should handle edge case coordinates', async () => {
      const pickup = { lat: 0, lng: 0 }; // Greenwich
      const delivery = { lat: 0.1, lng: 0.1 }; // Nearby

      const response = await request(app)
        .post('/api/locations/calculate-route')
        .send({ pickup, delivery })
        .expect(200);

      expect(response.body.distance_km).toBeGreaterThan(0);
      expect(response.body.distance_km).toBeLessThan(50); // Should be short distance
    });

    test('should return error for invalid coordinates', async () => {
      await request(app)
        .post('/api/locations/calculate-route')
        .send({ pickup: { lat: 91, lng: 0 }, delivery: { lat: 0, lng: 0 } })
        .expect(400);
    });

    test('should require both pickup and delivery coordinates', async () => {
      await request(app)
        .post('/api/locations/calculate-route')
        .send({ pickup: { lat: 30, lng: 31 } })
        .expect(400);

      await request(app)
        .post('/api/locations/calculate-route')
        .send({ delivery: { lat: 30, lng: 31 } })
        .expect(400);
    });
  });

  describe('Location Search API', () => {
    test('should search for locations by query', async () => {
      const response = await request(app)
        .get('/api/locations/search')
        .query({ q: 'cairo', limit: 5 })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      const firstResult = response.body[0];
      expect(firstResult).toHaveProperty('placeId');
      expect(firstResult).toHaveProperty('displayName');
      expect(firstResult).toHaveProperty('coordinates');
      expect(firstResult).toHaveProperty('address');
    });

    test('should filter search by country', async () => {
      const response = await request(app)
        .get('/api/locations/search')
        .query({ q: 'university', country: 'Egypt', limit: 3 })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      // Note: API may still return results even if no matches
    });

    test('should enforce result limit', async () => {
      const response = await request(app)
        .get('/api/locations/search')
        .query({ q: 'restaurant', limit: 2 })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeLessThanOrEqual(2);
    });

    test('should require search query', async () => {
      await request(app)
        .get('/api/locations/search')
        .query({ limit: 5 })
        .expect(400);
    });

    test('should reject queries that are too short', async () => {
      await request(app)
        .get('/api/locations/search')
        .query({ q: 'a' })
        .expect(400);
    });
  });

  describe('Delivery Agent Preferences API', () => {
    test('should get delivery agent preferences', async () => {
      const response = await request(app)
        .get('/api/delivery-agent/preferences')
        .set('Authorization', `Bearer ${testDriverToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('agent_id', testDriver.id);
      expect(response.body).toHaveProperty('max_distance_km');
      expect(response.body).toHaveProperty('accept_remote_areas');
      expect(response.body).toHaveProperty('accept_international');
    });

    test('should update delivery agent preferences', async () => {
      const preferences = {
        max_distance_km: 75,
        accept_remote_areas: true,
        accept_international: false
      };

      const response = await request(app)
        .put('/api/delivery-agent/preferences')
        .set('Authorization', `Bearer ${testDriverToken}`)
        .send(preferences)
        .expect(200);

      expect(parseFloat(response.body.max_distance_km)).toBe(75);
      expect(response.body.accept_remote_areas).toBe(true);
      expect(response.body.accept_international).toBe(false);
    });

    test('should use default values for missing preferences', async () => {
      const response = await request(app)
        .put('/api/delivery-agent/preferences')
        .set('Authorization', `Bearer ${testDriverToken}`)
        .send({})
        .expect(200);

      expect(response.body.max_distance_km).toBeDefined();
      expect(response.body.accept_remote_areas).toBeDefined();
      expect(response.body.accept_international).toBeDefined();
    });

    test('should reject non-driver user access', async () => {
      await request(app)
        .get('/api/delivery-agent/preferences')
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(403);

      await request(app)
        .put('/api/delivery-agent/preferences')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({ max_distance_km: 50 })
        .expect(403);
    });
  });

  describe('Driver Location Management', () => {
    test('should update driver location', async () => {
      const location = { latitude: 30.0444, longitude: 31.2357 };

      const response = await request(app)
        .post('/api/drivers/location')
        .set('Authorization', `Bearer ${testDriverToken}`)
        .send(location)
        .expect(200);

      expect(response.body.message).toMatch(/updated successfully/i);
      expect(response.body.location).toEqual({
        latitude: 30.0444,
        longitude: 31.2357
      });
    });

    test('should get driver current location', async () => {
      const response = await request(app)
        .get('/api/drivers/location')
        .set('Authorization', `Bearer ${testDriverToken}`)
        .expect(200);

      expect(response.body.location).toEqual({
        latitude: 30.0444,
        longitude: 31.2357,
        lastUpdated: expect.any(String)
      });
    });

    test('should validate coordinates', async () => {
      const invalidLocation = { latitude: 91, longitude: 181 }; // Invalid

      await request(app)
        .post('/api/drivers/location')
        .set('Authorization', `Bearer ${testDriverToken}`)
        .send(invalidLocation)
        .expect(400);
    });

    test('should require both latitude and longitude', async () => {
      await request(app)
        .post('/api/drivers/location')
        .set('Authorization', `Bearer ${testDriverToken}`)
        .send({ latitude: 30 })
        .expect(400);

      await request(app)
        .post('/api/drivers/location')
        .set('Authorization', `Bearer ${testDriverToken}`)
        .send({ longitude: 31 })
        .expect(400);
    });

    test('should reject non-driver user access', async () => {
      const location = { latitude: 30.0444, longitude: 31.2357 };

      await request(app)
        .post('/api/drivers/location')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(location)
        .expect(403);

      await request(app)
        .get('/api/drivers/location')
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(403);
    });
  });

  describe('Enhanced Order Creation with Map Data', () => {
    const validPickupLocation = {
      coordinates: { lat: 30.0131, lng: 31.2089 },
      address: {
        country: 'Egypt',
        city: 'Giza',
        area: 'Dokki',
        street: 'Salah Salem Street',
        buildingNumber: '123',
        personName: 'John Doe'
      },
      locationLink: 'https://www.google.com/maps?q=30.0131,31.2089'
    };

    const validDropoffLocation = {
      coordinates: { lat: 30.0444, lng: 31.2357 },
      address: {
        country: 'Egypt',
        city: 'Cairo',
        area: 'Tahrir Square',
        street: 'Tahrir Street',
        buildingNumber: '456',
        personName: 'Jane Smith'
      },
      locationLink: 'https://www.google.com/maps?q=30.0444,31.2357'
    };

    const routeInfo = {
      distance_km: 5.2,
      estimates: { car: { duration_minutes: 25 } },
      polyline: 'mock_polyline_data'
    };

    test('should create order with map location data', async () => {
      const orderData = {
        title: 'Test Delivery with Map',
        description: 'Order created with map location picker',
        price: 25.50,
        package_description: 'Documents',
        estimated_value: 100,
        pickupLocation: validPickupLocation,
        dropoffLocation: validDropoffLocation,
        routeInfo: routeInfo
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(orderData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(orderData.title);
      expect(response.body.price).toBe(orderData.price);
      expect(response.body.estimatedDistanceKm).toBe(routeInfo.distance_km);

      // Verify location data is stored
      expect(response.body.pickupLocation.coordinates.lat).toBe(validPickupLocation.coordinates.lat);
      expect(response.body.dropoffLocation.coordinates.lng).toBe(validDropoffLocation.coordinates.lng);
    });

    test('should validate required location coordinates', async () => {
      const incompleteOrderData = {
        title: 'Test Order',
        price: 25.50,
        pickupLocation: { address: {} }, // Missing coordinates
        dropoffLocation: validDropoffLocation
      };

      await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(incompleteOrderData)
        .expect(400);
    });

    test('should handle missing route information gracefully', async () => {
      const orderData = {
        title: 'Test Without Route',
        price: 15.00,
        pickupLocation: validPickupLocation,
        dropoffLocation: validDropoffLocation
        // No routeInfo provided
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(orderData)
        .expect(201);

      expect(response.body.estimatedDistanceKm).toBe(null);
      expect(response.body.estimatedDurationMinutes).toBe(null);
    });
  });

  describe('Location Data Integration', () => {
    test('should get all countries', async () => {
      const response = await request(app)
        .get('/api/locations/countries')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body).toContain('Egypt');
    });

    test('should get cities for a country', async () => {
      const response = await request(app)
        .get('/api/locations/countries/Egypt/cities')
        .query({ limit: 5 })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      // Cities may be loaded from cache or API
    });

    test('should get areas for a country and city', async () => {
      const response = await request(app)
        .get('/api/locations/countries/Egypt/cities/Cairo/areas')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      // Areas may be loaded from cache or API
    });

    test('should get streets for location', async () => {
      const response = await request(app)
        .get('/api/locations/countries/Egypt/cities/Cairo/areas/Downtown/streets')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      // Streets may be loaded from cache or API
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle Nominatim API failures gracefully', async () => {
      // This test assumes good network connectivity
      // In real scenarios, you might want to mock the external API
      const response = await request(app)
        .get('/api/locations/reverse-geocode')
        .query({ lat: 30.033, lng: 31.233 }) // Valid but potentially problematic coords
        .expect(200);

      // Should return some valid response or appropriate error
      expect(response.body).toBeDefined();
    });

    test('should validate numeric parameters', async () => {
      await request(app)
        .get('/api/locations/reverse-geocode')
        .query({ lat: 'invalid', lng: 31.2089 })
        .expect(500); // Server error due to API call issues

      await request(app)
        .get('/api/locations/reverse-geocode')
        .query({ lat: 30.0131, lng: 'invalid' })
        .expect(500);
    });

    test('should handle very long search queries', async () => {
      const longQuery = 'a'.repeat(1000);

      await request(app)
        .get('/api/locations/search')
        .query({ q: longQuery })
        .expect(400); // Should be rejected as too long
    });
  });

  describe('Integration with Order System', () => {
    test('should enrich order data with location information', async () => {
      // Test that orders created with map data are properly retrieved
      const createResponse = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          title: 'Integration Test Order',
          price: 30.00,
          pickupLocation: {
            coordinates: { lat: 30.0131, lng: 31.2089 },
            address: {
              country: 'Egypt',
              city: 'Giza',
              street: 'Salah Salem Street'
            }
          },
          dropoffLocation: {
            coordinates: { lat: 30.0444, lng: 31.2357 },
            address: {
              country: 'Egypt',
              city: 'Cairo',
              street: 'Tahrir Street'
            }
          }
        })
        .expect(201);

      const orderId = createResponse.body.id;

      // Retrieve the order
      const getResponse = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);

      const foundOrder = getResponse.body.find(order => order.id === orderId);
      expect(foundOrder).toBeDefined();
      expect(foundOrder.pickupCoordinates).toEqual({ lat: 30.0131, lng: 31.2089 });
      expect(foundOrder.deliveryCoordinates).toEqual({ lat: 30.0444, lng: 31.2357 });
    });
  });
});

// Helper function for authenticated requests in additional tests
const makeAuthenticatedRequest = (method, url) => {
  const req = request(app)[method](url);
  return req;
};

// Export for use in other test files
module.exports = {
  testUser,
  testDriver,
  testUserToken,
  testDriverToken,
  pool
};
