const { Client } = require('pg');

const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'matrix_delivery_test',
    password: '***REDACTED***',
    port: 5432,
});

client.connect()
    .then(() => {
        console.log('Connected successfully to matrix_delivery_test!');
        return client.end();
    })
    .catch(err => {
        console.error('Connection failed:', err.message);
        process.exit(1);
    });
