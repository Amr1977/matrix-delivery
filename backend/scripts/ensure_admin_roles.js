const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' });

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'matrix_db',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
});

async function run() {
    try {
        const res = await pool.query("SELECT * FROM users WHERE name = 'admin'");
        if (res.rows.length === 0) {
            console.log('Admin user not found, creating or skipping.');
            // Create if needed, but assuming it exists
        } else {
            const user = res.rows[0];
            console.log('Found admin:', user.id);

            // Update roles
            const update = await pool.query(`
        UPDATE users 
        SET 
          granted_roles = '["admin", "driver", "customer"]'::jsonb, 
          primary_role = 'admin',
          role = 'admin' 
        WHERE id = $1 
        RETURNING *
      `, [user.id]);

            console.log('Updated admin roles:', update.rows[0].granted_roles);
        }
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

run();
