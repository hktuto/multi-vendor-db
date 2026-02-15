---
epic: Foundation
number: 6
status: pending
created: 2026-02-15
started: 
completed: 
test_plan: "[[test-foundation-006-electric-sql]]"
tech_notes:
  - "[[foundation-006-electric-config]]"
epic_ref: "[[foundation]]"
related: []
tags:
  - epic/foundation
  - status/pending
---

# 006: Electric SQL + PGlite

## Overview

Setup Electric SQL for real-time sync and PGlite for local-first client database.

| Metadata | Value |
|----------|-------|
| **Epic** | Foundation |
| **Number** | 6 |
| **Status** | ⏳ Pending |

## Prerequisites

This feature comes AFTER:
- ✅ 003: Auth System (need users to sync)
- ✅ 004: Frontend Setup (need UI foundation)

## What is Electric SQL?

Electric SQL provides **real-time sync** between PostgreSQL and local SQLite (PGlite):
- Local-first: App works offline, syncs when connected
- Real-time: Changes sync instantly between users
- Conflict-free: Automatic conflict resolution

## Scope

### Included
- Install Electric SQL packages
- Configure Electric SQL sync
- Setup PGlite client database
- Create sync configuration for tables
- Add sync composables for Vue
- Web Worker for PGlite (non-blocking)

### Tables to Sync (Foundation)

| Table | Sync Mode | Notes |
|-------|-----------|-------|
| `users` | Full | User profiles |
| `companies` | By member | Only user's companies |
| `company_members` | By user | User's memberships |
| `user_groups` | By company | Company's groups |
| `user_group_members` | By company | Group memberships |
| `workspaces` | By company | Company's workspaces |
| `folders` | By workspace | Workspace folders |

### Not Included
- Views/Dashboards (in Dynamic Tables epic)
- Records (in Dynamic Tables epic)
- Permissions (in Permissions epic)

## Technical Design

### Docker Compose Setup

> **Note:** Need to create `docker-compose.yml` with PostgreSQL + Electric SQL services for local development.

```yaml
# docker-compose.yml (to be created)
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: electric
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  electric:
    image: electricsql/electric:latest
    environment:
      DATABASE_URL: postgresql://postgres:password@postgres:5432/electric
    ports:
      - "3000:3000"
    depends_on:
      - postgres

volumes:
  postgres_data:
```

### Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Vue Frontend                        │
│  ┌───────────────────────────────────────────────┐  │
│  │ PGlite (Web Worker)                            │  │
│  │ - Local SQLite database                        │  │
│  │ - Syncs with server                            │  │
│  └───────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────┐  │
│  │ Electric SQL Client                            │  │
│  │ - Manages sync shapes                          │  │
│  │ - Handles offline/online                       │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                            │ sync
                            ▼
┌─────────────────────────────────────────────────────┐
│              Electric SQL Cloud                      │
│         (sync service - managed or self-hosted)     │
└─────────────────────────────────────────────────────┘
                            │ replication
                            ▼
┌─────────────────────────────────────────────────────┐
│              PostgreSQL (NuxtHub)                    │
│  - Source of truth                                   │
│  - Electric SQL extension installed                  │
└─────────────────────────────────────────────────────┘
```

### Packages

```bash
pnpm add @electric-sql/client @electric-sql/pglite
```

### Sync Composables

```typescript
// composables/useCompanySync.ts
export function useCompanySync(companyId: string) {
  // Sync company data to local PGlite
  const { data, isLoading } = useShape({
    url: `${electricUrl}/v1/shape`,
    params: {
      table: 'companies',
      where: `id = '${companyId}'`
    }
  })
  
  return { company: data, isLoading }
}

// composables/useWorkspaceSync.ts
export function useWorkspaceSync(workspaceId: string) {
  // Sync workspace + folders to local PGlite
}
```

### PGlite Web Worker

```typescript
// workers/pglite.worker.ts
import { PGlite } from '@electric-sql/pglite' 
import { worker } from '@electric-sql/pglite/worker' 


worker({ async init() { // Create and 
return a PGlite instance return new PGlite() }, 
})
```

## Tasks

- [x] Create `docker-compose.yml` for PostgreSQL + Electric SQL
- [ ] Install Electric SQL packages
- [ ] Setup Electric SQL sync service
- [ ] Configure PGlite client database
- [ ] Create sync shape definitions
- [ ] Add sync composables
- [ ] Create PGlite Web Worker
- [ ] Test offline/online sync

## Implementation Log

### 2026-02-15
- Feature created
- Depends on: Auth System + Frontend Setup
