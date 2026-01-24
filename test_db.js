const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'matrix_delivery',
  password: '***REDACTED***',
  port: 5432,
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Connection failed (matrix_delivery):', err);
  } else {
    console.log('Connection successful (matrix_delivery):', res.rows[0]);
  }
  pool.end();
});

const poolTest = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'matrix_delivery_test',
  password: '***REDACTED***',
  port: 5432,
});

poolTest.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Connection failed (matrix_delivery_test):', err);
  } else {
    console.log('Connection successful (matrix_delivery_test):', res.rows[0]);
  }
  poolTest.end();
});
