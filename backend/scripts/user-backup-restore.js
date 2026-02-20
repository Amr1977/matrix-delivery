#!/usr/bin/env node
/**
 * Matrix Delivery - User Backup and Restore Script
 * 
 * This script allows backing up and restoring users between different database environments
 * (production, development, staging) using .env variables.
 * 
 * Usage:
 *   node scripts/user-backup-restore.js backup --env=production
 *   node scripts/user-backup-restore.js restore --source=production --target=development
 *   node scripts/user-backup-restore.js list-backups
 *   node scripts/user-backup-restore.js restore-from-file --file=backups/users_backup_2026-02-20.json
 * 
 * @author Matrix Delivery Team
 * @date 2026-02-20
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Configuration
const BACKUP_DIR = path.join(__dirname, '..', 'backups', 'users');
const ENV_FILES = {
  development: '.env.development',
  staging: '.env.staging',
  production: '.env.production',
  testing: '.env.testing'
};

// User-related tables to backup/restore
const USER_TABLES = [
  'users',
  'user_balances',
  'user_payment_methods',
  'user_saved_addresses',
  'user_favorites'
];

// Columns to exclude from users table (sensitive or auto-generated)
const EXCLUDE_COLUMNS = {
  users: [],
  user_balances: [],
  user_payment_methods: ['provider_token'], // Exclude sensitive payment tokens
  user_saved_addresses: [],
  user_favorites: []
};

/**
 * Load environment configuration for a specific environment
 */
function loadEnvConfig(env) {
  const envFile = ENV_FILES[env];
  if (!envFile) {
    throw new Error(`Unknown environment: ${env}. Valid options: ${Object.keys(ENV_FILES).join(', ')}`);
  }

  const envPath = path.join(__dirname, '..', envFile);
  if (!fs.existsSync(envPath)) {
    throw new Error(`Environment file not found: ${envPath}`);
  }

  // Load the environment file
  const result = dotenv.config({ path: envPath });
  if (result.error) {
    throw new Error(`Failed to load environment file: ${result.error.message}`);
  }

  return {
    databaseUrl: process.env.DATABASE_URL,
    env: env
  };
}

/**
 * Create a database connection pool
 */
function createPool(config) {
  return new Pool({
    connectionString: config.databaseUrl,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
  });
}

/**
 * Get column names for a table, excluding specified columns
 */
async function getTableColumns(pool, tableName, excludeColumns = []) {
  const query = `
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = $1 
    ORDER BY ordinal_position
  `;
  const result = await pool.query(query, [tableName]);
  return result.rows
    .map(row => row.column_name)
    .filter(col => !excludeColumns.includes(col));
}

/**
 * Fetch all users from the database
 */
async function fetchUsers(pool) {
  console.log('Fetching users from database...');
  
  const columns = await getTableColumns(pool, 'users', EXCLUDE_COLUMNS.users);
  const query = `SELECT ${columns.join(', ')} FROM users ORDER BY created_at DESC`;
  const result = await pool.query(query);
  
  console.log(`Found ${result.rows.length} users`);
  return result.rows;
}

/**
 * Fetch related data for users
 */
