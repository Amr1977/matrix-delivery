# Admin User Credentials

## Default Admin Account

An admin user has been created with the following credentials:

```
📧 Email:    admin@matrix-delivery.com
🔑 Password: Admin@Matrix2024!
```

## Usage

1. **Login to Admin Panel**:
   - Navigate to the application
   - Click "Login"
   - Enter the admin credentials above
   - You will have access to the Admin Panel

2. **Access Logs**:
   - Once logged in, click "Admin Panel" button
   - Navigate to the "Logs" tab
   - You can now view, filter, search, and export all system logs

## Security Notes

⚠️ **IMPORTANT**: 
- Change the default password after first login
- Keep these credentials secure
- Do not commit this file to version control in production
- Consider using environment variables for admin credentials in production

## Roles

The admin user has the following roles:
- `admin` - Full administrative access
- `customer` - Can create orders
- `driver` - Can accept bids and deliver orders

This allows the admin to test all aspects of the system.

## Recreating Admin User

If you need to recreate the admin user, run:

```bash
cd backend
node create-admin-user.js
```

The script will:
- Check if admin already exists
- Create new admin if not found
- Update roles if admin exists
- Display credentials
