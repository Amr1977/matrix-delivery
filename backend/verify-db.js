const { Client } = require('pg');

const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres',
    password: 'be_the_one',
    port: 5432,
});

client.connect()
    .then(() => {
        console.log('Connected successfully!');
        return client.end();
    })
    .catch(err => {
        console.error('Connection failed:', err.message);
        process.exit(1);
    });
