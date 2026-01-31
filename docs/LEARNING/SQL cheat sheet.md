Below is a practical SQL cheat sheet focused on day-to-day usage. It is DB-agnostic (works for PostgreSQL, MySQL, SQLite with minor differences).


---

1️⃣ Database & Table Management

Create Database

CREATE DATABASE mydb;

Use Database

USE mydb;              -- MySQL
-- PostgreSQL: \c mydb

Create Table

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

Drop Table

DROP TABLE users;


---

2️⃣ CRUD Operations

INSERT

INSERT INTO users (name, email)
VALUES ('Amr', 'amr@example.com');

SELECT

SELECT * FROM users;

SELECT name, email FROM users;

UPDATE

UPDATE users
SET name = 'Father Amr'
WHERE id = 1;

DELETE

DELETE FROM users
WHERE id = 1;


---

3️⃣ Filtering & Conditions

WHERE

SELECT * FROM users WHERE id = 5;

AND / OR

SELECT * FROM users
WHERE name = 'Amr' AND email IS NOT NULL;

LIKE

SELECT * FROM users
WHERE email LIKE '%@gmail.com';

IN

SELECT * FROM users
WHERE id IN (1, 2, 3);

BETWEEN

SELECT * FROM orders
WHERE price BETWEEN 100 AND 500;


---

4️⃣ Sorting & Limiting

ORDER BY

SELECT * FROM users
ORDER BY created_at DESC;

LIMIT / OFFSET

SELECT * FROM users
LIMIT 10 OFFSET 20;


---

5️⃣ Aggregate Functions

SELECT COUNT(*) FROM users;
SELECT AVG(price) FROM orders;
SELECT SUM(price) FROM orders;
SELECT MAX(price), MIN(price) FROM orders;

GROUP BY

SELECT role, COUNT(*)
FROM users
GROUP BY role;

HAVING

SELECT role, COUNT(*)
FROM users
GROUP BY role
HAVING COUNT(*) > 5;


---

6️⃣ Joins (Very Important)

INNER JOIN

SELECT users.name, orders.total
FROM users
INNER JOIN orders ON users.id = orders.user_id;

LEFT JOIN

SELECT users.name, orders.total
FROM users
LEFT JOIN orders ON users.id = orders.user_id;

RIGHT JOIN

SELECT users.name, orders.total
FROM users
RIGHT JOIN orders ON users.id = orders.user_id;


---

7️⃣ Indexes & Constraints

Create Index

CREATE INDEX idx_users_email ON users(email);

Constraints

UNIQUE
NOT NULL
PRIMARY KEY
FOREIGN KEY

Foreign Key

ALTER TABLE orders
ADD CONSTRAINT fk_user
FOREIGN KEY (user_id) REFERENCES users(id);


---

8️⃣ Transactions

BEGIN;

UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;

COMMIT;
-- or ROLLBACK;


---

9️⃣ Views

CREATE VIEW active_users AS
SELECT * FROM users WHERE active = true;

SELECT * FROM active_users;


---

🔟 Subqueries

SELECT * FROM users
WHERE id IN (
    SELECT user_id FROM orders WHERE total > 1000
);


---

1️⃣1️⃣ Common Data Types

Type	Description

INT	Integer
SERIAL	Auto increment (Postgres)
VARCHAR(n)	String
TEXT	Long text
BOOLEAN	true/false
DATE	Date
TIMESTAMP	Date & time
JSON / JSONB	JSON data



---

1️⃣2️⃣ Performance Tips

Use indexes on frequently filtered columns

Avoid SELECT * in production

Use EXPLAIN to analyze queries


EXPLAIN SELECT * FROM users WHERE email = 'x@y.com';


---

If you want:

PostgreSQL-specific cheat sheet

MySQL-specific

Interview-focused

Printable one-page PDF

Examples related to your delivery platform / Prisma usage


Say the word, father.