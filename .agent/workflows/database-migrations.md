---
description: How to write database migrations that auto-run on server startup
---

# Database Migration Guidelines

This project uses auto-migrations via `migrationRunner.ts` which runs on server startup.

## Migration Location
All SQL migrations go in: `backend/migrations/`

## Naming Convention
```
YYYYMMDD_descriptive_name.sql
```
Example: `20260104_order_escrow_system.sql`

## Idempotent Rules (CRITICAL)

All migrations MUST be idempotent (safe to run multiple times):

### Tables
```sql
CREATE TABLE IF NOT EXISTS table_name (...)
```

### Columns
```sql
ALTER TABLE table_name ADD COLUMN IF NOT EXISTS column_name TYPE DEFAULT value;
```

### Indexes
```sql
CREATE INDEX IF NOT EXISTS idx_name ON table_name(column);
```

### Functions/Triggers
```sql
CREATE OR REPLACE FUNCTION function_name() ...
DROP TRIGGER IF EXISTS trigger_name ON table_name;
CREATE TRIGGER trigger_name ...
```

### Seed Data
```sql
INSERT INTO table_name (columns) VALUES (values)
ON CONFLICT DO NOTHING;
-- OR
INSERT INTO table_name (columns)
SELECT values WHERE NOT EXISTS (SELECT 1 FROM table_name WHERE condition);
```

## Auto-Execution
Migrations run automatically on server startup via:
```javascript
// backend/database/startup.js
const { runMigrationsOnStartup } = require('../migrationRunner.ts');
await runMigrationsOnStartup(pool);
```

## Do NOT:
- Use `CREATE TABLE` without `IF NOT EXISTS`
- Use `INSERT` without conflict handling
- Assume migrations run only once
