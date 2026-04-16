# Database Schema

This folder contains the PostgreSQL schema for the Matrix Heroes platform.

## schema.sql

The canonical schema file. To initialize a fresh database:

```bash
psql -U your_db_user -d your_db_name -f database/schema/schema.sql
```

See the root `.env.example` for database configuration options.
