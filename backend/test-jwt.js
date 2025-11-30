const jwt = require('jsonwebtoken');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxNzY0NDgyOTQzODM0bjN4dTB1YzJnIiwiZW1haWwiOiJ1c2VyQGRyaXZlci5jb20iLCJuYW1lIjoiVGVzdCBkcml2ZXIiLCJyb2xlIjoiZHJpdmVyIiwicm9sZXMiOlsiZHJpdmVyIl0sImlhdCI6MTc2NDUyOTUzNywiZXhwIjoxNzY3MTIxNTM3fQ.7AoUzKLpOUWhB60jY7-MUoTZbxkMsg2CwJ32GLv1-GQ';

try {
  // Try to decode without verification first
  const decoded = jwt.decode(token);
  console.log('Decoded JWT:', JSON.stringify(decoded, null, 2));

  // Check if it matches our user
  console.log('User ID:', decoded.userId);
  console.log('Role:', decoded.role);
  console.log('Email:', decoded.email);
} catch (e) {
  console.error('Failed to decode JWT:', e.message);
}
