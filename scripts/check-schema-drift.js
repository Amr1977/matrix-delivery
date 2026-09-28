#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envFile = process.env.ENV_FILE || path.join('backend', '.env.development');
dotenv.config({ path: envFile });

const schemaFile = path.join('database', 'schema', 'schema.sql');
const migrationsDir = path.join('backend', 'migrations');

function getMigrationFiles() {
  if (!fs.existsSync(migrationsDir)) return [];
  return fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql') && f !== 'test_schema.sql' && f !== 'dev_orders_schema.sql')
    .sort();
}

function getSchemaFileModTime() {
  try {
    return fs.statSync(schemaFile).mtimeMs;
  } catch {
    return 0;
  }
}

async function main() {
  const migrationFiles = getMigrationFiles();
  const schemaMtime = getSchemaFileModTime();

  console.log('=== Schema Drift Check ===\n');

  console.log('Migration files: ' + migrationFiles.length);
  console.log('Schema file mod time: ' + (schemaMtime ? new Date(schemaMtime).toISOString() : '(not found)'));

  const latestMigration = migrationFiles.length > 0 ? migrationFiles[migrationFiles.length - 1] : 'none';
  const latestMtime = migrationFiles.length > 0
    ? fs.statSync(path.join(migrationsDir, latestMigration)).mtimeMs
    : 0;

  console.log('Latest migration: ' + latestMigration);
  console.log('Latest migration mod time: ' + new Date(latestMtime).toISOString());

  if (schemaMtime === 0) {
    console.log('\nFAIL: schema.sql not found at ' + schemaFile);
    process.exit(2);
  }

  if (latestMtime > schemaMtime) {
    console.log('\nDRIFT DETECTED: Migration file(s) modified after last schema dump');
    console.log('  ' + latestMigration + ' was modified ' + new Date(latestMtime).toISOString());
    console.log('  schema.sql was last dumped ' + new Date(schemaMtime).toISOString());
    console.log('  Run: npm run db:schema:dump');
    process.exit(1);
  }

  console.log('\nPASS: schema.sql is up to date with migrations');
  process.exit(0);
}

main();
