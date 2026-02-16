# Electric SQL + PGlite Development Plan

## Executive Summary

This plan outlines the implementation of Electric SQL for real-time sync and PGlite for local-first client database in the multi-vendor-db project.

**Current State:**
- ✅ Docker Compose with PostgreSQL + Electric SQL is configured
- ✅ Electric SQL packages installed in web app
- ✅ Database schema exists with all tables to sync
- ❌ No PGlite worker implementation
- ❌ No sync composables
- ❌ No client-side sync configuration

---

## 1. What Needs to Be Implemented

### 1.1 Static Bundle Setup for Worker (CRITICAL - Production Requirement)

**Problem:** PGlite worker cannot use ES module imports from npm packages directly in production when self-hosted.

**Solution:** Create a bundled worker file that includes all dependencies.

### 1.2 PGlite Client Database Infrastructure

| Component | Purpose |
|-----------|---------|
| `public/workers/pglite.bundle.js` | Bundled worker with PGlite + extensions |
| `app/utils/pglite-client.ts` | PGliteWorker initialization and management |
| `app/composables/usePGLite.ts` | Vue composable for accessing PGlite instance |

### 1.3 Sync Composables

| Composable | Tables Synced | Scope |
|------------|--------------|-------|
| `useUserSync.ts` | users | Current user profile |
| `useCompanySync.ts` | companies, company_members | Single company + members |
| `useUserGroupsSync.ts` | user_groups, user_group_members | Company's groups |
| `useWorkspaceSync.ts` | workspaces, folders | Company's workspaces |
| `useFoundationSync.ts` | All above | Orchestrates all syncs |

### 1.4 Database Schema Sync

Tables to sync from server to local PGlite:

```
users
├── companies
│   ├── company_members
│   ├── user_groups
│   │   └── user_group_members
│   └── workspaces
│       └── folders
```

---

## 2. File Structure

```
apps/web/
├── public/
│   └── workers/
│       └── pglite.bundle.js          # BUNDLED worker (static file)
│
├── app/
│   ├── utils/
│   │   └── pglite-client.ts          # PGlite client initialization
│   │
│   ├── composables/
│   │   ├── usePGLite.ts              # Base PGlite access composable
│   │   ├── useUserSync.ts            # User profile sync
│   │   ├── useCompanySync.ts         # Company + members sync
│   │   ├── useUserGroupsSync.ts      # Groups sync
│   │   ├── useWorkspaceSync.ts       # Workspaces + folders sync
│   │   └── useFoundationSync.ts      # Orchestrates all syncs
│   │
│   └── plugins/
│       └── pglite.client.ts          # Nuxt plugin for PGlite init
│
├── scripts/
│   └── build-pglite-worker.js        # Worker bundling script
│
├── nuxt.config.ts                    # Updated with worker config
└── package.json                      # Updated with build scripts
```

---

## 3. Key Implementation Details

### 3.1 Worker Bundle Strategy

**Option A: esbuild Bundling (Recommended)**

Create a build script that bundles the worker with all dependencies:

```javascript
// scripts/build-pglite-worker.js
// Bundles: PGlite + live extension + electricSync extension
// Output: public/workers/pglite.bundle.js
```

**Why this matters:**
- Worker runs in an isolated context (no access to node_modules)
- ES modules from npm can't be imported via `import` in worker
- Self-hosted deployments need standalone worker file
- CDN imports (from feature doc) won't work offline/self-hosted

### 3.2 PGlite Schema Setup

Local PGlite tables need to match server schema:

```sql
-- Users table (sync target)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  last_login_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE
);

-- Companies table (sync target)
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  owner_id UUID NOT NULL,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- (Additional tables: company_members, user_groups, etc.)
```

### 3.3 Sync Shape Configuration

Each composable manages its own sync shape. The **table name is the unique identifier** for a shape - one table corresponds to exactly one shape:

```typescript
// Example: useCompanySync
const shape = await pg.electric.syncShapeToTable({
  shape: {
    url: `${electricUrl}/v1/shape`,
    params: {
      table: 'companies'
      // Note: No 'where' clause - server-side proxy auth determines what data to sync
    }
  },
  table: 'companies',
  primaryKey: ['id']
  // Note: No shapeKey - table name is the unique identifier
});
```

**Key Principles:**
- **One table = one shape** - Prevents syncShapeToTable conflicts
- **Table name as identifier** - No separate `shapeKey` needed
- **Server-side filtering** - Proxy auth determines what data to sync, not client-side `where` clauses
- **Client only specifies table** - The client requests which table to sync; access control happens server-side

> **Note on Global State:** The sync system uses `window.__electricSharedShapes` for true global singleton storage. This ensures the shared shape registry survives Hot Module Replacement (HMR) during development, preventing duplicate sync subscriptions when code reloads.

### 3.4 Sync Relationships

Components share underlying ShapeStream instances when subscribing to the same table:

