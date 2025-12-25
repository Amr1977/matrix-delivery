const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env' });

const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

async function createAdminUser() {
    try {
        // Admin credentials
        const adminEmail = 'admin@matrix-delivery.com';
        const adminPassword = 'Admin@Matrix2024!';
        const adminName = 'System Administrator';
        const adminPhone = '+1234567890';

        // Check if admin already exists
        const existingAdmin = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [adminEmail]
        );

        if (existingAdmin.rows.length > 0) {
            console.log('✅ Admin user already exists');
            console.log('📧 Email:', adminEmail);
            console.log('🔑 Password: (unchanged)');

            // Ensure admin has admin primary_role
            const userId = existingAdmin.rows[0].id;
            await pool.query(
                `UPDATE users SET granted_roles = ARRAY['admin', 'customer', 'driver'] WHERE id = $1`,
                [userId]
            );
            console.log('✅ Admin granted_roles updated');

            await pool.end();
            return;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(adminPassword, 10);

        // Generate admin ID
        const adminId = 'admin_' + Date.now().toString(36) + Math.random().toString(36).substr(2);

        // Create admin user
        await pool.query(
            `INSERT INTO users (
        id, name, email, password, phone, primary_role, granted_roles, 
        is_verified, rating, completed_deliveries, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
            [
                adminId,
                adminName,
                adminEmail,
                hashedPassword,
                adminPhone,
                'admin',
                ['admin', 'customer', 'driver'], // Multiple granted_roles for flexibility
                true, // Verified
                5.0, // Perfect rating
                0, // No deliveries
            ]
        );

        console.log('✅ Admin user created successfully!');
        console.log('');
        console.log('═══════════════════════════════════════');
        console.log('📋 ADMIN CREDENTIALS');
        console.log('═══════════════════════════════════════');
        console.log('📧 Email:    ', adminEmail);
        console.log('🔑 Password: ', adminPassword);
        console.log('👤 Name:     ', adminName);
        console.log('📱 Phone:    ', adminPhone);
        console.log('🆔 User ID:  ', adminId);
        console.log('═══════════════════════════════════════');
        console.log('');
        console.log('⚠️  IMPORTANT: Save these credentials securely!');
        console.log('💡 You can use these to log in to the admin panel');
        console.log('');

        await pool.end();
    } catch (error) {
        console.error('❌ Error creating admin user:', error);
        await pool.end();
        process.exit(1);
    }
}

createAdminUser();
