require('ts-node').register();
const { initDatabase } = require('./database/startup');
const pool = require('./config/db');

async function check() {
    try {
        console.log('Connecting...');
        await initDatabase(pool);
        console.log('Init success.');

        const res = await pool.query('SELECT to_regclass(\'public.platform_reviews\') as exists');
        console.log('Table exists:', res.rows[0].exists);

        await pool.end();
    } catch (e) {
        console.error('FAIL:', e);
        process.exit(1);
    }
}

check();
