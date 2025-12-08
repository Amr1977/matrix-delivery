/**
 * Simplified SQL tests for statistics endpoints
 * Focuses on verifying the SQL queries work correctly without importing the full server
 */

const pool = require('../config/db');

describe('Statistics SQL Queries - Bug Fixes', () => {
    afterAll(async () => {
        await pool.end();
    });

    describe('SQL Query Correctness', () => {
        it('should query users by primary_role without errors', async () => {
            const query = `SELECT primary_role, COUNT(*) as count FROM users GROUP BY primary_role`;

            const result = await pool.query(query);

            expect(result.rows).toBeDefined();
            expect(Array.isArray(result.rows)).toBe(true);
            // Should not throw "column role does not exist" error
        });

        it('should query users by granted_roles array without errors', async () => {
            const query = `SELECT COUNT(*) as count FROM users WHERE 'driver' = ANY(granted_roles)`;

            const result = await pool.query(query);

            expect(result.rows).toBeDefined();
            expect(result.rows[0]).toHaveProperty('count');
            expect(typeof parseInt(result.rows[0].count)).toBe('number');
        });

        it('should use UNNEST on granted_roles without errors', async () => {
            const query = `
        SELECT role, COUNT(DISTINCT user_id) as count
        FROM (
          SELECT id as user_id, UNNEST(granted_roles) as role
          FROM users
          WHERE granted_roles IS NOT NULL
        ) subquery
        WHERE role IN ('customer', 'admin', 'support', 'driver')
        GROUP BY role
      `;

            const result = await pool.query(query);

            expect(result.rows).toBeDefined();
            expect(Array.isArray(result.rows)).toBe(true);
        });
    });

    describe('Database Schema Validation', () => {
        it('should have granted_roles column in users table', async () => {
            const result = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'granted_roles'
      `);

            expect(result.rows.length).toBe(1);
            expect(result.rows[0].data_type).toBe('ARRAY');
        });

        it('should have primary_role column in users table', async () => {
            const result = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'primary_role'
      `);

            expect(result.rows.length).toBe(1);
            expect(result.rows[0].data_type).toBe('character varying');
        });

        it('should NOT have old "role" column in users table', async () => {
            const result = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'role'
      `);

            expect(result.rows.length).toBe(0);
        });

        it('should have granted_roles populated for all users', async () => {
            const result = await pool.query(`
        SELECT COUNT(*) as count 
        FROM users 
        WHERE granted_roles IS NULL OR array_length(granted_roles, 1) IS NULL
      `);

            expect(parseInt(result.rows[0].count)).toBe(0);
        });

        it('should have primary_role included in granted_roles for all users', async () => {
            const result = await pool.query(`
        SELECT COUNT(*) as count 
        FROM users 
        WHERE NOT (primary_role = ANY(granted_roles))
      `);

            expect(parseInt(result.rows[0].count)).toBe(0);
        });
    });

    describe('Statistics Queries from server.js', () => {
        it('should execute footer stats query without column role error', async () => {
            // This is the exact query from server.js line 1012 (after fix)
            const query = `SELECT primary_role, COUNT(*) as count FROM users GROUP BY primary_role`;

            const result = await pool.query(query);

            expect(result.rows).toBeDefined();
            // Verify we can access primary_role (not role)
            result.rows.forEach(row => {
                expect(row).toHaveProperty('primary_role');
                expect(row).toHaveProperty('count');
                expect(row).not.toHaveProperty('role'); // Old column should not exist
            });
        });
    });

    describe('Statistics Queries from routes/statistics.js', () => {
        it('should count drivers by granted_roles', async () => {
            const query = `SELECT COUNT(*) as count FROM users WHERE 'driver' = ANY(granted_roles)`;

            const result = await pool.query(query);

            expect(result.rows[0]).toHaveProperty('count');
            expect(typeof parseInt(result.rows[0].count)).toBe('number');
        });

        it('should count customers by granted_roles', async () => {
            const query = `SELECT COUNT(*) as count FROM users WHERE 'customer' = ANY(granted_roles)`;

            const result = await pool.query(query);

            expect(result.rows[0]).toHaveProperty('count');
            expect(typeof parseInt(result.rows[0].count)).toBe('number');
        });

        it('should count admins by granted_roles', async () => {
            const query = `SELECT COUNT(*) as count FROM users WHERE 'admin' = ANY(granted_roles)`;

            const result = await pool.query(query);

            expect(result.rows[0]).toHaveProperty('count');
            expect(typeof parseInt(result.rows[0].count)).toBe('number');
        });
    });
});