async function fetchUserRelatedData(pool, userIds) {
  if (userIds.length === 0) return {};

  const relatedData = {};

  // Fetch user_balances
  try {
    const balancesQuery = 'SELECT * FROM user_balances WHERE user_id = ANY($1)';
    const balancesResult = await pool.query(balancesQuery, [userIds]);
    relatedData.user_balances = balancesResult.rows;
    console.log(`Found ${balancesResult.rows.length} user balance records`);
  } catch (error) {
    console.warn('Warning: Could not fetch user_balances:', error.message);
    relatedData.user_balances = [];
  }

  // Fetch user_payment_methods
  try {
    const columns = await getTableColumns(pool, 'user_payment_methods', EXCLUDE_COLUMNS.user_payment_methods);
    const paymentQuery = `SELECT ${columns.join(', ')} FROM user_payment_methods WHERE user_id = ANY($1)`;
    const paymentResult = await pool.query(paymentQuery, [userIds]);
    relatedData.user_payment_methods = paymentResult.rows;
    console.log(`Found ${paymentResult.rows.length} user payment method records`);
  } catch (error) {
    console.warn('Warning: Could not fetch user_payment_methods:', error.message);
    relatedData.user_payment_methods = [];
  }

  // Fetch user_saved_addresses
  try {
    const addressesQuery = 'SELECT * FROM user_saved_addresses WHERE user_id = ANY($1)';
    const addressesResult = await pool.query(addressesQuery, [userIds]);
    relatedData.user_saved_addresses = addressesResult.rows;
    console.log(`Found ${addressesResult.rows.length} user saved address records`);
  } catch (error) {
    console.warn('Warning: Could not fetch user_saved_addresses:', error.message);
    relatedData.user_saved_addresses = [];
  }

  // Fetch user_favorites
  try {
    const favoritesQuery = 'SELECT * FROM user_favorites WHERE user_id = ANY($1)';
    const favoritesResult = await pool.query(favoritesQuery, [userIds]);
    relatedData.user_favorites = favoritesResult.rows;
    console.log(`Found ${favoritesResult.rows.length} user favorite records`);
  } catch (error) {
    console.warn('Warning: Could not fetch user_favorites:', error.message);
    relatedData.user_favorites = [];
  }

  return relatedData;
}

/**
 * Create a backup of users
 */
async function backupUsers(env, options = {}) {
  console.log(`\n=== Starting User Backup from ${env} ===\n`);
  
  const config = loadEnvConfig(env);
  const pool = createPool(config);

  try {
    // Ensure backup directory exists
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    // Fetch users
    const users = await fetchUsers(pool);
    
    if (users.length === 0) {
      console.log('No users found to backup.');
      return null;
    }

    // Fetch related data
    const userIds = users.map(u => u.id);
    const relatedData = await fetchUserRelatedData(pool, userIds);

    // Create backup object
    const backup = {
      metadata: {
        environment: env,
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        userCount: users.length,
        tables: Object.keys(relatedData).reduce((acc, table) => {
          acc[table] = relatedData[table].length;
          return acc;
        }, { users: users.length })
      },
      data: {
        users,
        ...relatedData
      }
    };

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = options.filename || `users_backup_${env}_${timestamp}.json`;
    const filepath = path.join(BACKUP_DIR, filename);

    // Write backup file
    fs.writeFileSync(filepath, JSON.stringify(backup, null, 2));
    
    console.log(`\n✅ Backup completed successfully!`);
    console.log(`   File: ${filepath}`);
    console.log(`   Size: ${(fs.statSync(filepath).size / 1024).toFixed(2)} KB`);
    console.log(`   Users: ${users.length}`);

    return filepath;
  } finally {
    await pool.end();
  }
}

/**
 * Restore users to a database
 */
