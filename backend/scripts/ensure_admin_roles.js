const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' });

const poolConfig = { connectionString: process.env.DATABASE_URL };

const pool = new Pool(poolConfig);

async function run() {
    try {
        const res = await pool.query('SELECT * FROM users WHERE name = \'admin\'');
        if (res.rows.length === 0) {
            console.log('Admin user not found, creating or skipping.');
            // Create if needed, but assuming it exists
        } else {
            const user = res.rows[0];
            console.log('Found admin:', user.id);

            // Update granted_roles
            const update = await pool.query(`
        UPDATE users 
        SET 
          granted_roles = '["admin", "driver", "customer"]'::jsonb, 
          primary_role = 'admin',
          primary_role = 'admin' 
        WHERE id = $1 
        RETURNING *
      `, [user.id]);

            console.log('Updated admin granted_roles:', update.rows[0].granted_roles);
        }
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

run();
