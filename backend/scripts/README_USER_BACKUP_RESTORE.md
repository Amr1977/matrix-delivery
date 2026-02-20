# User Backup and Restore Script

A Node.js script for backing up and restoring users between different database environments (production, development, staging) using `.env` variables.

## Features

- **Backup users** from any environment (production, staging, development, testing)
- **Restore users** to any environment with merge or replace strategies
- **Related data support**: Backs up user balances, payment methods, saved addresses, and favorites
- **Security**: Excludes sensitive data like payment tokens
- **Dry-run mode**: Preview changes before applying them
- **Environment comparison**: Compare users between environments before migration

## Prerequisites

- Node.js >= 18.0.0
- PostgreSQL database
- Environment files configured with `DATABASE_URL`

## Environment Configuration

The script uses environment-specific `.env` files:

```
backend/
├── .env.development    # Development database
├── .env.staging        # Staging database
├── .env.production     # Production database
└── .env.testing        # Testing database
```

Each file should contain a `DATABASE_URL`:

```env
DATABASE_URL='postgresql://user:password@host:5432/database_name'
```

## Usage

### NPM Scripts

```bash
# Backup users
npm run users:backup -- --env=production

# Restore users (dry run first!)
npm run users:restore -- --source=production --target=development --dry-run

# List available backups
npm run users:list

# Compare environments
npm run users:compare -- --source=production --target=development
```

### Direct Node Commands

```bash
# Show help
node scripts/user-backup-restore.js help

# Backup users from production
node scripts/user-backup-restore.js backup --env=production

# Backup users with custom filename
node scripts/user-backup-restore.js backup --env=production --file=my_backup.json

# Restore users from production to development (dry run)
node scripts/user-backup-restore.js restore --source=production --target=development --dry-run

# Restore users from production to development (live)
node scripts/user-backup-restore.js restore --source=production --target=development

# Restore from a specific backup file
node scripts/user-backup-restore.js restore-from-file --file=backups/users/users_backup_production_2026-02-20.json --target=development

# List all available backups
node scripts/user-backup-restore.js list-backups

# Compare users between environments
node scripts/user-backup-restore.js compare --source=production --target=development
```

## Command Reference

### `backup`

Create a backup of users from an environment.

```bash
node scripts/user-backup-restore.js backup --env=<environment> [--file=<filename>]
```

**Options:**
- `--env` - Environment to backup from (required): `development`, `staging`, `production`, `testing`
- `--file` - Custom filename for the backup (optional)

**Example:**
```bash
node scripts/user-backup-restore.js backup --env=production
```

### `restore`

Restore users from one environment to another.

```bash
node scripts/user-backup-restore.js restore --source=<env> --target=<env> [options]
```

**Options:**
- `--source` - Source environment to backup from
- `--target` - Target environment to restore to (required)
- `--file` - Use a specific backup file instead of source
- `--dry-run` - Preview changes without applying them
- `--replace` - Replace existing users instead of merging (dangerous!)
- `--skip-existing` - Skip users that already exist in target

**Examples:**
```bash
# Dry run first!
node scripts/user-backup-restore.js restore --source=production --target=development --dry-run

# Live restore with merge (default)
node scripts/user-backup-restore.js restore --source=production --target=development

# Skip existing users
node scripts/user-backup-restore.js restore --source=production --target=development --skip-existing
```

### `restore-from-file`

Restore users from a specific backup file.

```bash
node scripts/user-backup-restore.js restore-from-file --file=<path> --target=<env> [options]
```

**Options:**
- `--file` - Path to backup file (required)
- `--target` - Target environment (required)
- `--dry-run` - Preview changes
- `--replace` - Replace existing users
- `--skip-existing` - Skip existing users

### `list-backups`

List all available backup files.

```bash
node scripts/user-backup-restore.js list-backups
```

### `compare`

Compare users between two environments.

```bash
node scripts/user-backup-restore.js compare --source=<env> --target=<env>
```

**Options:**
- `--source` - Source environment (default: production)
- `--target` - Target environment (default: development)

## Data Included in Backup

