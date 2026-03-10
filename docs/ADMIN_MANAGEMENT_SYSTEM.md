# Admin Management System Documentation

## Overview

The Matrix Delivery Admin Management System provides a unified, secure, and environment-aware solution for managing administrative users across all deployment environments (development, staging, production).

### Features

- **Unified Operations**: Single script handles both creating new admin users and promoting existing users
- **Multi-Environment Support**: Automatic environment detection and configuration loading
- **Secure Password Generation**: Cryptographically secure password generation for new admin accounts
- **Role-Based Access Control**: Proper management of primary_role and granted_roles arrays
- **Comprehensive Logging**: Detailed operation logging with user verification
- **Error Handling**: Robust error handling with helpful troubleshooting messages

### Architecture

```
Environment Files:
├── .env.development (Development environment)
├── .env.staging (Staging environment)
└── .env (Production environment)

Script Location:
backend/scripts/manage_admin.js

Database Schema:
users table with fields:
├── id (Primary key)
├── email (Unique identifier)
├── name (Display name)
├── primary_role (Current active role)
├── granted_roles (Array of allowed roles)
├── password_hash (Bcrypt hashed password)
├── is_verified (Account verification status)
└── Other user fields...
```

## Installation

### Prerequisites

- Node.js 14+ with npm
- PostgreSQL database connection
- Environment configuration files in `backend/` directory

### Setup

1. **Ensure script is executable**:
   ```bash
   cd backend/scripts
   chmod +x manage_admin.js
   ```

2. **Verify environment files exist**:
   ```bash
   ls -la ../.env*
   # Should show: .env, .env.development, .env.staging (if applicable)
   ```

3. **Test database connectivity**:
   ```bash
   node manage_admin.js promote test@example.com development
   # Should show connection successful message
   ```

## Usage

### Command Syntax

```bash
node manage_admin.js <command> <identifier> [environment]
```

### Commands

#### `create` - Create New Admin User

Creates a new user account with admin privileges and auto-generated credentials.

**Syntax**:
```bash
node manage_admin.js create <email> [environment]
```

**Parameters**:
- `email`: Email address for the new admin user
- `environment`: Optional, defaults to `development`

**Examples**:
```bash
# Create admin in development
node manage_admin.js create admin@company.com development

# Create admin in production
node manage_admin.js create admin@company.com production

# Create admin in staging (if configured)
node manage_admin.js create admin@company.com staging
```

**Output**:
```
✅ Admin user created successfully!

═══════════════════════════════════════
📋 NEW ADMIN CREDENTIALS
═══════════════════════════════════════
📧 Email:     admin@company.com
🔑 Password:  Admin@2024! (auto-generated)
👤 Name:      Administrator (admin@company.com)
📱 Phone:     +1234567890
🆔 User ID:   admin_xyz123
═══════════════════════════════════════

⚠️  IMPORTANT: Save these credentials securely!
💡 You can use these to log in to the admin panel
```

#### `promote` - Promote Existing User to Admin

Grants admin privileges to an existing user account.

**Syntax**:
```bash
node manage_admin.js promote <email_or_id> [environment]
```

**Parameters**:
- `email_or_id`: User email address or user ID to promote
- `environment`: Optional, defaults to `development`

**Examples**:
```bash
# Promote by email in development
node manage_admin.js promote user@company.com development

# Promote by user ID in production
node manage_admin.js promote 17731491451949wwd9o919 production

# Promote in staging
node manage_admin.js promote admin@staging.com staging
```

**Output**:
```
⬆️  Promoting user to admin: user@company.com

👤 USER FOUND:
ID:             17731491451949wwd9o919
Email:          user@company.com
Name:           John Doe
Current Role:   customer
Granted Roles:  customer, driver
Verified:       Yes

✅ User promoted to admin successfully!

📋 UPDATED USER INFO:
Primary Role:   admin
Granted Roles:  admin, customer, driver

🔍 VERIFICATION:
Primary Role:   admin
Granted Roles:  admin, customer, driver

🎉 Promotion complete! User can now access admin features.
```

### Environment Handling

The script automatically loads the appropriate environment configuration:

| Environment | Config File | Database | Use Case |
|-------------|-------------|----------|----------|
| `development` | `../.env.development` | `matrix_delivery_develop` | Local development |
| `staging` | `../.env.staging` | Staging database | Pre-production testing |
| `production` | `../.env` | Production database | Live system |

**Default Behavior**:
- If no environment specified, defaults to `development`
- Environment files must be located in the `backend/` directory
- `DATABASE_URL` environment variable must be set

## Security Considerations

### Password Security

