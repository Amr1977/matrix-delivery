# PostgreSQL SQL Cheat Sheet

## Database Operations

```sql
-- Create database
CREATE DATABASE dbname;

-- Connect to database
\c dbname

-- List databases
\l

-- Drop database
DROP DATABASE dbname;
```

## Table Operations

```sql
-- Create table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Show table structure
\d tablename

-- List all tables
\dt

-- Drop table
DROP TABLE tablename;

-- Rename table
ALTER TABLE old_name RENAME TO new_name;

-- Add column
ALTER TABLE users ADD COLUMN age INTEGER;

-- Drop column
ALTER TABLE users DROP COLUMN age;

-- Modify column type
ALTER TABLE users ALTER COLUMN email TYPE TEXT;
```

## Querying Data

```sql
-- Basic SELECT
SELECT * FROM users;
SELECT username, email FROM users WHERE id = 1;

-- LIMIT and OFFSET (pagination)
SELECT * FROM users LIMIT 10 OFFSET 20;

-- ORDER BY
SELECT * FROM users ORDER BY created_at DESC;

-- DISTINCT
SELECT DISTINCT username FROM users;

-- WHERE with conditions
SELECT * FROM users WHERE age > 18 AND username LIKE 'john%';

-- IN clause
SELECT * FROM users WHERE id IN (1, 2, 3);

-- BETWEEN
SELECT * FROM users WHERE age BETWEEN 18 AND 65;

-- IS NULL / IS NOT NULL
SELECT * FROM users WHERE email IS NULL;
```

## Inserting Data

```sql
-- Insert single row
INSERT INTO users (username, email) VALUES ('john', 'john@example.com');

-- Insert multiple rows
INSERT INTO users (username, email) VALUES 
    ('alice', 'alice@example.com'),
    ('bob', 'bob@example.com');

-- Insert with RETURNING
INSERT INTO users (username, email) 
VALUES ('jane', 'jane@example.com') 
RETURNING id, username;

-- Insert from SELECT
INSERT INTO users_backup SELECT * FROM users;
```

## Updating Data

```sql
-- Basic UPDATE
UPDATE users SET email = 'newemail@example.com' WHERE id = 1;

-- Update multiple columns
UPDATE users SET email = 'new@example.com', username = 'newname' WHERE id = 1;

-- Update with RETURNING
UPDATE users SET email = 'updated@example.com' WHERE id = 1 RETURNING *;
```

## Deleting Data

```sql
-- Delete specific rows
DELETE FROM users WHERE id = 1;

-- Delete all rows
DELETE FROM users;

-- Delete with RETURNING
DELETE FROM users WHERE id = 1 RETURNING *;

-- TRUNCATE (faster for deleting all rows)
TRUNCATE TABLE users;
```

## Joins

```sql
-- INNER JOIN
SELECT u.username, o.order_id 
FROM users u 
INNER JOIN orders o ON u.id = o.user_id;

-- LEFT JOIN
SELECT u.username, o.order_id 
FROM users u 
LEFT JOIN orders o ON u.id = o.user_id;

-- RIGHT JOIN
SELECT u.username, o.order_id 
FROM users u 
RIGHT JOIN orders o ON u.id = o.user_id;

-- FULL OUTER JOIN
SELECT u.username, o.order_id 
FROM users u 
FULL OUTER JOIN orders o ON u.id = o.user_id;
```

## Aggregate Functions

```sql
-- COUNT
SELECT COUNT(*) FROM users;
SELECT COUNT(DISTINCT username) FROM users;

-- SUM, AVG, MIN, MAX
SELECT AVG(age) FROM users;
SELECT SUM(amount) FROM orders;
SELECT MIN(created_at), MAX(created_at) FROM users;

-- GROUP BY
SELECT age, COUNT(*) FROM users GROUP BY age;

-- HAVING (filter after grouping)
SELECT age, COUNT(*) FROM users GROUP BY age HAVING COUNT(*) > 5;
```

## Indexes

```sql
-- Create index
CREATE INDEX idx_username ON users(username);

-- Create unique index
CREATE UNIQUE INDEX idx_unique_email ON users(email);

-- Partial index
CREATE INDEX idx_active_users ON users(username) WHERE active = true;

-- Multi-column index
CREATE INDEX idx_name_email ON users(username, email);

-- Drop index
DROP INDEX idx_username;

-- List indexes
\di
```

## Constraints

