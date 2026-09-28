#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const dotenv = require('dotenv');

const envFile = process.env.ENV_FILE || path.join('backend', '.env.production');
dotenv.config({ path: envFile });

const outputFile =
  process.env.SCHEMA_OUTPUT || path.join('database', 'schema', 'schema.sql');

function resolvePgBin() {
  if (process.env.PG_BIN) return process.env.PG_BIN;

  if (process.platform === 'win32') {
    const candidates = [
      'D:\\Program Files\\PostgreSQL\\18\\bin',
      'D:\\PostgreSQL\\18\\bin',
      'D:\\Program Files\\PostgreSQL\\17\\bin',
      'C:\\Program Files\\PostgreSQL\\18\\bin',
      'C:\\Program Files\\PostgreSQL\\17\\bin',
      'C:\\Program Files\\PostgreSQL\\16\\bin',
    ];
    for (const dir of candidates) {
      if (fs.existsSync(path.join(dir, 'pg_dump.exe'))) {
        return dir;
      }
    }
  }
  return '';
}

const pgBinDir = resolvePgBin();
const pgDumpPath = path.join(
  pgBinDir,
  process.platform === 'win32' ? 'pg_dump.exe' : 'pg_dump',
);

if (!fs.existsSync(pgDumpPath)) {
  console.error(
    'pg_dump not found. Set PG_BIN env var to the PostgreSQL bin directory.',
  );
  console.error('Looked in: ' + pgBinDir || '(none)');
  process.exit(1);
}

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL not set in ' + envFile);
  process.exit(1);
}

const tmpFile = path.join(os.tmpdir(), 'schema_dump_' + Date.now() + '.sql');

console.log('Dumping schema from production database...');
console.log('  pg_dump: ' + pgDumpPath);
console.log('  output:  ' + outputFile);

const args = [
  '--schema-only',
  '--no-owner',
  '--no-privileges',
  '--no-comments',
  '--clean',
  '--if-exists',
  '--dbname=' + dbUrl,
  '--file=' + tmpFile,
];

const result = spawnSync(pgDumpPath, args, {
  stdio: 'inherit',
  maxBuffer: 1024 * 1024 * 100,
});

if (result.status !== 0) {
  console.error('pg_dump failed with exit code ' + result.status);
  process.exit(result.status);
}

fs.copyFileSync(tmpFile, outputFile);
fs.unlinkSync(tmpFile);

const stats = fs.statSync(outputFile);
console.log(
  'Schema dumped to ' +
    outputFile +
    ' (' +
    (stats.size / 1024).toFixed(1) +
    ' KB)',
);
