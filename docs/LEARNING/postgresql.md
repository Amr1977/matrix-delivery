In PostgreSQL, there are three common levels of “schema structure” you might want to dump or inspect:

1. Human-readable listing (tables, columns, types)


2. DDL (CREATE TABLE / INDEX / CONSTRAINT statements)


3. Full schema-only dump suitable for version control



Below is the precise, canonical way for each.


---

1️⃣ List schema structure interactively (psql)

List schemas

\dn

List tables in a schema

\dt schema_name.*

Describe a table (columns, types, constraints)

\d schema_name.table_name

Extended description (indexes, storage, comments)

\d+ schema_name.table_name

List all objects in a schema

\dtvsi schema_name.*

(Tables, views, sequences, indexes)


---

2️⃣ Query schema structure via SQL (portable)

List tables and columns

SELECT
    table_schema,
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

List constraints

SELECT
    tc.table_name,
    tc.constraint_type,
    tc.constraint_name
FROM information_schema.table_constraints tc
WHERE tc.table_schema = 'public';

List indexes

SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public';


---

3️⃣ Dump schema structure (NO data) — most common

Dump entire database schema

pg_dump -s -d db_name > schema.sql

Dump specific schema only

pg_dump -s -n schema_name -d db_name > schema.sql

Dump specific tables only

pg_dump -s -t table_name -d db_name > table.sql

Dump without ownership / privileges (recommended for Git)

pg_dump -s \
  --no-owner \
  --no-privileges \
  -d db_name > schema.sql


---

4️⃣ Dump schema in clean, readable DDL

For minimal noise:

pg_dump -s \
  --no-owner \
  --no-privileges \
  --if-exists \
  --clean \
  -d db_name > schema.sql

This gives:

DROP … IF EXISTS

CREATE TABLE

CREATE INDEX

ALTER TABLE ADD CONSTRAINT



---

5️⃣ Dump schema from remote DB (example)

pg_dump -s \
  -h hostname \
  -p 5432 \
  -U username \
  -d db_name > schema.sql


---

✅ Recommended workflow (professional)

For backend projects (Node.js / Prisma / Express):

pg_dump -s --no-owner --no-privileges db_name > db/schema.sql

Commit schema.sql to Git.


---

If you want, I can also:

Generate ERD (entity relationship) from schema

Convert schema → Prisma schema

Extract schema → Markdown documentation

Diff two schemas (prod vs staging)


Just say which one.