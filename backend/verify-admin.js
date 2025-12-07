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

async function verifyAndFixAdmin() {
    try {
        const adminEmail = 'admin@matrix-delivery.com';
        const adminPassword = 'Admin@Matrix2024!';

        console.log('🔍 Checking admin user...\n');

        // Check if admin exists
        const result = await pool.query(
            'SELECT id, email, primary_role, roles, is_verified, password FROM users WHERE email = $1',
            [adminEmail]
        );

        if (result.rows.length === 0) {
            console.log('❌ Admin user not found!');
            console.log('💡 Run: node create-admin-user.js');
            await pool.end();
            return;
        }

        const admin = result.rows[0];
        console.log('✅ Admin user found');
        console.log('📧 Email:', admin.email);
        console.log('👤 Role:', admin.role);
        console.log('🎭 Roles:', admin.roles);
        console.log('✓ Verified:', admin.is_verified);
        console.log('');

        // Test password
        console.log('🔐 Testing password...');
        const passwordMatch = await bcrypt.compare(adminPassword, admin.password);

        if (passwordMatch) {
            console.log('✅ Password is correct!');
            console.log('');
            console.log('═══════════════════════════════════════');
            console.log('✅ ADMIN CREDENTIALS ARE WORKING');
            console.log('═══════════════════════════════════════');
            console.log('📧 Email:    ', adminEmail);
            console.log('🔑 Password: ', adminPassword);
            console.log('═══════════════════════════════════════');
        } else {
            console.log('❌ Password does NOT match!');
            console.log('🔧 Resetting password...\n');

            // Hash new password
            const newHash = await bcrypt.hash(adminPassword, 10);

            // Update password
            await pool.query(
                'UPDATE users SET password = $1 WHERE email = $2',
                [newHash, adminEmail]
            );

            console.log('✅ Password has been reset!');
            console.log('');
            console.log('═══════════════════════════════════════');
            console.log('✅ ADMIN PASSWORD RESET SUCCESSFUL');
            console.log('═══════════════════════════════════════');
            console.log('📧 Email:    ', adminEmail);
            console.log('🔑 Password: ', adminPassword);
            console.log('═══════════════════════════════════════');
        }

        // Ensure correct roles
        if (!admin.roles || !admin.roles.includes('admin')) {
            console.log('\n🔧 Fixing roles...');
            await pool.query(
                `UPDATE users SET 
         roles = ARRAY['admin', 'customer', 'driver'],
         role = 'admin',
         is_verified = true
         WHERE email = $1`,
                [adminEmail]
            );
            console.log('✅ Roles updated');
        }

        console.log('\n💡 You can now log in with these credentials');
        await pool.end();

    } catch (error) {
        console.error('❌ Error:', error.message);
        await pool.end();
        process.exit(1);
    }
}

verifyAndFixAdmin();
