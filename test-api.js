const fetch = require('node-fetch');

async function testAPI() {
  try {
    const response = await fetch('http://localhost:5000/api/orders?lat=49.50380954152215&lng=33.04687500000001', {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxNzY0NDgyOTQzODM0bjN4dTB1YzJnIiwiZW1haWwiOiJ1c2VyQGRyaXZlci5jb20iLCJuYW1lIjoiVGVzdCBkcml2ZXIiLCJyb2xlIjoiZHJpdmVyIiwicm9sZXMiOlsiZHJpdmVyIl0sImlhdCI6MTc2NDUyOTUzNywiZXhwIjoxNzY3MTIxNTM3fQ.7AoUzKLpOUWhB60jY7-MUoTZbxkMsg2CwJ32GLv1-GQ'
      }
    });

    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Orders returned:', data.length);
    if (data.length > 0) {
      console.log('First order pickup coordinates:', data[0].from);
      console.log('First order ID:', data[0]._id);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testAPI();
