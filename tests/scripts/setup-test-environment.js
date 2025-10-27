#!usrbinenv node


  Test Environment Setup Script
  Prepares the test environment for BDD test execution
 

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');

const execAsync = promisify(exec);

 Colors for console output
const colors = {
  reset 'x1b[0m',
  green 'x1b[32m',
  red 'x1b[31m',
  yellow 'x1b[33m',
  blue 'x1b[34m',
  cyan 'x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function checkNodeVersion() {
  log('n📦 Checking Node.js version...', 'cyan');
  
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
  
  if (majorVersion  18) {
    log(`❌ Node.js version ${nodeVersion} is too old. Requires = 18.0.0`, 'red');
    process.exit(1);
  }
  
  log(`✅ Node.js ${nodeVersion} - OK`, 'green');
}

async function installDependencies() {
  log('n📚 Installing dependencies...', 'cyan');
  
  try {
    await execAsync('npm install');
    log('✅ Dependencies installed', 'green');
  } catch (error) {
    log(`❌ Failed to install dependencies ${error.message}`, 'red');
    process.exit(1);
  }
}

async function checkPostgresConnection() {
  log('n🗄️  Checking PostgreSQL connection...', 'cyan');
  
  const { Pool } = require('pg');
  const pool = new Pool({
    host process.env.DB_HOST  'localhost',
    port process.env.DB_PORT  5432,
    user process.env.DB_USER  'postgres',
    password process.env.DB_PASSWORD  'postgres',
    database 'postgres'  Connect to default database first
  });
  
  try {
    await pool.query('SELECT 1');
    log('✅ PostgreSQL connection - OK', 'green');
    await pool.end();
  } catch (error) {
    log(`❌ PostgreSQL connection failed ${error.message}`, 'red');
    log('nTroubleshooting', 'yellow');
    log('  1. Ensure PostgreSQL is running sudo service postgresql start', 'yellow');
    log('  2. Check credentials in .env.test', 'yellow');
    log('  3. Verify network access to database', 'yellow');
    process.exit(1);
  }
}

async function createTestDatabase() {
  log('n🏗️  Setting up test database...', 'cyan');
  
  const { Pool } = require('pg');
  const dbName = process.env.DB_NAME_TEST  'matrix_delivery_test';
  
   Connect to default postgres database
  const pool = new Pool({
    host process.env.DB_HOST  'localhost',
    port process.env.DB_PORT  5432,
    user process.env.DB_USER  'postgres',
    password process.env.DB_PASSWORD  'postgres',
    database 'postgres'
  });
  
  try {
     Check if database exists
    const result = await pool.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    );
    
    if (result.rows.length === 0) {
       Create database
      await pool.query(`CREATE DATABASE ${dbName}`);
      log(`✅ Test database '${dbName}' created`, 'green');
    } else {
      log(`✅ Test database '${dbName}' already exists`, 'green');
    }
    
    await pool.end();
  } catch (error) {
    log(`❌ Failed to create test database ${error.message}`, 'red');
    await pool.end();
    process.exit(1);
  }
}

async function checkServerRunning() {
  log('n🚀 Checking if server is running...', 'cyan');
  
  const apiUrl = process.env.API_BASE_URL  'httplocalhost5000api';
  
  try {
    const fetch = require('node-fetch');
    const response = await fetch(`${apiUrl}health`);
    
    if (response.ok) {
      const data = await response.json();
      log(`✅ Server is running (${data.status})`, 'green');
      log(`   Database ${data.database}`, 'blue');
      log(`   Version ${data.version}`, 'blue');
    } else {
      log('⚠️  Server is running but returned error', 'yellow');
    }
  } catch (error) {
    log('⚠️  Server is not running', 'yellow');
    log('   Start server npm start', 'blue');
    log('   Or run in separate terminal for tests', 'blue');
  }
}

