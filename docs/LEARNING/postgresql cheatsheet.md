Below is a concise but professional PostgreSQL + SQL cheatsheet, structured for daily backend / DBA / system work.
(It’s vendor-aware: standard SQL + PostgreSQL-specific parts clearly marked.)


---

PostgreSQL & SQL Cheatsheet

1️⃣ Connection & Meta Commands (psql)

psql -h host -p 5432 -U user -d db

\l              -- list databases
\c db_name      -- connect to database
\dn             -- list schemas
\dt             -- list tables
\dt schema.*    -- list tables in schema
\d table        -- describe table
\d+ table       -- extended table info
\du             -- list users/roles
\q              -- quit


---

2️⃣ Database & Schema

CREATE DATABASE app_db;
DROP DATABASE app_db;

CREATE SCHEMA reporting;
DROP SCHEMA reporting CASCADE;
SET search_path TO reporting, public;


---

3️⃣ Tables

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

DROP TABLE users;
TRUNCATE TABLE users RESTART IDENTITY;


---

4️⃣ Data Types (PostgreSQL)

Type	Notes

SERIAL / BIGSERIAL	Auto increment
INT / BIGINT	Integers
NUMERIC(p,s)	Precise decimals
TEXT	Unlimited string
VARCHAR(n)	Limited string
BOOLEAN	true / false
TIMESTAMP	Without TZ
TIMESTAMPTZ	With timezone
JSON / JSONB	JSONB is indexed
UUID	Use with gen_random_uuid()
ARRAY	INT[], TEXT[]



---

5️⃣ Insert / Select / Update / Delete

INSERT INTO users (email, password)
VALUES ('a@test.com', 'hash');

SELECT * FROM users;
SELECT email FROM users WHERE id = 1;

UPDATE users SET password = 'new'
WHERE id = 1;

DELETE FROM users WHERE id = 1;


---

6️⃣ Filtering & Sorting

WHERE age > 18
WHERE email LIKE '%@gmail.com'
WHERE id IN (1,2,3)
WHERE deleted_at IS NULL

ORDER BY created_at DESC
LIMIT 10 OFFSET 20


---

7️⃣ Joins

SELECT o.id, u.email
FROM orders o
JOIN users u ON u.id = o.user_id;

LEFT JOIN
RIGHT JOIN
FULL JOIN


---

8️⃣ Constraints

PRIMARY KEY
UNIQUE
NOT NULL
CHECK (age >= 18)

ALTER TABLE orders
ADD CONSTRAINT fk_user
FOREIGN KEY (user_id) REFERENCES users(id);


---

9️⃣ Indexes (Critical for Performance)

CREATE INDEX idx_users_email ON users(email);

CREATE UNIQUE INDEX idx_users_email_unique ON users(email);

CREATE INDEX idx_json ON events USING GIN (payload);

DROP INDEX idx_users_email;


---

🔟 Aggregations

SELECT COUNT(*) FROM users;
SELECT user_id, COUNT(*) FROM orders GROUP BY user_id;

HAVING COUNT(*) > 5


---

1️⃣1️⃣ Transactions

BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;

ROLLBACK;


---

1️⃣2️⃣ JSON / JSONB (Postgres power)

SELECT payload->>'name' FROM events;

WHERE payload @> '{"type":"login"}'

UPDATE events
SET payload = payload || '{"ip":"1.1.1.1"}';


---

1️⃣3️⃣ Views

CREATE VIEW active_users AS
SELECT * FROM users WHERE deleted_at IS NULL;

DROP VIEW active_users;


---

1️⃣4️⃣ Functions & Procedures

CREATE FUNCTION now_utc()
RETURNS TIMESTAMPTZ AS $$
BEGIN
  RETURN now() AT TIME ZONE 'UTC';
END;
$$ LANGUAGE plpgsql;


---

1️⃣5️⃣ Users & Roles

CREATE ROLE app_user LOGIN PASSWORD 'secret';

GRANT SELECT, INSERT ON users TO app_user;

ALTER ROLE app_user CREATEDB;


---

1️⃣6️⃣ Backup & Restore (Schema / Data)

pg_dump db > backup.sql
pg_dump -s db > schema.sql
pg_restore -d db backup.dump


---

1️⃣7️⃣ Performance & Debugging

EXPLAIN SELECT * FROM users WHERE email='x';

EXPLAIN ANALYZE SELECT * FROM users;

SHOW shared_buffers;
SHOW work_mem;


---

1️⃣8️⃣ Common PostgreSQL Extensions

CREATE EXTENSION pgcrypto;   -- UUID, encryption
CREATE EXTENSION citext;     -- Case-insensitive text
CREATE EXTENSION uuid-ossp;


---

1️⃣9️⃣ Time & Date

now()
current_date
current_timestamp

created_at > now() - interval '7 days'


---

2️⃣0️⃣ Information Schema (Introspection)

SELECT * FROM information_schema.tables;

SELECT * FROM information_schema.columns
WHERE table_name = 'users';


---

✅ Suggested Next Step (Optional)

If you want, I can:

Convert this into one-page printable PDF

Generate a PostgreSQL-only advanced cheatsheet

Create a Node.js / Prisma / Express SQL quick map

Add real production patterns (soft delete, audit logs)


Just tell me which.