const jwt = require('jsonwebtoken');
const pool = require('../../config/db');

/**
 * BDD Test Helper - Creates a valid admin user and token for testing
 */
class BDDAuthHelper {
    constructor() {
        this.adminUser = null;
        this.adminToken = null;
    }

    async setupAdminUser() {
        try {
            // Check if test admin exists
            const existingAdmin = await pool.query(
                'SELECT * FROM users WHERE email = $1',
                ['bdd-admin@test.com']
            );

            if (existingAdmin.rows.length > 0) {
                this.adminUser = existingAdmin.rows[0];
            } else {
                // Create test admin user
                const result = await pool.query(
                    `INSERT INTO users (name, email, phone, primary_role, is_verified, is_available, password_hash)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)
                     RETURNING *`,
                    [
                        'BDD Test Admin',
                        'bdd-admin@test.com',
                        '+1234567890',
                        'admin',
                        true,
                        true,
                        '$2a$10$dummyhashforBDDtesting' // Dummy hash, won't be used for login
                    ]
                );
                this.adminUser = result.rows[0];
            }

            // Generate valid JWT token
            this.adminToken = jwt.sign(
                {
                    userId: this.adminUser.id,
                    email: this.adminUser.email,
                    primary_role: 'admin'
                },
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: '1h' }
            );

            return {
                user: this.adminUser,
                token: this.adminToken
            };
        } catch (error) {
            console.error('Failed to setup BDD admin user:', error);
            throw error;
        }
    }

    async cleanup() {
        try {
            if (this.adminUser) {
                // Optionally clean up test admin
                // await pool.query('DELETE FROM users WHERE email = $1', ['bdd-admin@test.com']);
            }
        } catch (error) {
            console.error('Failed to cleanup BDD admin user:', error);
        }
    }

    getToken() {
        return this.adminToken;
    }

    getUser() {
        return this.adminUser;
    }
}

module.exports = BDDAuthHelper;
