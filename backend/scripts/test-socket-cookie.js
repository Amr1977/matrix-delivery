const io = require('socket.io-client');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const path = require('path');

// Load env
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../.env.testing') }); // Override if testing

const JWT_SECRET = process.env.JWT_SECRET;
const PORT = process.env.PORT || 5000;
const URL = `http://localhost:${PORT}`;

if (!JWT_SECRET) {
    console.error('❌ JWT_SECRET not found in environment');
    process.exit(1);
}

// Generate valid token
const token = jwt.sign(
    { userId: 'test-user-1', email: 'test@example.com', name: 'Test User', role: 'customer' },
    JWT_SECRET,
    { expiresIn: '1h', issuer: 'matrix-delivery', audience: 'matrix-delivery-api' }
);

console.log(`🔑 Generated token: ${token.substring(0, 20)}...`);

// Test 1: Connect with "authenticated" token but valid cookie
console.log('\n🧪 Test 1: Connecting with "authenticated" token + valid cookie...');
const socket1 = io(URL, {
    auth: { token: 'authenticated' },
    extraHeaders: {
        Cookie: `token=${token}`
    },
    transports: ['websocket', 'polling'], // Force websocket to avoid polling issues
});

socket1.on('connect', () => {
    console.log('✅ Test 1 PASSED: Connected successfully with cookie!');
    socket1.disconnect();
});

socket1.on('connect_error', (err) => {
    console.error(`❌ Test 1 FAILED: Connection error: ${err.message}`);
    socket1.disconnect();
});

// Test 2: Connect with valid token in auth (legacy support)
setTimeout(() => {
    console.log('\n🧪 Test 2: Connecting with valid token in auth (legacy)...');
    const socket2 = io(URL, {
        auth: { token: token },
        transports: ['websocket', 'polling'],
    });

    socket2.on('connect', () => {
        console.log('✅ Test 2 PASSED: Connected successfully with auth token!');
        socket2.disconnect();
    });

    socket2.on('connect_error', (err) => {
        console.error(`❌ Test 2 FAILED: Connection error: ${err.message}`);
        socket2.disconnect();
    });
}, 2000);

// Test 3: Connect with "authenticated" token but NO cookie (should fail)
setTimeout(() => {
    console.log('\n🧪 Test 3: Connecting with "authenticated" token but NO cookie (should fail)...');
    const socket3 = io(URL, {
        auth: { token: 'authenticated' },
        transports: ['websocket', 'polling'],
    });

    socket3.on('connect', () => {
        console.error('❌ Test 3 FAILED: Connected but should have failed!');
        socket3.disconnect();
    });

    socket3.on('connect_error', (err) => {
        console.log(`✅ Test 3 PASSED: Connection rejected as expected: ${err.message}`);
        socket3.disconnect();
    });
}, 4000);
