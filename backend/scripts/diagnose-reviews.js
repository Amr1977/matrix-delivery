const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

const backendRoot = path.resolve(__dirname, '..');
const envPath = path.join(backendRoot, '.env');

if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
} else {
    require('dotenv').config();
}

const poolConfig = { connectionString: process.env.DATABASE_URL };

const pool = new Pool(poolConfig);

async function diagnose() {
    try {
        console.log('🔍 Connecting to database...');

        // 1. Check if tables exist
        const tablesRes = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('reviews', 'review_votes', 'review_flags', 'users');
        `);

        const tables = tablesRes.rows.map(r => r.table_name);
        console.log('📋 Existing tables:', tables);

        if (tables.includes('reviews')) {
            // 2. Describe reviews table columns
            console.log('\n📊 Reviews Table Schema:');
            const columnsRes = await pool.query(`
                SELECT column_name, data_type, character_maximum_length, column_default, is_nullable
                FROM information_schema.columns 
                WHERE table_name = 'reviews'
                ORDER BY ordinal_position;
            `);
            console.table(columnsRes.rows);

            // 3. Check for specific columns conflicting
            const hasReviewType = columnsRes.rows.some(c => c.column_name === 'review_type');
            console.log(`\nHas 'review_type' column (new feature): ${hasReviewType}`);
        } else {
            console.log('❌ Reviews table does NOT exist.');
        }

        if (tables.includes('review_votes')) {
            console.log('\n📊 Review Votes Table Schema:');
            const votesCols = await pool.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'review_votes';
            `);
            console.table(votesCols.rows);
        }

        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

diagnose();