async function createEnvFile() {
  log('n⚙️  Checking environment configuration...', 'cyan');
  
  const envTestPath = path.join(process.cwd(), '.env.test');
  
  try {
    await fs.access(envTestPath);
    log('✅ .env.test file exists', 'green');
  } catch {
    log('⚠️  .env.test file not found. Creating...', 'yellow');
    
    const envContent = `# Test Environment Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME_TEST=matrix_delivery_test
DB_USER=postgres
DB_PASSWORD=postgres
API_BASE_URL=httplocalhost5000api
NODE_ENV=test
JWT_SECRET=test_secret_key_do_not_use_in_production
`;
    
    await fs.writeFile(envTestPath, envContent);
    log('✅ .env.test file created', 'green');
    log('   Please review and update credentials if needed', 'blue');
  }
}

async function createReportsDirectory() {
  log('n📊 Setting up reports directory...', 'cyan');
  
  const reportsPath = path.join(process.cwd(), 'reports');
  
  try {
    await fs.access(reportsPath);
    log('✅ Reports directory exists', 'green');
  } catch {
    await fs.mkdir(reportsPath, { recursive true });
    log('✅ Reports directory created', 'green');
  }
}

async function validateFeatureFiles() {
  log('n📝 Validating feature files...', 'cyan');
  
  const featuresPath = path.join(process.cwd(), 'features');
  
  try {
    const files = await fs.readdir(featuresPath);
    const featureFiles = files.filter(f = f.endsWith('.feature'));
    
    if (featureFiles.length === 0) {
      log('❌ No feature files found', 'red');
      log('   Expected feature files in features', 'yellow');
      process.exit(1);
    }
    
    log(`✅ Found ${featureFiles.length} feature files`, 'green');
    featureFiles.forEach(file = {
      log(`   - ${file}`, 'blue');
    });
  } catch (error) {
    log('❌ Features directory not found', 'red');
    log('   Create directory mkdir features', 'yellow');
    process.exit(1);
  }
}

async function runQuickTest() {
  log('n🧪 Running quick smoke test...', 'cyan');
  
  try {
    const { stdout } = await execAsync('npx cucumber-js --dry-run --format progress');
    const match = stdout.match((d+) scenarios);
    
    if (match) {
      const scenarioCount = parseInt(match[1]);
      log(`✅ Found ${scenarioCount} scenarios`, 'green');
    }
  } catch (error) {
    log('⚠️  Could not run dry-run test', 'yellow');
    log(`   ${error.message}`, 'yellow');
  }
}

async function printSummary() {
  log('n' + '='.repeat(60), 'cyan');
  log('✅ Test Environment Setup Complete!', 'green');
  log('='.repeat(60), 'cyan');
  
  log('n📋 Quick Start Commands', 'cyan');
  log('  npm test              - Run all tests', 'blue');
  log('  npm run testsmoke    - Run smoke tests (fast)', 'blue');
  log('  npm run testcritical - Run critical path tests', 'blue');
  log('  npm run testapi      - Run API tests only', 'blue');
  
  log('n📚 Next Steps', 'cyan');
  log('  1. Start the server npm start', 'blue');
  log('  2. Run smoke tests npm run testsmoke', 'blue');
  log('  3. Review test report open reportscucumber-report.html', 'blue');
  
  log('n💡 Tips', 'cyan');
  log('  - Use --tags to run specific scenarios', 'blue');
  log('  - Use --profile to run predefined test suites', 'blue');
  log('  - Check STEP_DEFINITIONS_README.md for detailed docs', 'blue');
  
  log('n');
}

async function main() {
  log('n🎯 P2P Delivery Platform - BDD Test Setup', 'cyan');
  log('━'.repeat(60), 'cyan');
  
  try {
    await checkNodeVersion();
    await createEnvFile();
    await installDependencies();
    await checkPostgresConnection();
    await createTestDatabase();
    await createReportsDirectory();
    await validateFeatureFiles();
    await checkServerRunning();
    await runQuickTest();
    await printSummary();
    
    process.exit(0);
  } catch (error) {
    log('n❌ Setup failed', 'red');
    log(error.message, 'red');
    process.exit(1);
  }
}

 Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { main };