```
useFoundationSync (orchestrator)
├── useUserSync (always active)
├── useCompaniesSync (user's companies list)
│   └── All components share the same ShapeStream per table:
│       ├── 'companies' table → shared ShapeStream
│       ├── 'company_members' table → shared ShapeStream
│       ├── 'user_groups' table → shared ShapeStream
│       └── 'workspaces' table → shared ShapeStream
```

**Shared Subscription Pattern:**
- Multiple components subscribing to the same table **share the underlying ShapeStream**
- Each component registers its own callbacks for updates
- ShapeStream is only closed when all components unsubscribe
- This prevents duplicate sync traffic and optimizes resource usage

### 3.5 Vite Configuration Updates

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  vite: {
    optimizeDeps: {
      exclude: ['@electric-sql/pglite'],
    },
    worker: {
      format: 'es',  // Required for worker bundling
    },
  },
});
```

---

## 4. Production Considerations

### 4.1 Static Bundle Build Process

**Build Pipeline:**

```bash
# 1. Install dependencies
pnpm install

# 2. Build worker bundle (runs before Nuxt build)
pnpm build:worker

# 3. Build Nuxt app
pnpm build
```

**Worker Bundle Contents:**
The bundled worker must include:
- `@electric-sql/pglite` (core)
- `@electric-sql/pglite/live` (live queries)
- `@electric-sql/pglite-sync` (electric sync)

### 4.2 Self-Hosted Electric SQL

For production self-hosting:

```yaml
# docker-compose.prod.yml
services:
  electric:
    image: electricsql/electric:latest
    environment:
      DATABASE_URL: ${DATABASE_URL}
      ELECTRIC_API_KEY: ${ELECTRIC_API_KEY}  # Secure with API key
      # Remove ELECTRIC_INSECURE for production
```

### 4.3 Security Considerations

| Concern | Mitigation |
|---------|------------|
| Electric HTTP API exposed | Use API key + proxy through Nuxt API |
| Sync data visibility | Implement auth on sync shapes (where clauses) |
| Local data tampering | Treat PGlite as cache, validate on server write |

**Auth Strategy:**
```typescript
// shapes should filter by user's accessible data
params: {
  table: 'companies',
  where: `id IN (SELECT company_id FROM company_members WHERE user_id = '${userId}')`
}
```

### 4.4 Storage Limits

PGlite uses IndexedDB:
- Browser storage quotas apply (~50-60% of available disk)
- Implement cleanup for old/deleted records
- Monitor storage usage and warn users

---

## 5. Implementation Phases

### Phase 1: Infrastructure (Week 1)
1. Create worker bundling script
2. Set up PGlite client utilities
3. Create base composables structure
4. Add Vite configuration updates

### Phase 2: Core Sync (Week 2)
1. Implement user sync composable
2. Implement company sync composable
3. Add local schema initialization
4. Test sync with Electric

### Phase 3: Related Data (Week 3)
1. Implement user groups sync
2. Implement workspaces sync
3. Add folders sync
4. Create orchestration composable

### Phase 4: Polish (Week 4)
1. Add offline/online detection
2. Implement sync status UI
3. Add error handling and retry logic
4. Production testing

---

## 6. Dependencies to Add

```json
{
  "dependencies": {
    "@electric-sql/pglite": "^0.3.15",
    "@electric-sql/pglite-sync": "^0.4.1"
  },
  "devDependencies": {
    "esbuild": "^0.25.0"
  }
}
```

---

## 7. Configuration Summary

### Environment Variables

```bash
# Electric SQL Sync
ELECTRIC_URL=http://localhost:30000        # Local dev
# ELECTRIC_URL=https://electric.example.com # Production
# ELECTRIC_API_KEY=your-api-key            # Production

# PGlite
PGLITE_DB_NAME=multi_vendor_local          # IndexedDB name
```

### Docker Compose (Already Exists)

```yaml
# docker-compose.yml
# - PostgreSQL with wal_level=logical
# - Electric SQL on port 30000
# - Both services on electric-network
```

---

## 8. Testing Strategy

| Test Type | Focus |
|-----------|-------|
| Unit | Composable logic, shape configuration |
| Integration | Sync flow, data consistency |
| E2E | Offline/online transitions, multi-tab sync |
| Performance | Large dataset sync, initial load time |

---

## 9. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Worker bundling complexity | High | Use esbuild, test thoroughly |
| Sync conflicts | Medium | Read-only sync initially, no local writes |
| Storage limits | Medium | Monitor usage, implement cleanup |
| Browser compatibility | Low | Modern browsers only (IndexedDB, Workers) |

---

## 10. Documentation to Create

1. `docs/01-epics/00-foundation/006-electric-sql-worker.md` - Worker bundling guide
2. `docs/01-epics/00-foundation/006-electric-sql-sync.md` - Sync configuration
3. `docs/01-epics/00-foundation/006-electric-sql-api.md` - Composable usage
4. Update `.env.example` with all required vars

---

## Next Steps

1. **Approve this plan**
2. **Implement Phase 1** - Infrastructure and worker bundling
3. **Test worker bundle** in production-like environment
4. **Proceed with Phase 2-4** based on Phase 1 results

---

## Appendix: Key Code Samples

### Worker Bundle Entry Point

```typescript
// scripts/pglite-worker-entry.ts
import { PGlite } from '@electric-sql/pglite';
import { worker } from '@electric-sql/pglite/worker';
import { live } from '@electric-sql/pglite/live';
import { electricSync } from '@electric-sql/pglite-sync';

