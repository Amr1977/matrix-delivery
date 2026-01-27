#!/usr/bin/env node

/**
 * Diagnostic script to identify backend startup issues
 * Run this on the server to debug PM2 deployment problems
 */

const fs = require('fs');
const path = require('path');

// Load environment variables FIRST
require('dotenv').config({ path: path.resolve(process.env.ENV_FILE || '.env') });

console.log('🔍 Matrix Delivery Backend Startup Diagnostics');
console.log('==============================================\n');

// Check 1: Environment file
console.log('1. Checking environment configuration...');
const envFile = process.env.ENV_FILE || '.env';
const envPath = path.resolve(envFile);

try {
  if (fs.existsSync(envPath)) {
    console.log(`✅ Environment file found: ${envPath}`);
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envLines = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));

    console.log('📋 Environment variables loaded:');
    envLines.forEach(line => {
      const [key] = line.split('=');
      console.log(`   - ${key}: ${process.env[key] ? '✅ Set' : '❌ Missing'}`);
    });
  } else {
    console.log(`❌ Environment file not found: ${envPath}`);
  }
} catch (error) {
  console.log(`❌ Error reading environment file: ${error.message}`);
}

// Check 2: Required dependencies
console.log('\n2. Checking required dependencies...');
const requiredDeps = [
  'express', 'cors', 'dotenv', 'jsonwebtoken', 'bcryptjs', 'pg',
  'socket.io', 'morgan'
];

requiredDeps.forEach(dep => {
  try {
    require.resolve(dep);
    console.log(`✅ ${dep}: Available`);
  } catch (error) {
    console.log(`❌ ${dep}: Missing - ${error.message}`);
  }
});

// Check 3: Database connection
console.log('\n3. Testing database connection...');
const { Pool } = require('pg');

const poolConfig = { connectionString: process.env.DATABASE_URL };

const pool = new Pool({
  ...poolConfig,
  max: 1,
  idleTimeoutMillis: 5000,
  connectionTimeoutMillis: 5000,
});

pool.connect()
  .then(async (client) => {
    console.log('✅ Database connection successful');

    // Test basic query
    try {
      const result = await client.query('SELECT 1 as test');
      console.log('✅ Basic query executed successfully');
    } catch (error) {
      console.log(`❌ Basic query failed: ${error.message}`);
    }

    // Check if tables exist
    try {
      const tablesResult = await client.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);
      console.log(`📋 Found ${tablesResult.rows.length} tables in database`);
      if (tablesResult.rows.length === 0) {
        console.log('⚠️  No tables found - database may need initialization');
      }
    } catch (error) {
      console.log(`❌ Table check failed: ${error.message}`);
    }

    client.release();
    await pool.end();
  })
  .catch(error => {
    console.log(`❌ Database connection failed: ${error.message}`);
    console.log('💡 Possible causes:');
    console.log('   - PostgreSQL server not running');
    console.log('   - Incorrect connection details');
    console.log('   - Database does not exist');
    console.log('   - Firewall blocking connection');
  });

// Check 4: Port availability
console.log('\n4. Checking port availability...');
const net = require('net');
const PORT = process.env.PORT || 5000;

const server = net.createServer();
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Port ${PORT} is available`);
  server.close();
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.log(`❌ Port ${PORT} is already in use`);
    console.log('💡 Another process is using this port');
  } else {
    console.log(`❌ Port check failed: ${error.message}`);
  }
});

// Check 5: File permissions
console.log('\n5. Checking file permissions...');
const criticalFiles = [
  'server.js',
  'ecosystem.config.js',
  'package.json',
  envFile
];

criticalFiles.forEach(file => {
  const filePath = path.resolve(file);
  try {
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      const isReadable = !!(stats.mode & parseInt('444', 8));
      const isExecutable = file.endsWith('.js') ? !!(stats.mode & parseInt('111', 8)) : true;

      console.log(`${isReadable && isExecutable ? '✅' : '❌'} ${file}: ${isReadable ? 'Readable' : 'Not readable'}${file.endsWith('.js') ? (isExecutable ? ', Executable' : ', Not executable') : ''}`);
    } else {
      console.log(`❌ ${file}: File not found`);
    }
  } catch (error) {
    console.log(`❌ ${file}: Permission check failed - ${error.message}`);
  }
});

// Check 6: Node.js version
console.log('\n6. Checking Node.js environment...');
console.log(`📋 Node.js version: ${process.version}`);
console.log(`📋 Platform: ${process.platform}`);
console.log(`📋 Architecture: ${process.arch}`);
console.log(`📋 Current working directory: ${process.cwd()}`);
console.log(`📋 Process UID: ${process.getuid ? process.getuid() : 'N/A'}`);
console.log(`📋 Process GID: ${process.getgid ? process.getgid() : 'N/A'}`);

// Check 7: Memory and resources
console.log('\n7. Checking system resources...');
const memUsage = process.memoryUsage();
console.log(`📋 Memory usage: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB used, ${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB total`);

// Final summary
setTimeout(() => {
  console.log('\n==============================================');
  console.log('🔍 Diagnostics complete');
  console.log('💡 If you see any ❌ errors above, they may be causing the PM2 startup failure');
  console.log('💡 Check PM2 logs with: pm2 logs matrix-delivery-backend');
  console.log('💡 Restart PM2 with: pm2 restart matrix-delivery-backend');
  process.exit(0);
}, 2000);