async function restoreUsers(targetEnv, backupData, options = {}) {
  console.log(`\n=== Restoring Users to ${targetEnv} ===\n`);
  
  const config = loadEnvConfig(targetEnv);
  const pool = createPool(config);

  try {
    await pool.query('BEGIN');

    const { data, metadata } = backupData;
    const dryRun = options.dryRun || false;
    const merge = options.merge !== false; // Default to merge mode
    const skipExisting = options.skipExisting || false;

    console.log(`Backup metadata:`);
    console.log(`  Source: ${metadata.environment}`);
    console.log(`  Timestamp: ${metadata.timestamp}`);
    console.log(`  Users: ${metadata.userCount}`);
    console.log(`  Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
    console.log(`  Strategy: ${merge ? 'Merge (keep existing)' : 'Replace (delete existing)'}`);

    if (dryRun) {
      console.log('\n[DRY RUN] No changes will be made to the database.');
    }

    // Get existing users in target
    const existingUsersQuery = 'SELECT id, email FROM users';
    const existingUsersResult = await pool.query(existingUsersQuery);
    const existingUserIds = new Set(existingUsersResult.rows.map(u => u.id));
    const existingEmails = new Set(existingUsersResult.rows.map(u => u.email));

    console.log(`\nExisting users in target: ${existingUsersResult.rows.length}`);

    // Process users
    let inserted = 0;
    let skipped = 0;
    let updated = 0;

    for (const user of data.users) {
      const userExists = existingUserIds.has(user.id);
      const emailExists = existingEmails.has(user.email);

      if (userExists || emailExists) {
        if (skipExisting) {
          console.log(`  Skipping existing user: ${user.email} (${user.id})`);
          skipped++;
          continue;
        }

        if (merge) {
          // Update existing user
          if (userExists) {
            const columns = Object.keys(user).filter(k => k !== 'id');
            const setClause = columns.map((col, i) => `${col} = $${i + 2}`).join(', ');
            const updateQuery = `UPDATE users SET ${setClause} WHERE id = $1`;
            
            if (!dryRun) {
              await pool.query(updateQuery, [user.id, ...columns.map(c => user[c])]);
            }
            updated++;
            console.log(`  Updated user: ${user.email}`);
          } else {
            console.log(`  Skipping user with existing email: ${user.email}`);
            skipped++;
          }
        } else {
          // In replace mode, we would have deleted all users first
          // Insert the user
          const columns = Object.keys(user);
          const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
          const insertQuery = `INSERT INTO users (${columns.join(', ')}) VALUES (${placeholders})`;
          
          if (!dryRun) {
            await pool.query(insertQuery, columns.map(c => user[c]));
          }
          inserted++;
          console.log(`  Inserted user: ${user.email}`);
        }
      } else {
        // Insert new user
        const columns = Object.keys(user);
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        const insertQuery = `INSERT INTO users (${columns.join(', ')}) VALUES (${placeholders})`;
        
        if (!dryRun) {
          await pool.query(insertQuery, columns.map(c => user[c]));
        }
        inserted++;
        console.log(`  Inserted user: ${user.email}`);
      }
    }

    // Restore related data
    if (data.user_balances && data.user_balances.length > 0) {
      console.log('\nRestoring user balances...');
      for (const balance of data.user_balances) {
        if (!dryRun) {
          const upsertQuery = `
            INSERT INTO user_balances (user_id, available_balance, pending_balance, held_balance, currency, 
              daily_withdrawal_limit, monthly_withdrawal_limit, minimum_balance, is_active, is_frozen,
              lifetime_deposits, lifetime_withdrawals, lifetime_earnings, total_transactions)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            ON CONFLICT (user_id) DO UPDATE SET
              available_balance = EXCLUDED.available_balance,
              pending_balance = EXCLUDED.pending_balance,
              held_balance = EXCLUDED.held_balance,
              lifetime_deposits = EXCLUDED.lifetime_deposits,
              lifetime_withdrawals = EXCLUDED.lifetime_withdrawals,
              lifetime_earnings = EXCLUDED.lifetime_earnings,
              total_transactions = EXCLUDED.total_transactions
          `;
          await pool.query(upsertQuery, [
            balance.user_id, balance.available_balance, balance.pending_balance, balance.held_balance,
            balance.currency, balance.daily_withdrawal_limit, balance.monthly_withdrawal_limit,
            balance.minimum_balance, balance.is_active, balance.is_frozen, balance.lifetime_deposits,
            balance.lifetime_withdrawals, balance.lifetime_earnings, balance.total_transactions
          ]);
        }
      }
      console.log(`  Restored ${data.user_balances.length} user balance records`);
    }

    if (!dryRun) {
      await pool.query('COMMIT');
      console.log('\n✅ Restore completed successfully!');
    } else {
      await pool.query('ROLLBACK');
      console.log('\n✅ Dry run completed - no changes made.');
    }

    console.log(`\nSummary:`);
    console.log(`  Inserted: ${inserted}`);
    console.log(`  Updated: ${updated}`);
    console.log(`  Skipped: ${skipped}`);

    return { inserted, updated, skipped };
  } catch (error) {
    await pool.query('ROLLBACK');
    throw error;
  } finally {
    await pool.end();
  }
}

/**
 * List available backups
 */
function listBackups() {
  console.log('\n=== Available User Backups ===\n');
  
  if (!fs.existsSync(BACKUP_DIR)) {
    console.log('No backups directory found.');
    return [];
  }

  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('users_backup_') && f.endsWith('.json'))
    .sort()
    .reverse();

  if (files.length === 0) {
    console.log('No backup files found.');
    return [];
  }

  console.log('Backup files:');
  for (const file of files) {
    const filepath = path.join(BACKUP_DIR, file);
    const stats = fs.statSync(filepath);
    const content = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    
    console.log(`\n  📁 ${file}`);
    console.log(`     Size: ${(stats.size / 1024).toFixed(2)} KB`);
    console.log(`     Created: ${stats.birthtime.toISOString()}`);
    console.log(`     Environment: ${content.metadata?.environment || 'unknown'}`);
    console.log(`     Users: ${content.metadata?.userCount || content.data?.users?.length || 0}`);
  }

  return files;
}

/**
 * Load backup from file
 */
function loadBackupFile(filepath) {
  if (!fs.existsSync(filepath)) {
    throw new Error(`Backup file not found: ${filepath}`);
  }

  const content = fs.readFileSync(filepath, 'utf8');
  return JSON.parse(content);
}

/**
 * Compare users between environments
 */
async function compareEnvironments(sourceEnv, targetEnv) {
  console.log(`\n=== Comparing Users: ${sourceEnv} → ${targetEnv} ===\n`);
  
  const sourceConfig = loadEnvConfig(sourceEnv);
  const targetConfig = loadEnvConfig(targetEnv);
  
  const sourcePool = createPool(sourceConfig);
  const targetPool = createPool(targetConfig);

  try {
    // Fetch users from both environments
    const sourceUsers = await fetchUsers(sourcePool);
    const targetUsers = await fetchUsers(targetPool);

    const sourceIds = new Set(sourceUsers.map(u => u.id));
    const targetIds = new Set(targetUsers.map(u => u.id));
    const sourceEmails = new Map(sourceUsers.map(u => [u.email, u.id]));
    const targetEmails = new Map(targetUsers.map(u => [u.email, u.id]));

    // Find users only in source
    const onlyInSource = sourceUsers.filter(u => !targetIds.has(u.id));
    
    // Find users only in target
    const onlyInTarget = targetUsers.filter(u => !sourceIds.has(u.id));
    
    // Find users with same ID but potentially different data
    const inBoth = sourceUsers.filter(u => targetIds.has(u.id));
    
    // Find users with same email but different ID
    const emailConflicts = sourceUsers.filter(u => 
      targetEmails.has(u.email) && targetEmails.get(u.email) !== u.id
    );

    console.log('Comparison Results:');
    console.log(`  Source users: ${sourceUsers.length}`);
    console.log(`  Target users: ${targetUsers.length}`);
    console.log(`  Users only in source: ${onlyInSource.length}`);
    console.log(`  Users only in target: ${onlyInTarget.length}`);
    console.log(`  Users in both: ${inBoth.length}`);
    console.log(`  Email conflicts: ${emailConflicts.length}`);

    if (onlyInSource.length > 0) {
      console.log('\nUsers only in source (would be added):');
      onlyInSource.slice(0, 10).forEach(u => {
        console.log(`  - ${u.email} (${u.primary_role})`);
      });
      if (onlyInSource.length > 10) {
        console.log(`  ... and ${onlyInSource.length - 10} more`);
      }
    }

    if (emailConflicts.length > 0) {
      console.log('\n⚠️  Email conflicts (same email, different ID):');
      emailConflicts.forEach(u => {
        console.log(`  - ${u.email}: source ID=${u.id}, target ID=${targetEmails.get(u.email)}`);
      });
    }

    return {
      sourceCount: sourceUsers.length,
      targetCount: targetUsers.length,
      onlyInSource,
      onlyInTarget,
      inBoth,
      emailConflicts
    };
  } finally {
    await sourcePool.end();
    await targetPool.end();
  }
}

/**
 * Main CLI handler
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const parseArg = (name) => {
    const arg = args.find(a => a.startsWith(`--${name}=`));
    return arg ? arg.split('=')[1] : null;
  };

  const parseFlag = (name) => args.includes(`--${name}`);

  try {
    switch (command) {
      case 'backup': {
        const env = parseArg('env') || 'development';
        const filename = parseArg('file');
        await backupUsers(env, { filename });
        break;
      }

      case 'restore': {
        const source = parseArg('source');
        const target = parseArg('target');
        const file = parseArg('file');
        
        if (!target) {
          console.error('Error: --target environment is required');
          process.exit(1);
        }

        let backupData;
        if (file) {
          console.log(`Loading backup from file: ${file}`);
          backupData = loadBackupFile(file);
        } else if (source) {
          // Create a temporary backup from source
          const tempBackup = await backupUsers(source);
          backupData = loadBackupFile(tempBackup);
        } else {
          console.error('Error: Either --source or --file is required');
          process.exit(1);
        }

        await restoreUsers(target, backupData, {
          dryRun: parseFlag('dry-run'),
          merge: !parseFlag('replace'),
          skipExisting: parseFlag('skip-existing')
        });
        break;
      }

      case 'restore-from-file': {
        const file = parseArg('file');
        const target = parseArg('target') || 'development';
        
        if (!file) {
          console.error('Error: --file is required');
          process.exit(1);
        }

        const backupData = loadBackupFile(file);
        await restoreUsers(target, backupData, {
          dryRun: parseFlag('dry-run'),
          merge: !parseFlag('replace'),
          skipExisting: parseFlag('skip-existing')
        });
        break;
      }

      case 'list-backups': {
        listBackups();
        break;
      }

      case 'compare': {
        const source = parseArg('source') || 'production';
        const target = parseArg('target') || 'development';
        await compareEnvironments(source, target);
        break;
      }

      case 'help':
      default: {
        console.log(`
Matrix Delivery - User Backup and Restore Script

Usage:
  node scripts/user-backup-restore.js <command> [options]

Commands:
  backup              Create a backup of users from an environment
  restore             Restore users from one environment to another
  restore-from-file   Restore users from a specific backup file
  list-backups        List all available backup files
  compare             Compare users between two environments

Options:
  --env=<env>         Environment to backup from (development|staging|production|testing)
  --source=<env>      Source environment for restore
  --target=<env>      Target environment for restore
  --file=<path>       Specific backup file to restore from
  --dry-run           Preview changes without making them
  --replace           Replace existing users instead of merging
  --skip-existing     Skip users that already exist in target

Examples:
  # Backup users from production
  node scripts/user-backup-restore.js backup --env=production

  # Restore users from production to development (dry run)
  node scripts/user-backup-restore.js restore --source=production --target=development --dry-run

  # Restore from a specific backup file
  node scripts/user-backup-restore.js restore-from-file --file=backups/users_backup_2026-02-20.json --target=development

  # Compare users between environments
  node scripts/user-backup-restore.js compare --source=production --target=development

  # List all available backups
  node scripts/user-backup-restore.js list-backups
        `);
        break;
      }
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run the script
main();
