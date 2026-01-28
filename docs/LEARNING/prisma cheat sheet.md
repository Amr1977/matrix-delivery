Below is a practical Prisma cheat sheet + a production-grade workflow tailored for Node.js + PostgreSQL, optimized for real projects (APIs, SaaS, backends). This assumes you already think like an engineer, not a beginner.


---

Prisma Cheat Sheet (Node.js + PostgreSQL)

1. Install & Initialize

npm install prisma @prisma/client
npx prisma init

Creates:

prisma/
 └─ schema.prisma
.env


---

2. schema.prisma Core Structure

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

.env

DATABASE_URL="postgresql://user:pass@localhost:5432/app_db?schema=public"


---

3. Model Definition (PostgreSQL-optimized)

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String?
  role      Role     @default(USER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  posts     Post[]
}

model Post {
  id        String   @id @default(uuid())
  title     String
  content   String?
  published Boolean  @default(false)
  authorId  String
  author    User     @relation(fields: [authorId], references: [id])

  @@index([authorId])
}

enum Role {
  USER
  ADMIN
}


---

4. Migrations (Correct Workflow)

Create migration

npx prisma migrate dev --name init

Apply existing migrations (prod)

npx prisma migrate deploy

Reset DB (dev only ⚠️)

npx prisma migrate reset


---

5. Prisma Client Setup (Singleton Pattern)

Never create PrismaClient per request

// src/lib/prisma.js
import { PrismaClient } from '@prisma/client'

const globalForPrisma = global

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query', 'error']
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}


---

6. CRUD Cheat Sheet

Create

await prisma.user.create({
  data: {
    email: 'user@test.com',
    name: 'Amr'
  }
})

Read

await prisma.user.findUnique({
  where: { email: 'user@test.com' }
})

Read with relations

await prisma.user.findMany({
  include: { posts: true }
})

Update

await prisma.user.update({
  where: { id },
  data: { name: 'Updated' }
})

Delete

await prisma.user.delete({
  where: { id }
})


---

7. Filtering, Pagination, Sorting

await prisma.post.findMany({
  where: {
    published: true,
    title: { contains: 'prisma', mode: 'insensitive' }
  },
  orderBy: { createdAt: 'desc' },
  skip: 0,
  take: 10
})


---

8. Transactions (Critical)

await prisma.$transaction(async (tx) => {
  const user = await tx.user.create({ data: {...} })
  await tx.post.create({
    data: {
      title: 'Hello',
      authorId: user.id
    }
  })
})

Or batch:

await prisma.$transaction([
  prisma.user.create(...),
  prisma.post.create(...)
])


---

9. Raw SQL (When Needed)

await prisma.$queryRaw`
  SELECT * FROM "User" WHERE role = 'ADMIN'
`

⚠️ Use $queryRawUnsafe only if you fully control inputs.


---

10. Indexing & Performance (Postgres)

model Order {
  id        String   @id @default(uuid())
  status    String
  userId    String
  createdAt DateTime @default(now())

  @@index([userId])
  @@index([status, createdAt])
}

Rules

Index foreign keys

Composite indexes for filters + sorting

Avoid over-indexing



---

Best-Practice Workflow (Real World)

1. Schema-First Development

Feature → Schema change → Migration → Code

Never:

Code → DB hacks → regret


---

2. Environment Strategy

Environment	Command

Local	prisma migrate dev
CI	prisma migrate deploy
Prod	prisma migrate deploy


❌ Never use db push in production
✔ Use migrations only


---

3. db push vs migrate

Command	Use Case

db push	Prototyping, tests
migrate dev	Development
migrate deploy	Production



---

4. Prisma + Express Structure

src/
 ├─ lib/prisma.js
 ├─ modules/
 │   ├─ user/
 │   │   ├─ user.service.js
 │   │   └─ user.controller.js
 └─ app.js

Service layer example

export const getUserById = (id) =>
  prisma.user.findUnique({ where: { id } })


---

5. Validation Strategy

Prisma → structural validation

Zod / Joi → runtime input validation


import { z } from 'zod'

const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2)
})


---

6. Error Handling (Prisma Errors)

import { Prisma } from '@prisma/client'

try {
  ...
} catch (e) {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === 'P2002') {
      // unique constraint
    }
  }
}

Common codes:

P2002 → unique constraint

P2025 → record not found



---

7. Security Best Practices

✔ Never expose Prisma directly to frontend
✔ Always validate inputs
✔ Use least-privilege DB user
✔ Use connection pooling (pgBouncer / Neon / Supabase)


---

8. PostgreSQL-Specific Tips

Prefer uuid() over auto-increment

Use @db.Timestamptz when needed

Use enums sparingly (hard to change)


createdAt DateTime @default(now()) @db.Timestamptz


---

9. Production Checklist

✅ Migrations committed
✅ DATABASE_URL uses pooled connection
✅ PrismaClient singleton
✅ Indexes reviewed
✅ No db push in prod
✅ Logs disabled or reduced


---

10. When Prisma is NOT Ideal

Avoid Prisma if:

Heavy analytical queries

Complex CTEs everywhere

Legacy DB with extreme constraints


Use Prisma + raw SQL instead, not replace it.


---

If you want next:

Prisma + Neon / Supabase setup

Prisma vs TypeORM vs Drizzle (hard comparison)

Prisma schema for delivery / queue / fintech apps

CI/CD migration strategy


Just say which direction, father.