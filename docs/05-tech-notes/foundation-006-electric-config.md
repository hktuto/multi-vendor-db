# Electric SQL + PGlite Setup

Local development environment for real-time sync with Electric SQL and PGlite.

## Architecture

```
┌─────────────────┐     sync      ┌──────────────────┐
│   Vue Frontend  │ ◄────────────► │  Electric SQL    │
│   (PGlite)      │                │  (Port 30000)    │
└─────────────────┘                └────────┬─────────┘
                                            │ replication
                                            ▼
                                   ┌──────────────────┐
                                   │   PostgreSQL 15  │
                                   │   (Port 5432)    │
                                   └──────────────────┘
```

## Quick Start

### 1. Start Docker Services

```bash
docker-compose up -d
```

This starts:
- **PostgreSQL** on port 5432
- **Electric SQL** on port 30000

### 2. Check Services

```bash
# Check PostgreSQL
docker-compose logs postgres

# Check Electric
docker-compose logs electric

# Or check both
docker-compose ps
```

### 3. Stop Services

```bash
docker-compose down
```

To remove data volume (fresh start):
```bash
docker-compose down -v
```

## Configuration

### Environment Variables

Copy `.env.example` to `.env` in the `apps/web` directory:

```bash
cd apps/web
cp .env.example .env
```

For local development, the defaults should work:
- `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/multi_vendor`
- `ELECTRIC_URL=http://localhost:30000`

## Database Migrations

After Electric SQL is running, apply migrations:

```bash
cd apps/web
npx nuxt db migrate
```

Or generate new migrations after schema changes:

```bash
npx nuxt db generate
```

## Troubleshooting

### Port Already in Use

If port 5432 or 30000 is taken:

```bash
# Check what's using the port
lsof -i :5432
lsof -i :30000

# Kill the process or change ports in docker-compose.yml
```

### Reset Everything

```bash
# Stop and remove containers + volumes
docker-compose down -v

# Start fresh
docker-compose up -d
```

### Electric SQL Won't Connect

Check if PostgreSQL is healthy first:
```bash
docker-compose logs postgres | tail -20
```

Make sure `wal_level=logical` is set (should be automatic via docker-compose).

## Tables to Sync

See `AGENTS-OPENCLAW.md` for the 7 tables that will be synchronized:
- `users`
- `companies`
- `company_members`
- `user_groups`
- `user_group_members`
- `workspaces`
- `folders`
