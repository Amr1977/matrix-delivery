#!/usr/bin/env node

require('dotenv').config();

console.log('\n📋 Database Configuration from .env:');
console.log('   DB_HOST:', process.env.DB_HOST || 'localhost');
console.log('   DB_PORT:', process.env.DB_PORT || '5432');
console.log('   DB_NAME:', process.env.DB_NAME || 'matrix_delivery_prod');
console.log('   DB_USER:', process.env.DB_USER || 'postgres');
console.log('   DB_PASSWORD:', process.env.DB_PASSWORD ? '***SET***' : '***NOT SET***');
console.log('\n');
