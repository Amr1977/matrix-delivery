/**
 * WebSocket Connection Test
 * Tests the Socket.IO connection to the production server
 */
const { io } = require('socket.io-client');

const API_URL = 'https://matrix-api.oldantique50.com';

console.log('🔌 Testing WebSocket connection to:', API_URL);
console.log('-------------------------------------------\n');

const socket = io(API_URL, {
    transports: ['websocket'], // Force WebSocket only (skip polling)
    reconnection: false,
    timeout: 10000,
    path: '/socket.io/'
});

let connectionStartTime = Date.now();

socket.on('connect', () => {
    const elapsed = Date.now() - connectionStartTime;
    console.log('✅ CONNECTED via WebSocket!');
    console.log(`   Socket ID: ${socket.id}`);
    console.log(`   Transport: ${socket.io.engine.transport.name}`);
    console.log(`   Time: ${elapsed}ms\n`);

    console.log('🎉 WebSocket connection test PASSED!\n');
    process.exit(0);
});

socket.on('connect_error', (error) => {
    const elapsed = Date.now() - connectionStartTime;
    console.log('❌ CONNECTION ERROR!');
    console.log(`   Error: ${error.message}`);
    console.log(`   Time: ${elapsed}ms\n`);

    if (error.message.includes('websocket')) {
        console.log('⚠️  WebSocket upgrade failed - Apache may not be configured correctly.\n');
    }

    console.log('❌ WebSocket connection test FAILED!\n');
    process.exit(1);
});

socket.on('disconnect', (reason) => {
    console.log(`📡 Disconnected: ${reason}`);
});

// Timeout after 15 seconds
setTimeout(() => {
    console.log('⏰ TIMEOUT: No connection established within 15 seconds');
    console.log('❌ WebSocket connection test FAILED!\n');
    process.exit(1);
}, 15000);
