#!/usr/bin/env node
/**
 * Clone production DB to development DB using URLs from env files.
 * Defaults:
 *  - from: backend/.env.production (DATABASE_URL)
 *  - to:   backend/.env.develop (DATABASE_URL)
 * Requires pg_dump and pg_restore on PATH. Set PG_BIN to override.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const dotenv = require('dotenv');

const args = new Set(process.argv.slice(2));
const FROM_URL = getArg('--from-url');
const TO_URL = getArg('--to-url');

function flag(name) { return args.has(name); }
function getArg(name, fallback) {
  const idx = process.argv.indexOf(name);
  return idx !== -1 && process.argv[idx + 1] ? process.argv[idx + 1] : fallback;
}

const fromEnvPath = getArg('--from', path.join('backend', '.env.production'));
const toEnvPath   = getArg('--to',   path.join('backend', '.env.develop'));
const excludeLogs = flag('--exclude-logs');
const schemaOnly  = flag('--schema-only');
const force       = flag('--force');

function exitWith(msg, code = 1) {
  console.error(msg);
  process.exit(code);
}


// Prefer newer PostgreSQL client binaries if PG_BIN not set (Windows dev convenience)
if (!process.env.PG_BIN && process.platform === 'win32') {
  const candidates = [
    'D:\\PostgreSQL\\18\\bin',
    'C:\\Program Files\\PostgreSQL\\18\\bin',
    'C:\\Program Files\\PostgreSQL\\17\\bin'
  ];
  for (const dir of candidates) {
    try {
      const exe = path.join(dir, 'pg_dump.exe');
      if (fs.existsSync(exe)) { process.env.PG_BIN = dir; break; }
    } catch {}
  }
}function loadEnv(file) {
  if (FROM_URL && file === fromEnvPath) return FROM_URL.trim();
  if (TO_URL && file === toEnvPath)     return TO_URL.trim();
  if (!fs.existsSync(file)) {
    const rootCandidate = path.resolve('.env.production');
    if (file.endsWith('.env.production') && fs.existsSync(rootCandidate)) {
      file = rootCandidate;
    } else {
      exitWith('Env file not found: ' + file);
    }
  }
  const parsed = dotenv.parse(fs.readFileSync(file));
  const url = parsed.DATABASE_URL || parsed.PROD_DATABASE_URL || parsed.POSTGRES_URL;
  if (!url) exitWith('DATABASE_URL not found in ' + file);
  return url.replace(/^\s+|\s+$/g, '');
}

function isLocal(url) {
  try {
    const u = new URL(url);
    return ['localhost','127.0.0.1','::1'].includes(u.hostname);
  } catch { return false; }
}

const fromUrl = loadEnv(fromEnvPath);
const toUrl   = loadEnv(toEnvPath);

if (!isLocal(toUrl) && !force) {
  exitWith('Refusing to restore into a non-local database. Use --force if you understand the risk.');
}

const dumpFile  = path.join(os.tmpdir(), 'prod_dump_' + Date.now() + '.dump');
const pgDump    = resolveBin('pg_dump');
const pgRestore = resolveBin('pg_restore');

const dumpArgs = ['--format=custom','--no-owner','--no-privileges','--dbname=' + fromUrl,'--file=' + dumpFile];
if (schemaOnly) dumpArgs.unshift('--schema-only');
if (excludeLogs) {
  dumpArgs.push('--exclude-table-data=public.marketplace_audit_logs');
  dumpArgs.push('--exclude-table-data=public.fsm_action_log');
  dumpArgs.push('--exclude-table-data=public.activity_log');
}

console.log('Dumping production from: ' + fromEnvPath);
let res = spawnSync(pgDump, dumpArgs, { stdio: 'inherit' });
if (res.status !== 0) exitWith('pg_dump failed');

console.log('Restoring into development: ' + toEnvPath);
const restoreArgs = ['--clean','--if-exists','--no-owner','--no-privileges','--dbname=' + toUrl, dumpFile];
res = spawnSync(pgRestore, restoreArgs, { stdio: 'inherit' });
if (res.status !== 0) exitWith('pg_restore failed');

try { fs.unlinkSync(dumpFile); } catch {}
console.log('Clone complete');