const { Client } = require('pg');
require('dotenv').config({ path: 'backend/.env.testing' });

let config;
let dbName;

try {
    const url = new URL(process.env.DATABASE_URL);
    dbName = url.pathname.substring(1);
    config.user = url.username;
    config.password = url.password;
    config.host = url.hostname;
    config.port = url.port || 5432;
    // Keep config.database as 'postgres'
} catch (e) {
    console.warn('Failed to parse DATABASE_URL, falling back to individual variables');
}

async function createTestDatabase() {
    const client = new Client(config);

    try {
        await client.connect();
        console.log('Connected to PostgreSQL...');

        const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = '${dbName}'`);

        if (res.rowCount === 0) {
            console.log(`Database ${dbName} does not exist. Creating...`);
            // terminate other connections to the database if any (though it's new, so unlikely)
            await client.query(`CREATE DATABASE "${dbName}"`);
            console.log(`Database ${dbName} created successfully.`);
        } else {
            console.log(`Database ${dbName} already exists.`);
        }

    } catch (err) {
        console.error('Error creating test database:', err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

createTestDatabase();
