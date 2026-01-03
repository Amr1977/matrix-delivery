const dotenv = require('dotenv');
dotenv.config();

class DBSeeder {
  constructor() {
    this.apiUrl = 'http://localhost:5000/api';
    this.testUsers = [];
    this.testOrders = [];
  }

  async waitForServer(timeout = 30000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      try {
        const response = await fetch(`${this.apiUrl}/health`);
        if (response.ok) {
          return true;
        }
      } catch (error) {
        // Server not ready yet
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    throw new Error('Server did not become ready within timeout');
  }

  async createUser(name, email, password, phone, primary_role, vehicleType = null, isVerified = true, isAvailable = true, country = 'Egypt', city = 'Alexandria', area = 'city_center') {
    // Admin is created via direct DB insertion for tests
    let userData;
    if (primary_role === 'admin') {
      userData = await this.createAdminViaDB(name, email, password, phone);
    } else {
      const response = await fetch(`${this.apiUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          phone,
          primary_role,
          vehicle_type: vehicleType,
          country,
          city,
          area
        })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error(`Failed to create ${primary_role}: ${error}`);
        throw new Error(`Failed to create ${primary_role}: ${error}`);
      }

      const data = await response.json();

      // Manually set verification status if needed (skip rate limiting in tests)
      await fetch(`${this.apiUrl}/auth/verify-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      userData = data;
    }

    const userObj = {
      id: userData.user?.id || userData.id,
      name,
      email,
      password, // Plain password for testing
      token: userData.token,
      primary_role,
      phone,
      isVerified,
      isAvailable,
      country,
      city,
      area,
      vehicle_type: vehicleType
    };

    this.testUsers.push(userObj);
    return userObj;
  }

  async createAdminViaDB(name, email, password, phone) {
    const { Pool } = require('pg');
    const pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME_TEST || 'matrix_delivery_test',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    });

    // Ensure user exists via API registration as customer
    let existing = await pool.query('SELECT id, name, email FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    if (existing.rows.length === 0) {
      const regRes = await fetch(`${this.apiUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          phone,
          primary_role: 'customer',
          country: 'Egypt',
          city: 'Cairo',
          area: 'Downtown'
        })
      });
      if (!regRes.ok) {
        const errTxt = await regRes.text();
        console.error('Failed to register admin as customer:', errTxt);
        throw new Error(errTxt);
      }
      existing = await pool.query('SELECT id, name, email FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    }

    const user = existing.rows[0];

    // Update primary_role to admin and granted_roles array
    await pool.query('UPDATE users SET primary_role = $1, granted_roles = $2 WHERE id = $3', ['admin', ['admin'], user.id]);

    await pool.end();

    // Login to get a token with admin primary_role
    const loginRes = await fetch(`${this.apiUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!loginRes.ok) {
      const errTxt = await loginRes.text();
      console.error('Failed to login admin:', errTxt);
      throw new Error(errTxt);
    }
    const loginData = await loginRes.json();

    return {
      user: {
        id: user.id,
        name: name,
        email: email,
        primary_role: 'admin'
      },
      token: loginData.token
    };
  }

  async createUserViaDB(name, email, password, phone, primary_role = 'vendor') {
    const { Pool } = require('pg');
    const pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME_TEST || 'matrix_delivery_test',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    });

    // Ensure email unique
    const existing = await pool.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    let userId;
    if (existing.rows.length > 0) {
      userId = existing.rows[0].id;
      await pool.query('UPDATE users SET primary_role = $1 WHERE id = $2', [primary_role, userId]);
    } else {
      userId = `${Date.now().toString()}_${Math.random().toString(36).slice(2, 10)}`;
      await pool.query(
        `INSERT INTO users (id, name, email, password, phone, primary_role)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [userId, name, email.toLowerCase(), password || 'password123', phone || '+100000000', 'customer']
      );
    }

    await pool.end();

    const crypto = require('crypto');
    const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-12345';
    const header = { alg: 'HS256', typ: 'JWT' };
    const payload = { userId, email, name, primary_role };
    const base64url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const data = `${base64url(header)}.${base64url(payload)}`;
    const signature = crypto.createHmac('sha256', JWT_SECRET).update(data).digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const token = `${data}.${signature}`;

    return {
      user: { id: userId, name, email, primary_role },
      token
    };
  }

  async createOrder(customer, driver = null, title, description = 'Test order', price = 25.00, status = 'pending_bids') {
    const response = await fetch(`${this.apiUrl}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${customer.token}`
      },
      body: JSON.stringify({
        title,
        description,
        price,
        pickupLocation: {
          coordinates: { lat: 31.18662366666667, lng: 29.898968 },
          address: {
            personName: customer.name,
            street: 'Test Street',
            buildingNumber: '123',
            floor: '1',
            apartmentNumber: '4A',
            area: 'city_center',
            city: 'Alexandria',
            country: 'Egypt'
          }
        },
        dropoffLocation: {
          coordinates: { lat: 31.186990367294985, lng: 29.901266098022464 },
          address: {
            personName: 'Test Recipient',
            street: 'Destination Street',
            buildingNumber: '456',
            floor: '2',
            apartmentNumber: '7B',
            area: 'downtown',
            city: 'Alexandria',
            country: 'Egypt'
          }
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`Failed to create order: ${error}`);
      throw new Error(`Failed to create order: ${error}`);
    }

    const data = await response.json();
    const order = data;
    order.customer = customer;
    order.driver = driver;

    // If status is not pending_bids, update the order status
    if (status !== 'pending_bids') {
      await this.updateOrderStatus(order, status, driver);
    }

    this.testOrders.push(order);
    return order;
  }

  async updateOrderStatus(order, newStatus, driver = null) {
    // Handle status transitions
    const actions = {
      'accepted': async () => {
        if (!driver) throw new Error('Driver required for acceptance');
        await this.placeBidAndAccept(order, driver);
      },
      'picked_up': async () => {
        if (!driver) throw new Error('Driver required for pickup');
        await this.pickupOrder(order.id, driver);
      },
      'in_transit': async () => {
        if (!driver) throw new Error('Driver required for transit');
        await this.markInTransit(order.id, driver);
      },
      'delivered': async () => {
        if (!driver) throw new Error('Driver required for delivery');
        await this.deliverOrder(order.id, driver);
      },
      'cancelled': async () => {
        if (!driver) throw new Error('Driver required for cancellation');
        await this.cancelOrder(order.id, driver);
      }
    };

    const action = actions[newStatus];
    if (action) {
      await action();
    }
  }

  async placeBidAndAccept(order, driver) {
    // Place a bid
    await fetch(`${this.apiUrl}/orders/${order.id}/bid`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${driver.token}`
      },
      body: JSON.stringify({
        bidPrice: order.price,
        message: 'I can deliver this order'
      })
    });

