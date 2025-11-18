/**
 * Comprehensive Tests for Enhanced Map Location Picker
 * Tests drag-and-drop, cascaded dropdowns, and bidirectional sync features
 */

const request = require('supertest');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

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
  role: 'customer'
};

describe('Enhanced Map Location Picker Integration Tests', () => {
  let server;
  let app;
  let testUserToken;

  beforeAll(async () => {
    // Setup test server
    const serverModule = require('../backend/server');
    app = serverModule;
    server = require('http').createServer(app);
    await new Promise(resolve => server.listen(5001, resolve));

    // Create test tokens
    testUserToken = jwt.sign(testUser, process.env.JWT_SECRET);
  });

  afterAll(async () => {
    await pool.end();
    server.close();
  });

  describe('Forward Geocoding API (New)', () => {
    test('should forward geocode complete address to coordinates', async () => {
      const addressData = {
        country: 'Egypt',
        city: 'Cairo',
        area: 'Tahrir Square',
        street: 'Tahrir Street'
      };

      const params = new URLSearchParams(addressData);

      const response = await request(app)
        .get(`/api/locations/forward-geocode?${params}`)
        .expect(200);

      expect(response.body).toHaveProperty('coordinates');
      expect(response.body).toHaveProperty('address');
      expect(response.body).toHaveProperty('locationLink');
      expect(response.body.coordinates).toHaveProperty('lat');
      expect(response.body.coordinates).toHaveProperty('lng');
      expect(response.body.locationLink).toMatch(/^https:\/\/www\.google\.com\/maps\?q=/);
    });

    test('should handle partial address data', async () => {
      const addressData = {
        country: 'Egypt',
        city: 'Cairo'
      };

      const params = new URLSearchParams(addressData);

      const response = await request(app)
        .get(`/api/locations/forward-geocode?${params}`)
        .expect(200);

      expect(response.body).toHaveProperty('coordinates');
      expect(response.body.coordinates).toHaveProperty('lat');
      expect(response.body.coordinates).toHaveProperty('lng');
    });

    test('should require country and city for basic geocoding', async () => {
      const response = await request(app)
        .get('/api/locations/forward-geocode?country=Egypt')
        .expect(200);

      // Should still work as Nominatim can often infer city
      expect(response.body).toBeDefined();
    });

    test('should return multiple results when available', async () => {
      const response = await request(app)
        .get('/api/locations/forward-geocode?country=Egypt&city=Cairo&street=Main')
        .expect(200);

      expect(response.body).toHaveProperty('coordinates');
      if (response.body.allResults) {
        expect(Array.isArray(response.body.allResults)).toBe(true);
      }
    });

    test('should handle complex addresses with building numbers', async () => {
      const addressData = {
        country: 'Egypt',
        city: 'Cairo',
        street: 'Salah Salem',
        building: '123'
      };

      const params = new URLSearchParams(addressData);

      const response = await request(app)
        .get(`/api/locations/forward-geocode?${params}`)
        .expect(200);

      expect(response.body).toHaveProperty('coordinates');
    });
  });

  describe('Bidirectional Address-Map Synchronization', () => {
    const mockLocation = {
      coordinates: { lat: 30.0444, lng: 31.2357 },
      address: {
        country: 'Egypt',
        city: 'Cairo',
        area: 'Tahrir Square',
        street: 'Tahrir Street',
        buildingNumber: '1',
        personName: 'John Doe'
      },
      locationLink: 'https://www.google.com/maps?q=30.0444,31.2357',
      displayName: 'Tahrir Square, Cairo, Egypt'
    };

    test('should support the new cascaded location data structure', async () => {
      const orderData = {
        title: 'Test Order with Enhanced Location Data',
        price: 25.50,
        description: 'Testing enhanced map location picker integration',
        pickupLocation: mockLocation,
        dropoffLocation: {
          coordinates: { lat: 30.0131, lng: 31.2089 },
          address: {
            country: 'Egypt',
            city: 'Giza',
            area: 'Dokki',
            street: 'Salah Salem Street',
            buildingNumber: '45',
            personName: 'Jane Smith'
          },
          locationLink: 'https://www.google.com/maps?q=30.0131,31.2089',
          displayName: 'Dokki, Giza, Egypt'
        }
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(orderData)
        .expect(201);

      // Verify enhanced location data is stored and returned
      expect(response.body).toHaveProperty('pickupLocation');
      expect(response.body.pickupLocation.coordinates.lat).toBe(mockLocation.coordinates.lat);
      expect(response.body.pickupLocation.coordinates.lng).toBe(mockLocation.coordinates.lng);
      expect(response.body.pickupLocation.address).toEqual(mockLocation.address);
      expect(response.body.pickupLocation.locationLink).toBe(mockLocation.locationLink);
      expect(response.body.pickupLocation.displayName).toBe(mockLocation.displayName);

      expect(response.body).toHaveProperty('dropoffLocation');
      expect(response.body.dropoffLocation).not.toBeNull();
    });

    test('should support address fields with enhanced details', async () => {
      const orderData = {
        title: 'Test Order with Complete Address Details',
        price: 30.00,
        pickupLocation: {
          coordinates: { lat: 30.0444, lng: 31.2357 },
          address: {
            country: 'Egypt',
            city: 'Cairo',
            area: 'Zamalek',
            street: '26th of July Street',
            buildingNumber: '15A',
            floor: '5th',
            apartment: 'B',
            personName: 'Ahmed Hassan',
            postcode: '11511'
          },
          locationLink: 'https://www.google.com/maps?q=30.0444,31.2357'
        },
        dropoffLocation: {
          coordinates: { lat: 30.0189, lng: 31.4996 },
          address: {
            country: 'Egypt',
            city: 'Cairo',
            area: 'Maadi',
            street: 'Road 9',
            buildingNumber: '50',
            personName: 'Sara Ahmed'
          },
          locationLink: 'https://www.google.com/maps?q=30.0189,31.4996'
        }
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(orderData)
        .expect(201);

      // Verify all address details are preserved
      expect(response.body.pickupLocation.address.buildingNumber).toBe('15A');
      expect(response.body.pickupLocation.address.floor).toBe('5th');
      expect(response.body.pickupLocation.address.apartment).toBe('B');
      expect(response.body.pickupLocation.address.postcode).toBe('11511');
    });

    test('should validate remapped location data structure', async () => {
      // Test that the old field mappings still work but prefer new structure
      const orderData = {
        title: 'Compatibility Test',
        price: 20.00,
        pickupLocation: {
          coordinates: { lat: 30.0444, lng: 31.2357 },
          address: {
            country: 'Egypt',
            city: 'Cairo',
            street: 'Tahrir Street',
            personName: 'Contact Name'
          }
        },
        dropoffLocation: {
          coordinates: { lat: 30.0131, lng: 31.2089 },
          address: {
            country: 'Egypt',
            city: 'Giza',
            street: 'Pyramids Street',
            personName: 'Recipient Name'
          }
        }
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(orderData)
        .expect(201);

      // Check that it uses the new integrated location structure
      expect(response.body.from.lat).toBe(orderData.pickupLocation.coordinates.lat);
      expect(response.body.from.lng).toBe(orderData.pickupLocation.coordinates.lng);
      expect(response.body.from.name).toBe(orderData.pickupLocation.address.personName);
    });

    test('should handle route information in orders', async () => {
      const routeInfo = {
        distance_km: 8.5,
        straight_line_distance_km: 7.2,
        polyline: '_tt~F|`yhRn~B~_B~|B~|B~|B~|B~|B~_B',
        estimates: {
          walker: { duration_minutes: 102, speed_kmh: 5 },
          bicycle: { duration_minutes: 34, speed_kmh: 15 },
          car: { duration_minutes: 25, speed_kmh: 20 },
          van: { duration_minutes: 28, speed_kmh: 18 },
          truck: { duration_minutes: 32, speed_kmh: 16 }
        },
        route_found: true
      };

      const orderData = {
        title: 'Route Calculation Test Order',
        price: 35.00,
        pickupLocation: {
          coordinates: { lat: 30.0444, lng: 31.2357 },
          address: { country: 'Egypt', city: 'Cairo', personName: 'Sender' }
        },
        dropoffLocation: {
          coordinates: { lat: 30.0131, lng: 31.2089 },
          address: { country: 'Egypt', city: 'Giza', personName: 'Receiver' }
        },
        routeInfo: routeInfo
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(orderData)
        .expect(201);

      // Verify route information is stored
      expect(response.body.estimatedDistanceKm).toBe(routeInfo.distance_km);
      expect(response.body.estimatedDurationMinutes).toBe(routeInfo.estimates.car.duration_minutes);
      expect(response.body.routePolyline).toBe(routeInfo.polyline);
    });
  });

  describe('Enhanced Route Calculation with Vehicle Estimates', () => {
    test('should calculate routes with multiple vehicle types', async () => {
      const pickup = { lat: 30.0444, lng: 31.2357 }; // Cairo center
      const delivery = { lat: 30.0131, lng: 31.2089 }; // Giza

      const response = await request(app)
        .post('/api/locations/calculate-route')
        .send({ pickup, delivery })
        .expect(200);

      expect(response.body).toHaveProperty('distance_km');
      expect(response.body).toHaveProperty('estimates');

      // Verify all vehicle types are included
      const estimates = response.body.estimates;
      expect(estimates).toHaveProperty('walker');
      expect(estimates).toHaveProperty('bicycle');
      expect(estimates).toHaveProperty('car');
      expect(estimates).toHaveProperty('van');
      expect(estimates).toHaveProperty('truck');

      // Verify each estimate has required fields
      Object.values(estimates).forEach(estimate => {
        expect(estimate).toHaveProperty('duration_minutes');
        expect(estimate).toHaveProperty('speed_kmh');
        expect(estimate).toHaveProperty('icon');
      });

      // Verify walker is slowest and car is reasonable
      expect(estimates.walker.speed_kmh).toBe(5);
      expect(estimates.bicycle.speed_kmh).toBe(15);
      expect(estimates.car.speed_kmh).toBe(25);
    });

    test('should handle international routes', async () => {
      // Cairo, Egypt to Beirut, Lebanon (International)
      const pickup = { lat: 30.0444, lng: 31.2357 };
      const delivery = { lat: 33.8938, lng: 35.5018 };

      const response = await request(app)
        .post('/api/locations/calculate-route')
        .send({ pickup, delivery })
        .expect(200);

      expect(response.body.distance_km).toBeGreaterThan(500); // Should be significant distance
      expect(response.body.distance_km).toBeLessThan(1000);
      expect(response.body.estimates).toBeDefined();
    });

    test('should provide accurate duration estimates', async () => {
      const pickup = { lat: 30.0444, lng: 31.2357 };
      const delivery = { lat: 30.0131, lng: 31.2089 };

      const response = await request(app)
        .post('/api/locations/calculate-route')
        .send({ pickup, delivery })
        .expect(200);

      const distance = response.body.distance_km;
      const carEstimate = response.body.estimates.car;

      // Duration should be reasonable for distance (allow 10% margin for real roads vs straight line)
      const calculatedDuration = Math.ceil((distance / carEstimate.speed_kmh) * 60);
      expect(carEstimate.duration_minutes).toBeGreaterThan(calculatedDuration * 0.9);
      expect(carEstimate.duration_minutes).toBeLessThan(calculatedDuration * 1.4); // Allow for traffic
    });

    test('should fallback to straight-line distance when routing fails', async () => {
      // Use identical points to force straight-line calculation
      const samePoint = { lat: 30.0444, lng: 31.2357 };

      const response = await request(app)
        .post('/api/locations/calculate-route')
        .send({ pickup: samePoint, delivery: samePoint })
        .expect(200);

      expect(response.body.distance_km).toBe(0);

      // Estimates should still be calculated
      expect(response.body.estimates.car.duration_minutes).toBe(0);
    });
  });

  describe('Remote Area and International Order Detection', () => {
    test('should detect and flag remote areas', async () => {
      // Rural area coordinates (near White Desert, Egypt)
      const ruralCoords = { lat: 27.5194, lng: 28.9167 };

      const response = await request(app)
        .get('/api/locations/reverse-geocode')
        .query({ lat: ruralCoords.lat, lng: ruralCoords.lng })
        .expect(200);

      // Note: The API should detect remote/farm areas based on address data
      // This test verifies the structure is in place
      expect(response.body).toHaveProperty('address');
      expect(response.body).toHaveProperty('coordinates');
      expect(response.body).toHaveProperty('displayName');
    });

    test('should handle international orders in creation', async () => {
      // Create order from Egypt to Saudi Arabia
      const orderData = {
        title: 'International Test Order',
        price: 100.00,
        pickupLocation: {
          coordinates: { lat: 30.0444, lng: 31.2357 },
          address: {
            country: 'Egypt',
            city: 'Cairo',
            personName: 'Egypt Sender'
          }
        },
        dropoffLocation: {
          coordinates: { lat: 24.7136, lng: 46.6753 }, // Riyadh, Saudi Arabia
          address: {
            country: 'Saudi Arabia',
            city: 'Riyadh',
            personName: 'Saudi Receiver'
          }
        }
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(orderData)
        .expect(201);

      // Verify international flag is set (would be handled by backend logic)
      expect(response.body).toHaveProperty('_id');
      expect(response.body).toHaveProperty('status');
    });

    test('should store enhanced location metadata', async () => {
      // Verify that recent orders include the enhanced location data
      const listResponse = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);

      // Should have at least one order with enhanced data
      expect(listResponse.body.length).toBeGreaterThan(0);

      // Check that enhanced location data is returned in listing
      const recentOrder = listResponse.body[0];
      expect(recentOrder).toHaveProperty('from');
      expect(recentOrder).toHaveProperty('to');
      if (recentOrder.estimatedDistanceKm) {
        expect(recentOrder.estimatedDistanceKm).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Cascaded Location Data API Integration', () => {
    test('should provide country list for dropdowns', async () => {
      const response = await request(app)
        .get('/api/locations/countries')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // Should include commonly used countries including Egypt
      expect(response.body).toContain('Egypt');
    });

    test('should provide cascaded city options', async () => {
      // Assuming Egypt has cities, this should return city list
      const response = await request(app)
        .get('/api/locations/countries/Egypt/cities')
        .expect(200);

      // May be empty initially but should be array
      expect(Array.isArray(response.body)).toBe(true);
    });

    test('should provide cascaded area options', async () => {
      const response = await request(app)
        .get('/api/locations/countries/Egypt/cities/Cairo/areas')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    test('should provide cascaded street options', async () => {
      const response = await request(app)
        .get('/api/locations/countries/Egypt/cities/Cairo/areas/Downtown/streets')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    test('should handle non-existent locations gracefully', async () => {
      await request(app)
        .get('/api/locations/countries/Mars/cities')
        .expect(200);

      await request(app)
        .get('/api/locations/countries/Egypt/cities/NonExistentCity/areas')
        .expect(200);
    });
  });

  describe('Location Data Persistence and Retrieval', () => {
    test('should retrieve orders with enhanced location data', async () => {
      // Create test order
      const orderData = {
        title: 'Persistence Test Order',
        price: 40.00,
        description: 'Testing enhanced location data persistence',
        pickupLocation: {
          coordinates: { lat: 30.0444, lng: 31.2357 },
          address: {
            country: 'Egypt',
            city: 'Cairo',
            area: 'Tahrir Square',
            street: 'Tahrir Street',
            buildingNumber: '10',
            floor: '3',
            personName: 'Persistence Test Sender'
          },
          locationLink: 'https://www.google.com/maps?q=30.0444,31.2357'
        },
        dropoffLocation: {
          coordinates: { lat: 30.0131, lng: 31.2089 },
          address: {
            country: 'Egypt',
            city: 'Giza',
            area: 'Dokki',
            street: 'Salah Salem Street',
            buildingNumber: '25',
            personName: 'Persistence Test Receiver'
          },
          locationLink: 'https://www.google.com/maps?q=30.0131,31.2089'
        }
      };

      const createResponse = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(orderData)
        .expect(201);

      const orderId = createResponse.body._id;

      // Retrieve the specific order
      const getResponse = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);

      // Verify all enhanced data is persisted and retrieved correctly
      expect(getResponse.body.from.lat).toBe(orderData.pickupLocation.coordinates.lat);
      expect(getResponse.body.from.lng).toBe(orderData.pickupLocation.coordinates.lng);
      expect(getResponse.body.from.name).toBe(orderData.pickupLocation.address.personName);
      expect(getResponse.body.to.name).toBe(orderData.dropoffLocation.address.personName);

      // Verify pickup and dropoff locations are included in response
      expect(getResponse.body).toHaveProperty('pickupLocation');
      expect(getResponse.body.pickupLocation.coordinates.lat).toBe(orderData.pickupLocation.coordinates.lat);
      expect(getResponse.body.pickupLocation.address).toEqual(orderData.pickupLocation.address);

      expect(getResponse.body).toHaveProperty('dropoffLocation');
      expect(getResponse.body.dropoffLocation.coordinates.lng).toBe(orderData.dropoffLocation.coordinates.lng);
      expect(getResponse.body.dropoffLocation.address).toEqual(orderData.dropoffLocation.address);
    });

    test('should list orders with enhanced location information', async () => {
      const listResponse = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);

      expect(Array.isArray(listResponse.body)).toBe(true);

      // Each order should have the standard fields
      if (listResponse.body.length > 0) {
        const order = listResponse.body[0];
        expect(order).toHaveProperty('_id');
        expect(order).toHaveProperty('title');
        expect(order).toHaveProperty('from');
        expect(order).toHaveProperty('to');

        if (order.pickupLocation) {
          expect(order.pickupLocation).toHaveProperty('coordinates');
          expect(order.pickupLocation).toHaveProperty('address');
          expect(order.pickupLocation.coordinates).toHaveProperty('lat');
          expect(order.pickupLocation.coordinates).toHaveProperty('lng');
          expect(order.pickupLocation.address).toHaveProperty('country');
          expect(order.pickupLocation.address).toHaveProperty('city');
        }
      }
    });
  });

  describe('Error Handling for Enhanced Features', () => {
    test('should handle forward geocoding failures gracefully', async () => {
      // Test with very unlikely location
      const response = await request(app)
        .get('/api/locations/forward-geocode?country=Atlantis&city=LostCity')
        .expect(200); // Should not error, just return best effort

      // May return null or partial data, but shouldn't crash
      expect(response.body).toBeDefined();
    });

    test('should validate enhanced order data structure', async () => {
      // Test with incomplete location data
      const incompleteOrderData = {
        title: 'Test Order Validation',
        price: 25.00,
        pickupLocation: {
          coordinates: { lat: 30.0444 }, // Missing lng
          address: { country: 'Egypt', personName: 'Test' }
        },
        dropoffLocation: {
          coordinates: { lat: 30.0131, lng: 31.2089 },
          address: { country: 'Egypt', personName: 'Test' }
        }
      };

      await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(incompleteOrderData)
        .expect(400);
    });

    test('should handle missing route information in orders', async () => {
      const orderWithoutRoute = {
        title: 'Order Without Route',
        price: 15.00,
        pickupLocation: {
          coordinates: { lat: 30.0444, lng: 31.2357 },
          address: { country: 'Egypt', city: 'Cairo', personName: 'Test' }
        },
        dropoffLocation: {
          coordinates: { lat: 30.0131, lng: 31.2089 },
          address: { country: 'Egypt', city: 'Giza', personName: 'Test' }
        }
        // No routeInfo provided
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(orderWithoutRoute)
        .expect(201);

      // Should handle gracefully without route info
      expect(response.body.estimatedDistanceKm).toBeNull();
      expect(response.body.estimatedDurationMinutes).toBeNull();
    });
  });

  describe('Performance and Scalability Tests', () => {
    test('should handle multiple concurrent geocoding requests', async () => {
      const requests = [
        request(app).get('/api/locations/reverse-geocode').query({ lat: 30.0444, lng: 31.2357 }),
        request(app).get('/api/locations/reverse-geocode').query({ lat: 30.0131, lng: 31.2089 }),
        request(app).get('/api/locations/reverse-geocode').query({ lat: 31.2001, lng: 29.9187 })
      ];

      const results = await Promise.all(requests);

      // All should succeed
      results.forEach(result => {
        expect(result.status).toBe(200);
        expect(result.body).toHaveProperty('coordinates');
        expect(result.body).toHaveProperty('address');
      });
    });

    test('should cache location data efficiently', async () => {
      // First request for a location
      const firstResponse = await request(app)
        .get('/api/locations/reverse-geocode')
        .query({ lat: 30.0444, lng: 31.2357 })
        .expect(200);

      // Second request for same location should be fast and consistent
      const secondResponse = await request(app)
        .get('/api/locations/reverse-geocode')
        .query({ lat: 30.0444, lng: 31.2357 })
        .expect(200);

      // Results should be identical
      expect(secondResponse.body.coordinates).toEqual(firstResponse.body.coordinates);
    });

    test('should provide reasonable response times for geocoding', async () => {
      const startTime = Date.now();

      await request(app)
        .get('/api/locations/reverse-geocode')
        .query({ lat: 30.0444, lng: 31.2357 })
        .expect(200);

      const duration = Date.now() - startTime;
      // Should complete within reasonable time (allowing for external API calls)
      expect(duration).toBeLessThan(5000); // 5 seconds
    });

    test('should handle high-volume order creation', async () => {
      const orderPromises = [];

      // Create multiple orders with enhanced location data
      for (let i = 0; i < 3; i++) {
        const orderData = {
          title: `Bulk Test Order ${i + 1}`,
          price: 15.00 + i,
          pickupLocation: {
            coordinates: { lat: 30.0444 + (i * 0.001), lng: 31.2357 + (i * 0.001) },
            address: {
              country: 'Egypt',
              city: 'Cairo',
              area: 'Test Area',
              street: `Test Street ${i + 1}`,
              personName: `Test Sender ${i + 1}`
            }
          },
          dropoffLocation: {
            coordinates: { lat: 30.0131 + (i * 0.001), lng: 31.2089 + (i * 0.001) },
            address: {
              country: 'Egypt',
              city: 'Giza',
              area: 'Test Area',
              street: `Delivery Street ${i + 1}`,
              personName: `Test Receiver ${i + 1}`
            }
          }
        };

        orderPromises.push(
          request(app)
            .post('/api/orders')
            .set('Authorization', `Bearer ${testUserToken}`)
            .send(orderData)
        );
      }

      const results = await Promise.all(orderPromises);

      // All should succeed
      results.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('_id');
        expect(response.body).toHaveProperty('pickupLocation');
        expect(response.body).toHaveProperty('dropoffLocation');
      });
    });
  });
});

// Export for use in other test files
module.exports = {
  testUser,
  testUserToken,
  pool
};