worker({
  async init(options) {
    return new PGlite({
      dataDir: options.dataDir,
      extensions: {
        live,
        electric: electricSync(),
      },
    });
  },
});
```

### PGlite Client Initialization

```typescript
// app/utils/pglite-client.ts
import { PGliteWorker } from '@electric-sql/pglite/worker';

let pg: PGliteWorker | null = null;

export async function initPGlite() {
  if (pg) return pg;
  
  pg = new PGliteWorker(
    new Worker('/workers/pglite.bundle.js', { type: 'module' }),
    {
      dataDir: 'idb://multi_vendor_local',
    }
  );
  
  await pg.waitReady;
  await initSchema(pg);
  return pg;
}

async function initSchema(pg: PGliteWorker) {
  // Create local tables matching server schema
  await pg.exec(`...`);
}
```

### useElectricSync Pattern

```typescript
// app/composables/useElectricSync.ts
export function useElectricSync() {
  const config = useRuntimeConfig();
  const ELECTRIC_URL = config.public.electricUrl || "http://localhost:3000";

  /**
   * Subscribe to sync events for a table
   *
   * Multiple components can subscribe to the same shape simultaneously.
   * The underlying ShapeStream and syncShapeToTable are shared,
   * but each component gets its own callbacks.
   *
   * @param config - Shape configuration (table, callbacks, shapeKey, etc.)
   * @returns Unsubscribe function for this specific subscription
   */
  async function subscribe<T extends Record<string, any>>(
    config: ShapeConfig
  ): Promise<() => void> {
    const { table, shapeKey = table, callbacks = {} } = config;
    
    // Get or create shared shape instance
    // If another component already subscribed to this shapeKey,
    // it will reuse the existing ShapeStream + syncShapeToTable
    const sharedShape = await getOrCreateSharedShape(table, shapeKey, url, pkArray);
    
    // Register this component's callbacks
    const callbackId = generateCallbackId();
    sharedShape.callbacks.set(callbackId, { id: callbackId, callbacks });
    
    // Events are dispatched to ALL registered callbacks
    // when ShapeStream receives updates
    
    // Return unsubscribe function - only cleans up this component's callback
    return () => {
      sharedShape.callbacks.delete(callbackId);
      maybeCleanupShape(shapeKey); // Only cleanup if no more subscribers
    };
  }
  
  return {
    subscribe,
    subscribeMany,
    unsubscribe,
    unsubscribeAll,
    hasSubscription,
    getSubscriberCount,  // NEW: see how many components are using a shape
    getSubscribedShapes,
    getSubscribedTables,
    isTableSubscribed,
    isShapeUpToDate,     // NEW: check if initial sync is complete
    // Reactive state
    isSyncing: readonly(globalIsSyncing),
    error: readonly(globalError),
  };
}
```

### Multi-Component Subscription Example

```typescript
// Component A - User List
const electric = useElectricSync();
const unsubA = await electric.subscribe({
  table: 'users',
  shapeKey: 'users-sync',
  callbacks: {
    onInsert: (user) => console.log('A: New user', user),
    onUpdate: (user) => console.log('A: Updated', user),
  }
});

// Component B - User Avatar (same page, same shape)
const unsubB = await electric.subscribe({
  table: 'users', 
  shapeKey: 'users-sync',  // Same shapeKey - shares underlying connection
  callbacks: {
    onUpdate: (user) => console.log('B: Avatar updated', user.avatar_url),
  }
});

// Both A and B receive events from the same ShapeStream
// Only ONE syncShapeToTable + ONE ShapeStream exists for 'users-sync'

// Component A unmounts
unsubA();  // B still receives events

// Component B unmounts  
unsubB();  // Now shape is fully cleaned up (no more subscribers)
```

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Always Hybrid Mode** | syncShapeToTable (data persistence) + ShapeStream (real-time events) are both enabled by default - no `hybridMode` option |
| **Shared Shape Instances** | One ShapeStream per shapeKey, shared across all components subscribing to the same key |
| **Per-Component Callbacks** | Each `subscribe()` call registers its own callbacks; events are dispatched to all |
| **Automatic Cleanup** | Shape is only unsubscribed when the last component unsubscribes |
| **No `where` clause** | Server-side proxy auth will determine what data to sync |