    // Accept the bid
    const bidsResponse = await fetch(`${this.apiUrl}/orders/${order.id}`, {
      headers: {
        'Authorization': `Bearer ${order.customer.token}`
      }
    });

    if (bidsResponse.ok) {
      const orderData = await bidsResponse.json();
      if (orderData.bids && orderData.bids.length > 0) {
        const firstBid = orderData.bids[0];
        await fetch(`${this.apiUrl}/orders/${order.id}/accept-bid`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${order.customer.token}`
          },
          body: JSON.stringify({
            userId: firstBid.userId
          })
        });
      }
    }
  }

  async pickupOrder(orderId, driver) {
    await fetch(`${this.apiUrl}/orders/${orderId}/pickup`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${driver.token}`
      }
    });
  }

  async markInTransit(orderId, driver) {
    await fetch(`${this.apiUrl}/orders/${orderId}/in-transit`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${driver.token}`
      }
    });
  }

  async deliverOrder(orderId, driver) {
    await fetch(`${this.apiUrl}/orders/${orderId}/complete`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${driver.token}`
      }
    });

    // Record payment
    await fetch(`${this.apiUrl}/orders/${orderId}/payment/cod`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${driver.token}`
      }
    });
  }

  async cancelOrder(orderId, driver) {
    // Cancel via admin endpoint
    const adminUser = this.testUsers.find(u => u.primary_role === 'admin');
    if (adminUser) {
      await fetch(`${this.apiUrl}/admin/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminUser.token}`
        },
        body: JSON.stringify({
          reason: 'Test cancellation'
        })
      });
    }
  }

  async seed() {
    console.log('🌱 Seeding comprehensive test data...');

    try {
      // Wait for server to be ready
      await this.waitForServer();

      // Create timestamp for unique emails
      const timestamp = Date.now();

      console.log('👥 Creating test users...');

      // Create users of all granted_roles
      const customers = [];
      const drivers = [];
      let admin;

      // Create customers with different states
      customers.push(await this.createUser('Test Customer 1', `customer1_${timestamp}@test.com`, 'test123', '+201234567890', 'customer', null, true, true, 'Egypt', 'Alexandria', 'city_center'));
      customers.push(await this.createUser('Test Customer 2', `customer2_${timestamp}@test.com`, 'test123', '+201234567891', 'customer', null, true, true, 'Egypt', 'Cairo', 'downtown'));
      customers.push(await this.createUser('Unverified Customer', `unverified_${timestamp}@test.com`, 'test123', '+201234567892', 'customer', null, false, true, 'Egypt', 'Alexandria', 'east'));

      // Create drivers with different vehicle types
      drivers.push(await this.createUser('Test Driver Bike', `driver_bike_${timestamp}@test.com`, 'test123', '+201987654321', 'driver', 'bike', true, true, 'Egypt', 'Alexandria', 'city_center'));
      drivers.push(await this.createUser('Test Driver Car', `driver_car_${timestamp}@test.com`, 'test123', '+201987654322', 'driver', 'car', true, true, 'Egypt', 'Cairo', 'downtown'));
      drivers.push(await this.createUser('Test Driver Truck', `driver_truck_${timestamp}@test.com`, 'test123', '+201987654323', 'driver', 'truck', true, true, 'Egypt', 'Alexandria', 'west'));
      drivers.push(await this.createUser('Unavailable Driver', `driver_unavail_${timestamp}@test.com`, 'test123', '+201987654324', 'driver', 'bike', true, false, 'Egypt', 'Alexandria', 'north'));

      // Create admin
      admin = await this.createUser('Test Admin', `admin_${timestamp}@test.com`, 'test123', '+201000000000', 'admin', null, true, true, 'Egypt', 'Cairo', 'admin_area');

      console.log('✅ Test users created');

      // Update driver locations for active drivers
      console.log('📍 Setting up driver locations...');
      for (const driver of drivers.filter(d => d.isAvailable)) {
        await fetch(`${this.apiUrl}/drivers/location`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${driver.token}`
          },
          body: JSON.stringify({
            latitude: 31.18662366666667 + (Math.random() - 0.5) * 0.01,
            longitude: 29.898968 + (Math.random() - 0.5) * 0.01
          })
        });
      }
      console.log('✅ Driver locations set');

      console.log('📦 Creating test orders in different states...');

      // Create orders in different states
      const orders = [];

      // Pending bids orders
      orders.push(await this.createOrder(customers[0], null, 'Order 1 - Pending Bids', 'Test order 1', 25.00, 'pending_bids'));
      orders.push(await this.createOrder(customers[1], null, 'Order 2 - Pending Bids', 'Test order 2', 30.00, 'pending_bids'));
      orders.push(await this.createOrder(customers[0], null, 'Order 3 - Pending Bids', 'Test order 3', 20.00, 'pending_bids'));

      // Accepted orders
      orders.push(await this.createOrder(customers[1], drivers[0], 'Order 4 - Accepted', 'Test order 4', 35.00, 'accepted'));
      orders.push(await this.createOrder(customers[0], drivers[1], 'Order 5 - Accepted', 'Test order 5', 40.00, 'accepted'));

      // Picked up orders
      orders.push(await this.createOrder(customers[1], drivers[2], 'Order 6 - Picked Up', 'Test order 6', 28.00, 'picked_up'));

      // In transit orders
      orders.push(await this.createOrder(customers[0], drivers[0], 'Order 7 - In Transit', 'Test order 7', 45.00, 'in_transit'));

      // Delivered orders (with payment)
      orders.push(await this.createOrder(customers[1], drivers[1], 'Order 8 - Delivered', 'Test order 8', 50.00, 'delivered'));
      orders.push(await this.createOrder(customers[0], drivers[2], 'Order 9 - Delivered', 'Test order 9', 22.00, 'delivered'));

      // Cancelled order
      orders.push(await this.createOrder(customers[1], drivers[0], 'Order 10 - Cancelled', 'Test order 10', 33.00, 'cancelled'));

      console.log('✅ Test orders created');

      // Create some reviews
      console.log('⭐ Creating test reviews...');
      await this.createTestReviews(orders, customers, drivers);
      console.log('✅ Test reviews created');

      // Store test data for use in tests
      return {
        users: {
          customers,
          drivers,
          admin
        },
        orders,
        allUsers: [...customers, ...drivers, admin],
        // Convenience getters
        customer: customers[0],
        driver: drivers[0],
        admin
      };
    } catch (error) {
      console.error('❌ Error seeding database:', error);
      throw error;
    }
  }

  async createTestReviews(orders, customers, drivers) {
    const deliveredOrders = orders.filter(o => o.status === 'delivered');

    for (const order of deliveredOrders.slice(0, 3)) { // Create reviews for first 3 delivered orders
      if (order.driver) {
        // Customer reviews driver
        await fetch(`${this.apiUrl}/orders/${order.id}/review`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${order.customer.token}`
          },
          body: JSON.stringify({
            reviewType: 'customer_to_driver',
            rating: Math.floor(Math.random() * 3) + 3, // 3-5 stars
            comment: 'Good delivery service',
            professionalismRating: Math.floor(Math.random() * 2) + 4,
            communicationRating: Math.floor(Math.random() * 2) + 4,
            timelinessRating: Math.floor(Math.random() * 2) + 4,
            conditionRating: Math.floor(Math.random() * 2) + 4
          })
        });

        // Driver reviews customer
        await fetch(`${this.apiUrl}/orders/${order.id}/review`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${order.driver.token}`
          },
          body: JSON.stringify({
            reviewType: 'driver_to_customer',
            rating: Math.floor(Math.random() * 2) + 4, // 4-5 stars
            comment: 'Pleasant customer',
            professionalismRating: Math.floor(Math.random() * 1) + 5,
            communicationRating: Math.floor(Math.random() * 1) + 5,
            timelinessRating: Math.floor(Math.random() * 1) + 5,
            conditionRating: Math.floor(Math.random() * 1) + 5
          })
        });
      }
    }
  }

  // Utility methods for tests
  getUserByRole(primary_role) {
    return this.testUsers.find(u => u.primary_role === primary_role);
  }

  getUsersByRole(primary_role) {
    return this.testUsers.filter(u => u.primary_role === primary_role);
  }

  getOrderByStatus(status) {
    return this.testOrders.find(o => o.status === status);
  }

  getOrdersByStatus(status) {
    return this.testOrders.filter(o => o.status === status);
  }

  getActiveOrder() {
    return this.testOrders.find(o => ['accepted', 'picked_up', 'in_transit'].includes(o.status));
  }
}

module.exports = new DBSeeder();
