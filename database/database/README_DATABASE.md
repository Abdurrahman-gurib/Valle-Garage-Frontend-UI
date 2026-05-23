# PostgreSQL database setup

Recommended setup uses Prisma:

```powershell
psql -U postgres
CREATE DATABASE valle_gms;
\q
copy .env.example .env
npx prisma generate
npx prisma db push
npm run db:seed
```

A raw SQL seed file is included as `valle_gms_full_database.sql` for teams that prefer direct import.