```sql
-- Primary key
ALTER TABLE users ADD PRIMARY KEY (id);

-- Foreign key
ALTER TABLE orders ADD CONSTRAINT fk_user 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Unique constraint
ALTER TABLE users ADD CONSTRAINT unique_email UNIQUE (email);

-- Check constraint
ALTER TABLE users ADD CONSTRAINT check_age CHECK (age >= 0);

-- Not null
ALTER TABLE users ALTER COLUMN email SET NOT NULL;

-- Drop constraint
ALTER TABLE users DROP CONSTRAINT constraint_name;
```

## PostgreSQL-Specific Features

```sql
-- SERIAL and BIGSERIAL (auto-incrementing)
CREATE TABLE items (id SERIAL PRIMARY KEY, name TEXT);

-- Arrays
CREATE TABLE posts (tags TEXT[]);
INSERT INTO posts VALUES (ARRAY['postgresql', 'sql']);
SELECT * FROM posts WHERE 'postgresql' = ANY(tags);

-- JSON/JSONB
CREATE TABLE data (info JSONB);
INSERT INTO data VALUES ('{"name": "John", "age": 30}');
SELECT info->>'name' FROM data;
SELECT * FROM data WHERE info->>'age' = '30';

-- Generate series
SELECT * FROM generate_series(1, 10);
SELECT * FROM generate_series('2024-01-01'::date, '2024-01-31'::date, '1 day');

-- Common Table Expressions (CTE)
WITH recent_users AS (
    SELECT * FROM users WHERE created_at > NOW() - INTERVAL '7 days'
)
SELECT * FROM recent_users;

-- Recursive CTE
WITH RECURSIVE subordinates AS (
    SELECT id, name, manager_id FROM employees WHERE id = 1
    UNION
    SELECT e.id, e.name, e.manager_id 
    FROM employees e INNER JOIN subordinates s ON e.manager_id = s.id
)
SELECT * FROM subordinates;

-- Window functions
SELECT username, 
       age,
       AVG(age) OVER (PARTITION BY country) as avg_age_by_country,
       ROW_NUMBER() OVER (ORDER BY age DESC) as row_num
FROM users;

-- UPSERT (INSERT ... ON CONFLICT)
INSERT INTO users (id, username, email) 
VALUES (1, 'john', 'john@example.com')
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
```

## Transactions

```sql
-- Begin transaction
BEGIN;

-- Commit
COMMIT;

-- Rollback
ROLLBACK;

-- Savepoint
BEGIN;
UPDATE users SET email = 'new@example.com' WHERE id = 1;
SAVEPOINT sp1;
UPDATE users SET username = 'newname' WHERE id = 1;
ROLLBACK TO sp1;
COMMIT;
```

## Views

```sql
-- Create view
CREATE VIEW active_users AS 
SELECT * FROM users WHERE active = true;

-- Materialized view
CREATE MATERIALIZED VIEW user_stats AS
SELECT COUNT(*) as total_users FROM users;

-- Refresh materialized view
REFRESH MATERIALIZED VIEW user_stats;

-- Drop view
DROP VIEW active_users;
```

## Common psql Commands

```sql
\l                    -- List databases
\c dbname             -- Connect to database
\dt                   -- List tables
\d tablename          -- Describe table
\du                   -- List users/roles
\df                   -- List functions
\dv                   -- List views
\di                   -- List indexes
\timing               -- Toggle query timing
\q                    -- Quit psql
\x                    -- Toggle expanded display
\i filename.sql       -- Execute SQL from file
```

## Date/Time Functions

```sql
-- Current timestamp
SELECT NOW();
SELECT CURRENT_TIMESTAMP;
SELECT CURRENT_DATE;

-- Date arithmetic
SELECT NOW() + INTERVAL '1 day';
SELECT NOW() - INTERVAL '1 week';

-- Extract parts
SELECT EXTRACT(YEAR FROM NOW());
SELECT DATE_PART('month', NOW());

-- Format dates
SELECT TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI:SS');
```

## String Functions

```sql
-- Concatenation
SELECT 'Hello' || ' ' || 'World';
SELECT CONCAT('Hello', ' ', 'World');

-- Case conversion
SELECT UPPER('hello'), LOWER('WORLD');

-- Substring
SELECT SUBSTRING('PostgreSQL' FROM 1 FOR 4);

-- Length
SELECT LENGTH('PostgreSQL');

-- Pattern matching
SELECT * FROM users WHERE username LIKE 'john%';
SELECT * FROM users WHERE username ~ '^john'; -- regex
```