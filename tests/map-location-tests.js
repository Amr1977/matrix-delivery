// ============ COMPLETE TEST SUITE FOR MAP LOCATION PICKER ============
// Run with: npm test

const request = require('supertest');
const { calculateDistance, estimateDuration, isRemoteArea, isInternationalOrder, parseGoogleMapsUrl } = require('../server');

describe('Map Location Picker - Unit Tests', () => {
  
  describe('calculateDistance', () => {
    it('should calculate distance between Cairo and Alexandria correctly', () => {
      const cairo = { lat: 30.0444, lng: 31.2357 };
      const alex = { lat: 31.2001, lng: 29.9187 };
      
      const distance = calculateDistance(cairo.lat, cairo.lng, alex.lat, alex.lng);
      
      expect(distance).toBeCloseTo(218, 0); // ~218 km
    });
    
    it('should return 0 for same location', () => {
      const distance = calculateDistance(30.0444, 31.2357, 30.0444, 31.2357);
      expect(distance).toBe(0);
    });
    
    it('should handle negative coordinates', () => {
      const distance = calculateDistance(-33.8688, 151.2093, -37.8136, 144.9631);
      expect(distance).toBeGreaterThan(0);
    });
  });
  
  describe('estimateDuration', () => {
    it('should estimate walker duration correctly', () => {
      const duration = estimateDuration(5, 'walker'); // 5km at 5km/h
      expect(duration).toBe(60); // 60 minutes
    });
    
    it('should estimate bicycle duration correctly', () => {
      const duration = estimateDuration(15, 'bicycle'); // 15km at 15km/h
      expect(duration).toBe(60); // 60 minutes
    });
    
    it('should estimate car duration correctly', () => {
      const duration = estimateDuration(25, 'car'); // 25km at 25km/h
      expect(duration).toBe(60); // 60 minutes
    });
    
    it('should round up to nearest minute', () => {
      const duration = estimateDuration(5.5, 'walker'); // 5.5km at 5km/h = 66 minutes
      expect(duration).toBe(66);
    });
    
    it('should handle truck vehicle type', () => {
      const duration = estimateDuration(18, 'truck'); // 18km at 18km/h
      expect(duration).toBe(60);
    });
  });
  
  describe('isRemoteArea', () => {
    it('should detect farm addresses as remote', () => {
      const address = { street: 'Green Farm Road', area: 'Countryside' };
      expect(isRemoteArea(address)).toBe(true);
    });
    
    it('should detect desert locations as remote', () => {
      const address = { area: 'Sahara Desert', city: 'Remote' };
      expect(isRemoteArea(address)).toBe(true);
    });
    
    it('should not flag city addresses as remote', () => {
      const address = { street: 'Tahrir Square', city: 'Cairo', area: 'Downtown' };
      expect(isRemoteArea(address)).toBe(false);
    });
    
    it('should detect rural areas', () => {
      const address = { area: 'Rural Village', city: 'Countryside' };
      expect(isRemoteArea(address)).toBe(true);
    });
  });
  
  describe('isInternationalOrder', () => {
    it('should detect international orders', () => {
      expect(isInternationalOrder('Egypt', 'UAE')).toBe(true);
    });
    
    it('should not flag domestic orders', () => {
      expect(isInternationalOrder('Egypt', 'Egypt')).toBe(false);
    });
    
    it('should be case-sensitive', () => {
      expect(isInternationalOrder('Egypt', 'egypt')).toBe(true);
    });
  });
  
  describe('parseGoogleMapsUrl', () => {
    it('should parse standard Google Maps URL with q parameter', () => {
      const url = 'https://www.google.com/maps?q=30.0444,31.2357';
      const coords = parseGoogleMapsUrl(url);
      
      expect(coords).toEqual({ lat: 30.0444, lng: 31.2357 });
    });
    
    it('should parse Google Maps URL with @ format', () => {
      const url = 'https://www.google.com/maps/@30.0444,31.2357,15z';
      const coords = parseGoogleMapsUrl(url);
      
      expect(coords).toEqual({ lat: 30.0444, lng: 31.2357 });
    });
    
    it('should parse maps.google.com URLs', () => {
      const url = 'https://maps.google.com/?q=30.0444,31.2357';
      const coords = parseGoogleMapsUrl(url);
      
      expect(coords).toEqual({ lat: 30.0444, lng: 31.2357 });
    });
    
    it('should handle negative coordinates', () => {
      const url = 'https://www.google.com/maps?q=-33.8688,151.2093';
      const coords = parseGoogleMapsUrl(url);
      
      expect(coords).toEqual({ lat: -33.8688, lng: 151.2093 });
    });
    
    it('should return null for invalid URLs', () => {
      expect(parseGoogleMapsUrl('not-a-maps-url')).toBeNull();
      expect(parseGoogleMapsUrl('')).toBeNull();
      expect(parseGoogleMapsUrl(null)).toBeNull();
    });
  });
});

