const dotenv = require('dotenv');
dotenv.config();

class DBSeeder {
  constructor() {
    this.apiUrl = 'http://localhost:5000/api';
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

  async seed() {
    console.log('🌱 Seeding test data...');

    try {
      // Wait for server to be ready
      await this.waitForServer();

      // Create timestamps for unique emails
      const timestamp = Date.now();

      // Create test users via API
      const customerResponse = await fetch(`${this.apiUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Customer',
          email: `customer_${timestamp}@test.com`,
          password: 'test123',
          phone: '+1234567890',
          role: 'customer'
        })
      });

      const driverResponse = await fetch(`${this.apiUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Driver',
          email: `driver_${timestamp}@test.com`,
          password: 'test123',
          phone: '+1987654321',
          role: 'driver',
          vehicle_type: 'bike'
        })
      });

      if (!customerResponse.ok || !driverResponse.ok) {
        throw new Error('Failed to create test users');
      }

      const customerData = await customerResponse.json();
      const driverData = await driverResponse.json();

      console.log('✅ Test users created');

      // Store test data for use in tests
      return {
        customer: {
          id: customerData.user.id,
          name: customerData.user.name,
          email: customerData.user.email,
          password: 'test123', // Plain password for testing
          token: customerData.token,
          role: 'customer'
        },
        driver: {
          id: driverData.user.id,
          name: driverData.user.name,
          email: driverData.user.email,
          password: 'test123', // Plain password for testing
          token: driverData.token,
          role: 'driver'
        }
      };
    } catch (error) {
      console.error('❌ Error seeding database:', error);
      throw error;
    }
  }
}

module.exports = new DBSeeder();
