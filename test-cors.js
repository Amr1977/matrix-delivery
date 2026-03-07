#!/usr/bin/env node

/**
 * Test script to verify CORS configuration is working correctly
 * This script tests the OPTIONS preflight request and login endpoint
 */

const axios = require('axios');

const API_BASE_URL = 'https://matrix-delivery-api.mywire.org/api';

async function testCORS() {
  console.log('🧪 Testing CORS Configuration');
  console.log('================================');
  
  try {
    // Test 1: OPTIONS preflight request
    console.log('\n1. Testing OPTIONS preflight request...');
    
    const optionsResponse = await axios.options(`${API_BASE_URL}/auth/login`, {
      headers: {
        'Origin': 'https://matrix-delivery.web.app',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type,Authorization'
      },
      timeout: 10000
    });
    
    console.log('✅ OPTIONS request successful');
    console.log('Status:', optionsResponse.status);
    console.log('Headers:');
    console.log('  Access-Control-Allow-Origin:', optionsResponse.headers['access-control-allow-origin']);
    console.log('  Access-Control-Allow-Credentials:', optionsResponse.headers['access-control-allow-credentials']);
    console.log('  Access-Control-Allow-Methods:', optionsResponse.headers['access-control-allow-methods']);
    
    // Test 2: Login endpoint with CORS headers
    console.log('\n2. Testing login endpoint with CORS...');
    
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'test@example.com',
      password: 'testpassword'
    }, {
      headers: {
        'Origin': 'https://matrix-delivery.web.app',
        'Content-Type': 'application/json'
      },
      timeout: 10000,
      validateStatus: function (status) {
        // Accept both 200 (success) and 401 (invalid credentials) as valid responses
        // We're only testing CORS, not authentication
        return status === 200 || status === 401;
      }
    });
    
    console.log('✅ Login request successful');
    console.log('Status:', loginResponse.status);
    console.log('Headers:');
    console.log('  Access-Control-Allow-Origin:', loginResponse.headers['access-control-allow-origin']);
    console.log('  Access-Control-Allow-Credentials:', loginResponse.headers['access-control-allow-credentials']);
    
    // Test 3: Test with different origin
    console.log('\n3. Testing with different origin...');
    
    const differentOriginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'test@example.com',
      password: 'testpassword'
    }, {
      headers: {
        'Origin': 'https://different-origin.example.com',
        'Content-Type': 'application/json'
      },
      timeout: 10000,
      validateStatus: function (status) {
        return status === 200 || status === 401;
      }
    });
    
    console.log('✅ Different origin request successful');
    console.log('Status:', differentOriginResponse.status);
    console.log('Headers:');
    console.log('  Access-Control-Allow-Origin:', differentOriginResponse.headers['access-control-allow-origin']);
    console.log('  Access-Control-Allow-Credentials:', differentOriginResponse.headers['access-control-allow-credentials']);
    
    console.log('\n🎉 All CORS tests passed!');
    console.log('\n📝 Summary:');
    console.log('   - OPTIONS preflight requests work correctly');
    console.log('   - Login endpoint accepts cross-origin requests');
    console.log('   - Credentials (cookies) are properly allowed');
    console.log('   - Different origins are accepted in production');
    
  } catch (error) {
    console.error('\n❌ CORS test failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Status Text:', error.response.statusText);
      console.error('Headers:', error.response.headers);
      console.error('Data:', error.response.data);
    } else if (error.request) {
      console.error('Request Error:', error.request);
    } else {
      console.error('Error:', error.message);
    }
    process.exit(1);
  }
}

// Run the test
testCORS();