/**
 * Cucumber World - Shared context for all step definitions
 * This file sets up the test environment and provides utilities
 */

const { setWorldConstructor, Before, After, BeforeAll, AfterAll } = require('@cucumber/cucumber');
const { Pool } = require('pg');
const fetch = require('node-fetch');
const assert = require('assert');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api';
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME_TEST || 'matrix_delivery_test',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
};

// Global database pool
let globalPool;

class CustomWorld {
  constructor() {
    // API client
    this.apiBaseUrl = API_BASE_URL;
    this.authToken = null;
    this.currentUser = null;
    this.response = null;
    this.lastResponse = null;
    
    // Test data storage
    this.testData = {
      users: {},
      orders: {},
      bids: {},
      notifications: {},
      payments: {},
      reviews: {}
    };
    
    // UI simulation storage
    this.currentPage = null;
    this.formData = {};
    this.modalOpen = false;
    
    // Database pool (shared across all scenarios)
    this.pool = globalPool;
    
    // Mock system time
    this.systemTime = new Date('2025-10-19T12:00:00Z');
    
    // Test utilities
    this.assert = assert;
  }

  // API Helper Methods
  async apiRequest(method, endpoint, data = null, options = {}) {
    const url = `${this.apiBaseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.authToken && !options.noAuth) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    const config = {
      method,
      headers
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      config.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, config);
      const text = await response.text();
      
      let json;
      try {
        json = text ? JSON.parse(text) : {};
      } catch (e) {
        json = { raw: text };
      }

      this.lastResponse = {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText,
        headers: response.headers,
        data: json,
        error: json.error || null
      };

      this.response = this.lastResponse;
      return this.lastResponse;
    } catch (error) {
      console.error('API Request Error:', error);
      this.lastResponse = {
        status: 0,
        ok: false,
        error: error.message
      };
      this.response = this.lastResponse;
      return this.lastResponse;
    }
  }

  async get(endpoint, options = {}) {
    return this.apiRequest('GET', endpoint, null, options);
  }

  async post(endpoint, data, options = {}) {
    return this.apiRequest('POST', endpoint, data, options);
  }

  async put(endpoint, data, options = {}) {
    return this.apiRequest('PUT', endpoint, data, options);
  }

  async delete(endpoint, options = {}) {
    return this.apiRequest('DELETE', endpoint, null, options);
  }

  // Database Helper Methods
  async query(sql, params = []) {
    try {
      const result = await this.pool.query(sql, params);
      return result;
    } catch (error) {
      console.error('Database Query Error:', error);
      throw error;
    }
  }

  async truncateTable(tableName) {
    await this.query(`TRUNCATE TABLE ${tableName} CASCADE`);
  }

  async truncateAllTables() {
    const tables = [
      'reviews',
      'location_updates',
      'notifications',
      'bids',
      'payments',
      'user_payment_methods',
      'driver_locations',
      'orders',
      'users'
    ];

    for (const table of tables) {
      try {
        await this.truncateTable(table);
      } catch (error) {
        console.warn(`Could not truncate ${table}:`, error.message);
      }
    }
  }

  // Test Data Generators
  generateId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  generateOrderNumber() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `ORD-${timestamp}-${random}`;
  }

  generateEmail(prefix = 'test') {
    return `${prefix}_${Date.now()}@example.com`;
  }

  // User Management
  async createTestUser(role = 'customer', overrides = {}) {
    const userData = {
      name: overrides.name || `Test ${role}`,
      email: overrides.email || this.generateEmail(role),
      password: overrides.password || 'SecurePass123!',
      phone: overrides.phone || '+1234567890',
      role: role,
      ...(role === 'driver' && { vehicle_type: overrides.vehicle_type || 'bike' })
    };

    const response = await this.post('/auth/register', userData, { noAuth: true });
    
    if (response.ok) {
      const user = {
        ...response.data.user,
        password: userData.password // Store for login
      };
      this.testData.users[user.id] = user;
      return user;
    } else {
      throw new Error(`Failed to create user: ${response.error}`);
    }
  }

  async loginUser(email, password) {
    const response = await this.post('/auth/login', { email, password }, { noAuth: true });
    
    if (response.ok) {
      this.authToken = response.data.token;
      this.currentUser = response.data.user;
      return response.data;
    } else {
      throw new Error(`Login failed: ${response.error}`);
    }
  }

  // Order Management
  async createTestOrder(customerId, overrides = {}) {
    const orderData = {
      title: overrides.title || 'Test Delivery',
      description: overrides.description || 'Test order description',
      price: overrides.price || 25.00,
      pickupLocation: overrides.pickupLocation || {
        coordinates: { lat: 40.7128, lng: -74.0060 },
        address: {
          country: 'USA',
          city: 'New York',
          area: 'Manhattan',
          street: '5th Avenue',
          buildingNumber: '350',
          floor: '12',
          apartmentNumber: '1205',
          personName: 'John Customer'
        }
      },
      dropoffLocation: overrides.dropoffLocation || {
        coordinates: { lat: 40.7580, lng: -73.9855 },
        address: {
          country: 'USA',
          city: 'New York',
          area: 'Upper West Side',
          street: 'Broadway',
          buildingNumber: '2250',
          floor: '8',
          apartmentNumber: '805',
          personName: 'Jane Recipient'
        }
      },
      package_description: overrides.package_description || 'Test package',
      package_weight: overrides.package_weight || 2.5,
      estimated_value: overrides.estimated_value || 100.00,
      special_instructions: overrides.special_instructions || 'Handle with care'
    };

    const response = await this.post('/orders', orderData);
    
    if (response.ok) {
      const order = response.data;
      this.testData.orders[order._id] = order;
      return order;
    } else {
      throw new Error(`Failed to create order: ${response.error}`);
    }
  }

  // Wait utility
  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Assertion helpers
  assertResponseOk() {
    assert.ok(this.response.ok, `Expected response to be ok, but got status ${this.response.status}: ${this.response.error}`);
  }

  assertResponseError(expectedError) {
    assert.ok(!this.response.ok, 'Expected response to have error');
    if (expectedError) {
      assert.ok(
        this.response.error && this.response.error.includes(expectedError),
        `Expected error to contain "${expectedError}", but got "${this.response.error}"`
      );
    }
  }

  assertResponseStatus(expectedStatus) {
    assert.equal(
      this.response.status,
      expectedStatus,
      `Expected status ${expectedStatus}, but got ${this.response.status}`
    );
  }
}

// Set the World constructor
setWorldConstructor(CustomWorld);

// Hooks
BeforeAll(async function() {
  // Create global database pool
  globalPool = new Pool(DB_CONFIG);
  
  console.log('\n🚀 Starting BDD Test Suite');
  console.log(`📊 Database: ${DB_CONFIG.database}`);
  console.log(`🌐 API: ${API_BASE_URL}\n`);
});

AfterAll(async function() {
  // Close database pool
  if (globalPool) {
    await globalPool.end();
  }
  console.log('\n✅ Test Suite Completed\n');
});

Before(async function() {
  // Clean database before each scenario
  await this.truncateAllTables();
  
  // Reset authentication
  this.authToken = null;
  this.currentUser = null;
  
  // Reset test data
  this.testData = {
    users: {},
    orders: {},
    bids: {},
    notifications: {},
    payments: {},
    reviews: {}
  };
});

After(function() {
  // Log scenario result
  if (this.result && this.result.status === 'failed') {
    console.error(`\n❌ Scenario failed: ${this.pickle.name}`);
    if (this.response) {
      console.error('Last Response:', JSON.stringify(this.response, null, 2));
    }
  }
});

module.exports = { CustomWorld };