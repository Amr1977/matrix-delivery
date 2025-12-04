# Admin Credentials Issue - Quick Fix

## Problem
Admin credentials not working for login.

## Solution

### Step 1: Verify Admin User Exists

Run this command to check if admin user exists:

```bash
cd backend
node create-admin-user.js
```

### Step 2: Reset Admin Password

If the admin user exists but password doesn't work, update it manually:

```sql
-- Connect to database
psql -U postgres -d matrix_delivery

-- Update admin password (hashed version of: Admin@Matrix2024!)
UPDATE users 
SET password = '$2a$10$YourHashedPasswordHere'
WHERE email = 'admin@matrix-delivery.com';
```

### Step 3: Alternative - Create New Admin

Delete existing admin and recreate:

```sql
-- Delete existing admin
DELETE FROM users WHERE email = 'admin@matrix-delivery.com';
```

Then run:
```bash
node create-admin-user.js
```

### Step 4: Verify Roles

Ensure admin has correct roles:

```sql
UPDATE users 
SET roles = ARRAY['admin', 'customer', 'driver'],
    role = 'admin',
    is_verified = true
WHERE email = 'admin@matrix-delivery.com';
```

## Current Credentials

After running `create-admin-user.js`:

```
Email: admin@matrix-delivery.com
Password: Admin@Matrix2024!
```

## Testing Login

1. Start the backend server
2. Try logging in with credentials above
3. If still not working, check browser console for specific error
4. Check backend logs for authentication errors

## Common Issues

1. **Wrong password hash**: The create-admin-user script should hash the password correctly
2. **Missing roles array**: Ensure `roles` column contains `['admin']`
3. **Not verified**: Ensure `is_verified = true`
4. **Case sensitivity**: Email should be lowercase

## Manual Password Hash

If you need to manually set the password, use this Node.js script:

```javascript
const bcrypt = require('bcryptjs');
const password = 'Admin@Matrix2024!';
bcrypt.hash(password, 10).then(hash => console.log(hash));
```

Then update the database with the generated hash.