### Users Table
All columns except:
- `password_hash` - Excluded for security

### Related Tables
- `user_balances` - User wallet balances
- `user_payment_methods` - Payment methods (excludes `provider_token`)
- `user_saved_addresses` - Saved delivery addresses
- `user_favorites` - User favorite drivers/customers

## Backup File Format

```json
{
  "metadata": {
    "environment": "production",
    "timestamp": "2026-02-20T16:30:00.000Z",
    "version": "1.0.0",
    "userCount": 150,
    "tables": {
      "users": 150,
      "user_balances": 150,
      "user_payment_methods": 45,
      "user_saved_addresses": 89,
      "user_favorites": 23
    }
  },
  "data": {
    "users": [...],
    "user_balances": [...],
    "user_payment_methods": [...],
    "user_saved_addresses": [...],
    "user_favorites": [...]
  }
}
```

## Restore Strategies

### Merge (Default)
- Keeps existing users in target database
- Updates existing users with source data
- Adds new users from source
- Safest option for production

### Replace
- Deletes all existing users in target
- Inserts all users from source
- **Warning**: Destructive operation!

### Skip Existing
- Keeps existing users unchanged
- Only adds new users from source
- Useful for incremental syncs

## Safety Features

1. **Dry-run mode**: Always preview changes before applying
2. **Transaction-based**: All changes are rolled back on error
3. **Sensitive data exclusion**: Passwords and tokens are never backed up
4. **Environment validation**: Only known environments are accepted
5. **Confirmation prompts**: (Coming soon) Interactive confirmation for destructive operations

## Best Practices

### Before Restoring

1. **Always dry-run first**:
   ```bash
   node scripts/user-backup-restore.js restore --source=production --target=development --dry-run
   ```

2. **Compare environments**:
   ```bash
   node scripts/user-backup-restore.js compare --source=production --target=development
   ```

3. **Backup target before restore**:
   ```bash
   node scripts/user-backup-restore.js backup --env=development --file=pre_restore_backup.json
   ```

### Production to Development

```bash
# 1. Create backup from production
npm run users:backup -- --env=production

# 2. Compare environments
npm run users:compare -- --source=production --target=development

# 3. Dry run restore
npm run users:restore -- --source=production --target=development --dry-run

# 4. Live restore
npm run users:restore -- --source=production --target=development
```

### Development to Production (Careful!)

```bash
# 1. Backup production first!
npm run users:backup -- --env=production --file=production_before_restore.json

# 2. Compare environments
npm run users:compare -- --source=development --target=production

# 3. Dry run with skip-existing (safer)
npm run users:restore -- --source=development --target=production --skip-existing --dry-run

# 4. Live restore with skip-existing
npm run users:restore -- --source=development --target=production --skip-existing
```

## Troubleshooting

### "Environment file not found"
Make sure the `.env.<environment>` file exists in the `backend/` directory.

### "DATABASE_URL not defined"
Check that your environment file contains a valid `DATABASE_URL`.

### "Connection refused"
- Verify the database is running
- Check the DATABASE_URL connection string
- Ensure your IP is whitelisted (for cloud databases)

### "Permission denied"
- Check database user permissions
- Ensure the user has SELECT, INSERT, UPDATE, DELETE permissions

## Security Considerations

1. **Password hashes are excluded** - Users will need to reset passwords after restore
2. **Payment tokens are excluded** - Users will need to re-add payment methods
3. **Backup files contain user data** - Store securely and delete when no longer needed
4. **Never commit backup files** - They are excluded in `.gitignore`

## File Locations

```
backend/
├── scripts/
│   └── user-backup-restore.js    # Main script
├── backups/
│   └── users/                     # Backup files directory
│       ├── users_backup_production_2026-02-20.json
│       └── users_backup_development_2026-02-20.json
├── .env.development
├── .env.staging
└── .env.production
```

## Contributing

When modifying this script:
1. Test with dry-run mode first
2. Update this README if adding new features
3. Follow the existing code style
4. Add appropriate error handling

## License

MIT License - Matrix Delivery Team
