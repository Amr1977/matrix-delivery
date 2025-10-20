const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');

class DBSeeder {
  constructor() {
    // Use a test database file
    this.dbPath = path.join(__dirname, '../../test-db.sqlite');
    this.sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: this.dbPath,
      logging: false
    });
  }

  async connect() {
    try {
      await this.sequelize.authenticate();
      console.log('Database connection has been established successfully.');
      return true;
    } catch (error) {
      console.error('Unable to connect to the database:', error);
      return false;
    }
  }

  async clearDatabase() {
    // Drop all tables
    await this.sequelize.drop();
    console.log('Database cleared');
  }

  async seed() {
    try {
      // Import models from your application
      const { User, Order, Bid } = require('../../backend/models');
      
      // Create test users
      const [customer, driver] = await Promise.all([
        User.create({
          name: 'Test Customer',
          email: 'customer@test.com',
          password: 'password123',
          role: 'customer',
          phone: '+1234567890'
        }),
        User.create({
          name: 'Test Driver',
          email: 'driver@test.com',
          password: 'password123',
          role: 'driver',
          phone: '+1987654321',
          vehicleType: 'bike',
          licensePlate: 'TEST123'
        })
      ]);

      // Create test orders
      const order = await Order.create({
        customerId: customer.id,
        pickupAddress: '123 Test St, Test City',
        deliveryAddress: '456 Delivery Ave, Test City',
        itemDescription: 'Test Package',
        itemWeight: 2.5,
        status: 'pending',
        price: 25.00
      });

      // Create test bids
      await Bid.create({
        orderId: order.id,
        driverId: driver.id,
        amount: 20.00,
        status: 'pending',
        message: 'I can deliver this quickly!'
      });

      console.log('Database seeded with test data');
      
      // Store test data for use in tests
      return {
        customer: {
          ...customer.toJSON(),
          password: 'password123' // Include plain password for testing
        },
        driver: {
          ...driver.toJSON(),
          password: 'password123' // Include plain password for testing
        },
        order: order.toJSON()
      };
    } catch (error) {
      console.error('Error seeding database:', error);
      throw error;
    }
  }

  async close() {
    await this.sequelize.close();
  }
}

module.exports = new DBSeeder();