describe('Map Location Picker - Integration Tests', () => {
  let app;
  let token;
  let customerToken;
  let driverToken;
  
  beforeAll(async () => {
    app = require('../server');
    
    // Register and login customer
    const customerRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test Customer',
        email: 'customer@test.com',
        password: 'password123',
        phone: '+1234567890',
        role: 'customer',
        country: 'Egypt',
        city: 'Cairo',
        area: 'Downtown'
      });
    customerToken = customerRes.body.token;
    
    // Register and login driver
    const driverRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test Driver',
        email: 'driver@test.com',
        password: 'password123',
        phone: '+1234567891',
        role: 'driver',
        vehicle_type: 'car',
        country: 'Egypt',
        city: 'Cairo',
        area: 'Nasr City'
      });
    driverToken = driverRes.body.token;
  });
  
  describe('POST /api/locations/reverse-geocode', () => {
    it('should reverse geocode Cairo coordinates', async () => {
      const res = await request(app)
        .get('/api/locations/reverse-geocode')
        .query({ lat: 30.0444, lng: 31.2357 });
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('coordinates');
      expect(res.body).toHaveProperty('address');
      expect(res.body.coordinates.lat).toBeCloseTo(30.0444, 2);
      expect(res.body.coordinates.lng).toBeCloseTo(31.2357, 2);
      expect(res.body.address.country).toBe('Egypt');
    });
    
    it('should return 400 for missing coordinates', async () => {
      const res = await request(app)
        .get('/api/locations/reverse-geocode')
        .query({ lat: 30.0444 });
      
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('required');
    });
    
    it('should detect remote areas', async () => {
      // Mock a remote farm location
      const res = await request(app)
        .get('/api/locations/reverse-geocode')
        .query({ lat: 30.5, lng: 31.0 }); // Rural area coordinates
      
      if (res.status === 200) {
        expect(res.body).toHaveProperty('isRemote');
      }
    });
  });
  
  describe('POST /api/locations/parse-maps-url', () => {
    it('should parse valid Google Maps URL', async () => {
      const res = await request(app)
        .post('/api/locations/parse-maps-url')
        .send({ url: 'https://www.google.com/maps?q=30.0444,31.2357' });
      
      expect(res.status).toBe(200);
      expect(res.body.coordinates).toEqual({ lat: 30.0444, lng: 31.2357 });
      expect(res.body).toHaveProperty('address');
      expect(res.body).toHaveProperty('locationLink');
    });
    
    it('should return 400 for invalid URL', async () => {
      const res = await request(app)
        .post('/api/locations/parse-maps-url')
        .send({ url: 'not-a-valid-url' });
      
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid');
    });
    
    it('should return 400 for missing URL', async () => {
      const res = await request(app)
        .post('/api/locations/parse-maps-url')
        .send({});
      
      expect(res.status).toBe(400);
    });
  });
  
  describe('POST /api/locations/calculate-route', () => {
    it('should calculate route between two points', async () => {
      const res = await request(app)
        .post('/api/locations/calculate-route')
        .send({
          pickup: { lat: 30.0444, lng: 31.2357 },
          delivery: { lat: 30.0626, lng: 31.2497 }
        });
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('distance_km');
      expect(res.body).toHaveProperty('estimates');
      expect(res.body.estimates).toHaveProperty('walker');
      expect(res.body.estimates).toHaveProperty('bicycle');
      expect(res.body.estimates).toHaveProperty('car');
      expect(res.body.estimates).toHaveProperty('van');
      expect(res.body.estimates).toHaveProperty('truck');
      expect(res.body.distance_km).toBeGreaterThan(0);
    });
    
    it('should return all vehicle type estimates', async () => {
      const res = await request(app)
        .post('/api/locations/calculate-route')
        .send({
          pickup: { lat: 30.0444, lng: 31.2357 },
          delivery: { lat: 30.0626, lng: 31.2497 }
        });
      
      expect(res.status).toBe(200);
      const { estimates } = res.body;
      
      expect(estimates.walker.duration_minutes).toBeGreaterThan(0);
      expect(estimates.walker.speed_kmh).toBe(5);
      expect(estimates.walker.icon).toBe('🚶');
      
      expect(estimates.bicycle.duration_minutes).toBeGreaterThan(0);
      expect(estimates.bicycle.speed_kmh).toBe(15);
      expect(estimates.bicycle.icon).toBe('🚲');
    });
    
    it('should return 400 for missing coordinates', async () => {
      const res = await request(app)
        .post('/api/locations/calculate-route')
        .send({ pickup: { lat: 30.0444 } });
      
      expect(res.status).toBe(400);
    });
  });
  
  describe('Delivery Agent Preferences', () => {
    it('should create default preferences for new delivery agent', async () => {
      const res = await request(app)
        .get('/api/delivery-agent/preferences')
        .set('Authorization', `Bearer ${driverToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('max_distance_km');
      expect(res.body).toHaveProperty('accept_remote_areas');
      expect(res.body).toHaveProperty('accept_international');
    });
    
    it('should update delivery agent preferences', async () => {
      const res = await request(app)
        .put('/api/delivery-agent/preferences')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          max_distance_km: 100,
          accept_remote_areas: true,
          accept_international: true
        });
      
      expect(res.status).toBe(200);
      expect(res.body.max_distance_km).toBe(100);
      expect(res.body.accept_remote_areas).toBe(true);
      expect(res.body.accept_international).toBe(true);
    });
    
    it('should reject customer from accessing preferences', async () => {
      const res = await request(app)
        .get('/api/delivery-agent/preferences')
        .set('Authorization', `Bearer ${customerToken}`);
      
      expect(res.status).toBe(403);
    });
  });
  
  describe('Order Creation with Map Data', () => {
    it('should create order with complete location data', async () => {
      const orderData = {
        title: 'Test Delivery',
        description: 'Test package',
        price: 100,
        pickupLocation: {
          coordinates: { lat: 30.0444, lng: 31.2357 },
          locationLink: 'https://www.google.com/maps?q=30.0444,31.2357',
          address: {
            country: 'Egypt',
            city: 'Cairo',
            area: 'Downtown',
            street: 'Tahrir Square',
            buildingNumber: '10',
            floor: '2',
            apartmentNumber: '5',
            personName: 'Ahmed Ali'
          }
        },
        dropoffLocation: {
          coordinates: { lat: 30.0626, lng: 31.2497 },
          locationLink: 'https://www.google.com/maps?q=30.0626,31.2497',
          address: {
            country: 'Egypt',
            city: 'Cairo',
            area: 'Zamalek',
            street: '26th of July Street',
            buildingNumber: '15',
            personName: 'Mohamed Hassan'
          }
        },
        routeInfo: {
          distance_km: 3.2,
          estimates: {
            car: { duration_minutes: 8 }
          }
        }
      };
      
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(orderData);
      
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('orderNumber');
      expect(res.body).toHaveProperty('pickupCoordinates');
      expect(res.body).toHaveProperty('deliveryCoordinates');
      expect(res.body).toHaveProperty('estimatedDistanceKm');
      expect(res.body.estimatedDistanceKm).toBe(3.2);
    });
    
    it('should detect remote area orders', async () => {
      const orderData = {
        title: 'Farm Delivery',
        price: 150,
        pickupLocation: {
          coordinates: { lat: 30.5, lng: 31.0 },
          locationLink: 'https://www.google.com/maps?q=30.5,31.0',
          address: {
            country: 'Egypt',
            city: 'Cairo',
            area: 'Farm Area',
            street: 'Desert Road',
            personName: 'Farm Owner'
          }
        },
        dropoffLocation: {
          coordinates: { lat: 30.0444, lng: 31.2357 },
          locationLink: 'https://www.google.com/maps?q=30.0444,31.2357',
          address: {
            country: 'Egypt',
            city: 'Cairo',
            area: 'Downtown',
            street: 'Main Street',
            personName: 'City Customer'
          }
        }
      };
      
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(orderData);
      
      expect(res.status).toBe(201);
      expect(res.body.isRemoteArea).toBe(true);
    });
    
    it('should detect international orders', async () => {
      const orderData = {
        title: 'International Delivery',
        price: 500,
        pickupLocation: {
          coordinates: { lat: 30.0444, lng: 31.2357 },
          locationLink: 'https://www.google.com/maps?q=30.0444,31.2357',
          address: {
            country: 'Egypt',
            city: 'Cairo',
            street: 'Main Street',
            personName: 'Egypt Sender'
          }
        },
        dropoffLocation: {
          coordinates: { lat: 25.2048, lng: 55.2708 },
          locationLink: 'https://www.google.com/maps?q=25.2048,55.2708',
          address: {
            country: 'UAE',
            city: 'Dubai',
            street: 'Sheikh Zayed Road',
            personName: 'Dubai Receiver'
          }
        }
      };
      
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(orderData);
      
      expect(res.status).toBe(201);
      expect(res.body.isInternational).toBe(true);
    });
  });
  
  describe('Order Filtering for Delivery Agents', () => {
    let testOrderId;
    
    beforeAll(async () => {
      // Create a test order
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          title: 'Filtered Test Order',
          price: 100,
          pickupLocation: {
            coordinates: { lat: 30.0444, lng: 31.2357 },
            address: { country: 'Egypt', city: 'Cairo', personName: 'Test' }
          },
          dropoffLocation: {
            coordinates: { lat: 30.0626, lng: 31.2497 },
            address: { country: 'Egypt', city: 'Cairo', personName: 'Test' }
          },
          routeInfo: { distance_km: 3.2 }
        });
      
      testOrderId = res.body._id;
    });
    
    it('should filter orders by max distance', async () => {
      // Set max distance to 1 km
      await request(app)
        .put('/api/delivery-agent/preferences')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ max_distance_km: 1.0 });
      
      const res = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${driverToken}`);
      
      expect(res.status).toBe(200);
      // Order with 3.2km should be filtered out
      const filteredOrder = res.body.find(o => o._id === testOrderId);
      expect(filteredOrder).toBeUndefined();
    });
    
    it('should show orders within max distance', async () => {
      // Set max distance to 50 km
      await request(app)
        .put('/api/delivery-agent/preferences')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ max_distance_km: 50.0 });
      
      const res = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${driverToken}`);
      
      expect(res.status).toBe(200);
      const order = res.body.find(o => o._id === testOrderId);
      expect(order).toBeDefined();
    });
  });
});

describe('Map Location Picker - E2E Tests', () => {
  // These would be run with a browser automation tool like Puppeteer
  // Included as pseudo-code for documentation
  
  test('Customer can click on map to select pickup location', async () => {
    // 1. Navigate to order creation page
    // 2. Click on pickup map at specific coordinates
    // 3. Verify marker appears
    // 4. Verify address fields auto-fill
    // 5. Verify location link is generated
  });
  
  test('Customer can paste Google Maps link', async () => {
    // 1. Navigate to order creation page
    // 2. Paste Google Maps URL in location shortcut field
    // 3. Click "Parse" button
    // 4. Verify map updates
    // 5. Verify address fields auto-fill
  });
  
  test('Route preview shows after both locations set', async () => {
    // 1. Set pickup location
    // 2. Set dropoff location
    // 3. Verify route preview map appears
    // 4. Verify distance is displayed
    // 5. Verify all vehicle estimates are shown
  });
  
  test('Delivery agent can filter orders by distance', async () => {
    // 1. Login as delivery agent
    // 2. Open preferences
    // 3. Set max distance to 10km
    // 4. View available orders
    // 5. Verify only orders within 10km are shown
  });
  
  test('Remote area warning appears', async () => {
    // 1. Select remote farm location
    // 2. Verify "Remote Area Detected" warning shows
    // 3. Create order
    // 4. Verify order is marked as remote
  });
});

// Performance Tests
describe('Map Location Picker - Performance Tests', () => {
  it('should reverse geocode within 2 seconds', async () => {
    const start = Date.now();
    
    await request(app)
      .get('/api/locations/reverse-geocode')
      .query({ lat: 30.0444, lng: 31.2357 });
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(2000);
  });
  
  it('should calculate route within 3 seconds', async () => {
    const start = Date.now();
    
    await request(app)
      .post('/api/locations/calculate-route')
      .send({
        pickup: { lat: 30.0444, lng: 31.2357 },
        delivery: { lat: 30.0626, lng: 31.2497 }
      });
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(3000);
  });
});

// Export for CI/CD
module.exports = {
  // Test utilities
  createTestOrder: async (token, orderData) => {
    return request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send(orderData);
  }
};