- **New Admin Accounts**: Auto-generated passwords using cryptographically secure random generation
- **Password Format**: `Admin@<year>!<random>` (e.g., `Admin@2024!aB3`)
- **Hashing**: Bcrypt with salt rounds (cost factor 10)

### Role-Based Access Control

- **primary_role**: The user's currently active role (`admin`, `customer`, `driver`)
- **granted_roles**: Array of roles the user is allowed to switch between
- **Promotion Process**: Updates both fields to ensure proper access control

### Database Security

- **Parameterized Queries**: All database operations use parameterized queries to prevent SQL injection
- **Connection Pooling**: Uses pg.Pool for efficient connection management
- **Environment Isolation**: Separate databases for each environment

### Audit Trail

- **Operation Logging**: All operations are logged with timestamps and user details
- **Verification Steps**: Script verifies changes were applied correctly
- **Error Logging**: Comprehensive error messages for troubleshooting

## Troubleshooting

### Common Issues

#### 1. Environment File Not Found
```
❌ DATABASE_URL not found in ../.env.development
```

**Solution**:
- Verify the environment file exists: `ls -la backend/.env*`
- Check file permissions: `chmod 644 backend/.env.development`
- Ensure correct environment name is used

#### 2. Database Connection Failed
```
❌ Database connection failed: connect ECONNREFUSED
```

**Solutions**:
- Verify PostgreSQL is running: `sudo systemctl status postgresql`
- Check database exists: `psql -l | grep matrix_delivery`
- Verify connection credentials in environment file

#### 3. User Not Found
```
❌ User not found: user@example.com
```

**Solutions**:
- Check email spelling and case sensitivity
- Verify user exists in the correct environment database
- Use user ID instead: `node manage_admin.js promote 123 development`

#### 4. Permission Denied
```
❌ Authentication failed. Check username/password
```

**Solution**:
- Verify database credentials in environment file
- Check if database user has necessary permissions
- Ensure correct DATABASE_URL format

### Debug Mode

Enable verbose logging by setting environment variable:
```bash
DEBUG=1 node manage_admin.js promote user@example.com development
```

### Recovery Procedures

#### Rollback Promotion
If a user was incorrectly promoted, you can demote them:
```sql
-- Connect to the database
psql "postgresql://user:pass@localhost:5432/matrix_delivery_develop"

-- Update the user's role (replace USER_ID with actual ID)
UPDATE users
SET primary_role = 'customer',
    granted_roles = ARRAY['customer', 'driver']
WHERE id = 'USER_ID';
```

#### Remove Admin User
To completely remove an admin user (use with caution):
```sql
DELETE FROM users WHERE email = 'admin@example.com';
```

## API Reference

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NODE_ENV` | No | Environment name (automatically set) |

### Database Schema

#### Users Table
```sql
CREATE TABLE users (
  id VARCHAR PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  name VARCHAR,
  phone VARCHAR,
  primary_role VARCHAR DEFAULT 'customer',
  granted_roles TEXT[] DEFAULT ARRAY['customer'],
  password_hash VARCHAR,
  is_verified BOOLEAN DEFAULT false,
  rating DECIMAL(3,2) DEFAULT 5.0,
  completed_deliveries INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Exit Codes

- `0`: Success
- `1`: Error (see error message for details)

## Best Practices

### Environment Management

1. **Never run admin operations in production without testing in development first**
2. **Use staging environment for pre-production admin testing**
3. **Backup database before major admin operations**
4. **Document all admin user creations and promotions**

### Security Best Practices

1. **Store generated credentials securely** (password manager, encrypted vault)
2. **Change auto-generated passwords on first login**
3. **Enable 2FA for admin accounts**
4. **Regularly audit admin user access**
5. **Monitor admin operations in production**

### Operational Best Practices

1. **Test scripts in development before production use**
2. **Use descriptive email addresses for admin accounts**
3. **Maintain admin user inventory**
4. **Document admin role assignments**
5. **Regular cleanup of unused admin accounts**

## Migration from Legacy Scripts

### Old Scripts (Deprecated)
- `promote_to_admin.js` (root directory)
- `backend/scripts/create-admin-user.js`

### Migration Steps

1. **Update any automation scripts** to use the new unified script
2. **Test new script in development environment**
3. **Update documentation references**
4. **Archive old scripts** (don't delete immediately)

### Backward Compatibility
The new script maintains the same core functionality but with enhanced features:
- Environment awareness
- Better error handling
- Comprehensive logging
- Unified command interface

## Changelog

### Version 1.0.0 (Current)
- Unified admin creation and promotion functionality
- Multi-environment support
- Enhanced security features
- Comprehensive error handling
- Detailed logging and verification

---

*For technical support or questions, refer to the Matrix Delivery development team.*
