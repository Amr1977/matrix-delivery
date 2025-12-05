const { Client } = require('pg');
require('dotenv').config({ path: 'backend/.env.testing' });

const config = {
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: 'postgres' // Connect to default postgres DB to create new DB
};

async function createTestDatabase() {
    const client = new Client(config);

    try {
        await client.connect();
        console.log('Connected to PostgreSQL...');

        const dbName = process.env.DB_NAME || 'matrix_delivery_test';

        // Check if database exists
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
