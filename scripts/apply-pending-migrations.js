#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const crypto = require('crypto');
const dotenv = require('dotenv');

const envFile = process.env.ENV_FILE || path.join('backend', '.env.production');
dotenv.config({ path: envFile });

const logger = {
  info: (msg) => console.log(`[INFO] ${msg}`),
  error: (msg) => console.error(`[ERROR] ${msg}`),
  warn: (msg) => console.warn(`[WARN] ${msg}`),
};

const migrationsDir = path.join('backend', 'migrations');
const migrationsTable = 'schema_migrations';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function initializeMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${migrationsTable} (
      id SERIAL PRIMARY KEY,
      migration_name VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      checksum VARCHAR(64),
      execution_time_ms INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_migration_name ON ${migrationsTable}(migration_name);
  `);
  logger.info('Migrations table initialized');
}

function getMigrationFiles() {
  if (!fs.existsSync(migrationsDir)) {
    logger.warn(`Migrations directory not found: ${migrationsDir}`);
    return [];
  }
  return fs
    .readdirSync(migrationsDir)
    .filter(
      (f) =>
        f.endsWith('.sql') &&
        f !== 'test_schema.sql' &&
        f !== 'dev_orders_schema.sql',
    )
    .sort();
}

function isAlreadyExistsError(error) {
  const msg = error.message.toLowerCase();
  return (
    msg.includes('already exists') ||
    msg.includes('duplicate key') ||
    msg.includes('relation already exists') ||
    msg.includes('column already exists') ||
    msg.includes('constraint already exists') ||
    msg.includes('index already exists')
  );
}

async function main() {
  const client = await pool.connect();
  try {
    logger.info(`Connecting to database...`);

    await initializeMigrationsTable(client);

    const appliedRes = await client.query(
      `SELECT migration_name FROM ${migrationsTable} ORDER BY id ASC`,
    );
    const applied = appliedRes.rows.map((r) => r.migration_name);
    logger.info(`Already applied: ${applied.length} migrations`);

    const files = getMigrationFiles();
    const pending = files.filter((f) => !applied.includes(f));

    if (pending.length === 0) {
      logger.info('No pending migrations');
      return;
    }

    logger.info(
      `Found ${pending.length} pending migration(s): ${pending.join(', ')}`,
    );

    for (const file of pending) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      const checksum = crypto.createHash('sha256').update(sql).digest('hex');
      const start = Date.now();

      try {
        await client.query('BEGIN');
        await client.query(sql);
        const execTime = Date.now() - start;
        await client.query(
          `INSERT INTO ${migrationsTable} (migration_name, checksum, execution_time_ms)
           VALUES($1, $2, $3)
           ON CONFLICT (migration_name) DO UPDATE SET
             checksum = EXCLUDED.checksum,
             execution_time_ms = EXCLUDED.execution_time_ms,
             applied_at = CURRENT_TIMESTAMP`,
          [file, checksum, execTime],
        );
        await client.query('COMMIT');
        logger.info(`Applied ${file} (${execTime}ms)`);
      } catch (err) {
        await client.query('ROLLBACK');
        if (isAlreadyExistsError(err)) {
          logger.warn(`Skipped (already exists): ${file}`);
          await client.query(
            `INSERT INTO ${migrationsTable} (migration_name, checksum, execution_time_ms)
             VALUES($1, $2, $3)
             ON CONFLICT (migration_name) DO UPDATE SET
               checksum = EXCLUDED.checksum,
               execution_time_ms = EXCLUDED.execution_time_ms,
               applied_at = CURRENT_TIMESTAMP`,
            [file, checksum, Date.now() - start],
          );
        } else {
          logger.error(`Failed ${file}: ${err.message}`);
          throw err;
        }
      }
    }

    logger.info(`\n=== Final migration status ===`);
    const finalRes = await client.query(
      `SELECT migration_name, applied_at FROM ${migrationsTable} ORDER BY applied_at DESC LIMIT 10`,
    );
    finalRes.rows.forEach((r) =>
      logger.info(`  ${r.migration_name} | ${r.applied_at}`),
    );
  } catch (err) {
    logger.error(`Migration process failed: ${err.message}`);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
