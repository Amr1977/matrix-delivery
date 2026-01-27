#!/usr/bin/env node

/**
 * Database Backup and Restore Utility
 *
 * Features:
 * - Backup production database to local file
 * - Restore database from backup file
 * - List available backups
 * - Clean old backups (optional)
 *
 * Usage:
 *   node backup-restore-db.js backup [--format=custom|plain]
 *   node backup-restore-db.js restore <backup-file>
 *   node backup-restore-db.js list
 *   node backup-restore-db.js clean --older-than=7d
 */

const dotenv = require('dotenv');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');

// Load environment variables - use .env.testing for test environments
if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'testing') {
  dotenv.config({ path: path.join(__dirname, '../../.env.testing') });
} else {
  dotenv.config({ path: path.join(__dirname, '../../.env') });
}

const execAsync = util.promisify(exec);

// Configuration
const BACKUP_DIR = path.join(__dirname, '../backups');
let DB_CONFIG;

try {
    const url = new URL(process.env.DATABASE_URL);
    DB_CONFIG = {
        host: url.hostname,
        port: url.port || '5432',
        database: url.pathname.substring(1), // remove leading /
        user: url.username,
        password: url.password
    };
} catch (e) {
    console.warn('Failed to parse DATABASE_URL, falling back to individual variables');
}

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/**
 * Create a database backup
 */
async function backup(format = 'custom') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const extension = format === 'custom' ? 'dump' : 'sql';
    const filename = `backup_${DB_CONFIG.database}_${timestamp}.${extension}`;
    const filepath = path.join(BACKUP_DIR, filename);

    console.log(`📦 Starting backup of ${DB_CONFIG.database}...`);
    console.log(`Format: ${format}`);
    console.log(`Output: ${filepath}`);

    try {
        const formatFlag = format === 'custom' ? '-Fc' : '-Fp';
        const command = `pg_dump ${formatFlag} -h ${DB_CONFIG.host} -p ${DB_CONFIG.port} -U ${DB_CONFIG.user} -d ${DB_CONFIG.database} -f "${filepath}"`;

        // Set password environment variable
        const env = { ...process.env, PGPASSWORD: DB_CONFIG.password };

        await execAsync(command, { env });

        const stats = fs.statSync(filepath);
        const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

        console.log(`✅ Backup completed successfully!`);
        console.log(`File: ${filename}`);
        console.log(`Size: ${sizeInMB} MB`);

        return filepath;
    } catch (error) {
        console.error(`❌ Backup failed:`, error.message);

        // Clean up partial backup file
        if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
        }

        process.exit(1);
    }
}

/**
 * Restore database from backup file
 */
async function restore(backupFile) {
    if (!fs.existsSync(backupFile)) {
        console.error(`❌ Backup file not found: ${backupFile}`);
        process.exit(1);
    }

    console.log(`🔄 Starting restore from ${path.basename(backupFile)}...`);
    console.log(`⚠️  WARNING: This will overwrite the current database!`);

    // Ask for confirmation (in production, you'd want a --force flag)
    console.log(`Database: ${DB_CONFIG.database}`);
    console.log(`Host: ${DB_CONFIG.host}`);

    try {
        const extension = path.extname(backupFile);
        let command;

        if (extension === '.dump') {
            // Custom format - use pg_restore
            command = `pg_restore -h ${DB_CONFIG.host} -p ${DB_CONFIG.port} -U ${DB_CONFIG.user} -d ${DB_CONFIG.database} -c -v "${backupFile}"`;
        } else {
            // Plain SQL format - use psql
            command = `psql -h ${DB_CONFIG.host} -p ${DB_CONFIG.port} -U ${DB_CONFIG.user} -d ${DB_CONFIG.database} -f "${backupFile}"`;
        }

        // Set password environment variable
        const env = { ...process.env, PGPASSWORD: DB_CONFIG.password };

        await execAsync(command, { env });

        console.log(`✅ Restore completed successfully!`);
    } catch (error) {
        console.error(`❌ Restore failed:`, error.message);
        process.exit(1);
    }
}

/**
 * List all available backups
 */
function listBackups() {
    console.log(`📋 Available backups in ${BACKUP_DIR}:\n`);

    const files = fs.readdirSync(BACKUP_DIR)
        .filter(f => f.startsWith('backup_') && (f.endsWith('.dump') || f.endsWith('.sql')))
        .map(f => {
            const filepath = path.join(BACKUP_DIR, f);
            const stats = fs.statSync(filepath);
            return {
                name: f,
                size: (stats.size / (1024 * 1024)).toFixed(2),
                modified: stats.mtime.toISOString()
            };
        })
        .sort((a, b) => new Date(b.modified) - new Date(a.modified));

    if (files.length === 0) {
        console.log('No backups found.');
        return;
    }

    console.table(files);
    console.log(`\nTotal backups: ${files.length}`);
}

/**
 * Clean old backups
 */
function cleanBackups(olderThanDays = 7) {
    console.log(`🧹 Cleaning backups older than ${olderThanDays} days...`);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const files = fs.readdirSync(BACKUP_DIR)
        .filter(f => f.startsWith('backup_') && (f.endsWith('.dump') || f.endsWith('.sql')));

    let deletedCount = 0;

    files.forEach(f => {
        const filepath = path.join(BACKUP_DIR, f);
        const stats = fs.statSync(filepath);

        if (stats.mtime < cutoffDate) {
            fs.unlinkSync(filepath);
            console.log(`  Deleted: ${f}`);
            deletedCount++;
        }
    });

    if (deletedCount === 0) {
        console.log('No old backups to clean.');
    } else {
        console.log(`✅ Deleted ${deletedCount} old backup(s).`);
    }
}

/**
 * Main CLI handler
 */
async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    if (!command) {
        console.log(`
Usage:
  node backup-restore-db.js backup [--format=custom|plain]
  node backup-restore-db.js restore <backup-file>
  node backup-restore-db.js list
  node backup-restore-db.js clean [--older-than=7d]

Examples:
  node backup-restore-db.js backup
  node backup-restore-db.js backup --format=plain
  node backup-restore-db.js restore backups/backup_matrix_delivery_prod_2025-12-30.dump
  node backup-restore-db.js list
  node backup-restore-db.js clean --older-than=30
    `);
        process.exit(1);
    }

    switch (command) {
        case 'backup': {
            const formatArg = args.find(a => a.startsWith('--format='));
            const format = formatArg ? formatArg.split('=')[1] : 'custom';
            await backup(format);
            break;
        }

        case 'restore': {
            const backupFile = args[1];
            if (!backupFile) {
                console.error('❌ Please specify a backup file to restore');
                process.exit(1);
            }
            await restore(backupFile);
            break;
        }

        case 'list': {
            listBackups();
            break;
        }

        case 'clean': {
            const olderThanArg = args.find(a => a.startsWith('--older-than='));
            const days = olderThanArg ? parseInt(olderThanArg.split('=')[1]) : 7;
            cleanBackups(days);
            break;
        }

        default:
            console.error(`❌ Unknown command: ${command}`);
            process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = { backup, restore, listBackups, cleanBackups };
