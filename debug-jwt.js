const jwt = require('jsonwebtoken');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxNzYxOTQxNDkxMjk1bDM2eWEyaml5IiwiZW1haWwiOiJhbXJAZGVsaXZlcnkuY29tIiwibmFtZSI6ImFtciBkZWxpdmVyeSIsInJvbGUiOiJkcml2ZXIiLCJpYXQiOjE3NjI0NTE1NjksImV4cCI6MTc2NTA0MzU2OX0.7eOIwv3ROrUK_2JqEr4q1GOIfBV5e5Vy1S-aXRK9Xns';

try {
  const decoded = jwt.decode(token);
  console.log('Decoded JWT:', JSON.stringify(decoded, null, 2));
  console.log('Token expired:', Date.now() > decoded.exp * 1000);
  console.log('Current time:', new Date().toISOString());
  console.log('Expiry time:', new Date(decoded.exp * 1000).toISOString());
} catch (e) {
  console.log('JWT decode error:', e.message);
}
