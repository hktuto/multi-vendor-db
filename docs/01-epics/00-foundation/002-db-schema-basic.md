---
epic: Foundation
number: 2
status: finish
created: 2026-02-15
started: 2026-02-15
completed: 2026-02-15
test_plan: "[[test-foundation-002-db-schema-basic]]"
tech_notes:
  - "[[foundation-002-sql-schema]]"
  - "[[foundation-002-data-types]]"
epic_ref: "[[foundation]]"
related: []
tags:
  - epic/foundation
  - status/finish
---

# 002: DB Schema - Basic

## Overview

Core database schema for users, authentication, companies, workspaces, and folder organization.

| Metadata | Value |
|----------|-------|
| **Epic** | Foundation |
| **Number** | 2 |
| **Status** | ✅ Finish |

## Schema

### ⚠️ ID Generation Rule

**All IDs are application-generated using UUIDv7** (NOT database auto-generated, NOT randomUUID).

```typescript
import { uuidv7 } from 'uuidv7'

// Application generates time-based, sortable ID
const newUser = await db.insert(users).values({
  id: uuidv7(), // ✅ Time-based, sortable
  email: 'test@example.com',
  name: 'Test'
})
```

**Why UUIDv7?**
- Time-based (first 48 bits = timestamp) → naturally sortable
- Better database indexing performance
- Can extract creation time from ID
- Install: `pnpm add uuidv7`

### 1. Users & Authentication

```typescript
// users - Global user profiles (no auth credentials)
interface User {
  id: string;                    // UUID PK - APP GENERATED
  email: string;                 // Unique
  name: string;
  avatar_url?: string;
  preferences: Record<string, any>; // JSONB
  created_at: Date;
  updated_at: Date;
  last_login_at?: Date;
  is_active: boolean;
}

// user_accounts - Multiple auth methods per user
interface UserAccount {
  id: string;                    // UUID PK - APP GENERATED
  user_id: string;               // FK → users
  provider: 'password' | 'google' | 'github' | 'microsoft';
  provider_account_id: string;   // Unique per provider
  password_hash?: string;        // For password provider
  last_password_update?: Date;
  access_token?: string;         // OAuth tokens
  refresh_token?: string;
  expires_at?: Date;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}
```

### 2. Company & Members

```typescript
// companies - Tenant root
interface Company {
  id: string;                    // UUID PK - APP GENERATED
  name: string;
  slug: string;                  // URL-friendly, unique
  owner_id: string;              // FK → users
  settings: {
    timezone: string;
    date_format: string;
    default_language: string;
    theme: any;                  // Flexible
  };
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;             // Soft delete
}

// company_members - Company membership
interface CompanyMember {
  id: string;                    // UUID PK - APP GENERATED
  company_id: string;            // FK → companies
  user_id: string;               // FK → users
  role: 'admin' | 'member';
  joined_at: Date;
  invited_by?: string;           // FK → users
}

// user_groups - Organize users within company
interface UserGroup {
  id: string;                    // UUID PK - APP GENERATED
  company_id: string;            // FK → companies
  name: string;
  description?: string;
  created_by: string;            // FK → users
  created_at: Date;
  updated_at: Date;
}

// user_group_members - Group membership with roles
// Note: company_id added for easy querying and local sync
interface UserGroupMember {
  id: string;                    // UUID PK - APP GENERATED
  company_id: string;            // FK → companies (for easy query/sync)
  group_id: string;              // FK → user_groups
  user_id: string;               // FK → users
  role: 'admin' | 'member';
  added_by: string;              // FK → users
  added_at: Date;
}

// invite_links - Link-based invitations
interface InviteLink {
  id: string;                    // UUID PK - APP GENERATED
  company_id: string;            // FK → companies
  created_by: string;            // FK → users
  token: string;                 // Unique, indexed
  role: 'admin' | 'member';
  max_uses?: number;             // null = unlimited
  used_count: number;
  expires_at?: Date;
  created_at: Date;
  used_at?: Date;
  used_by?: string;              // FK → users
  is_active: boolean;
}
```

### 3. Workspace & Folders

```typescript
// Menu item for workspace navigation
type MenuItemType = 'folder' | 'table' | 'view' | 'dashboard';

interface MenuItem {
  id: string;
  type: MenuItemType;
  itemId: string;                // Actual folder/table/view/dashboard ID
  order: number;
  children?: MenuItem[];         // Nested items
  permissions: {
    read: string[];              // User/Group IDs
    readwrite: string[];
    manage: string[];
  };
}

// workspaces - Main container with menu tree
interface Workspace {
  id: string;                    // UUID PK - APP GENERATED
  company_id: string;            // FK → companies
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  menu: MenuItem[];              // JSONB tree structure
  created_by: string;            // FK → users
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

// folders - Organization within workspace
// Note: parent_id REMOVED - hierarchy is in workspace.menu JSONB
interface Folder {
  id: string;                    // UUID PK - APP GENERATED
  company_id: string;            // FK → companies
  workspace_id: string;          // FK → workspaces
  // parent_id REMOVED - hierarchy in workspace.menu
  name: string;
  icon?: string;
  color?: string;
  order_index: number;
  created_by: string;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}
```

## Schema Summary

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `users` | Global profiles | **id** (app-generated), email, name, preferences JSONB |
| `user_accounts` | Auth methods | **id** (app-generated), user_id, provider, password_hash |
| `companies` | Tenants | **id** (app-generated), slug, owner_id, settings JSONB |
| `company_members` | Membership | **id** (app-generated), company_id, user_id, role |
| `user_groups` | Groups | **id** (app-generated), company_id, name |
| `user_group_members` | Group membership | **id** (app-generated), **company_id**, group_id, user_id, role |
| `invite_links` | Invitations | **id** (app-generated), token, role, max_uses, expires_at |
| `workspaces` | Containers | **id** (app-generated), company_id, menu JSONB |
| `folders` | Organization | **id** (app-generated), workspace_id, order_index (flat, no parent_id) |

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **⚠️ App-generated IDs** | No `defaultRandom()` - enables migration & offline sync |
| **User & Auth separated** | Multiple auth methods per user (password, OAuth, SAML) |
| **UserGroupMember has company_id** | Easy querying and local sync (denormalized) |
| **Folder has no parent_id** | Hierarchy is in workspace.menu JSONB (single source) |
| **Company has `slug`** | URL-friendly identifier for routing |
| **Workspace has `menu` JSONB** | Single sync for navigation + permissions |
| **Soft deletes** | `deleted_at` on all major entities |

## Implementation

### Files Created

| File | Purpose |
|------|---------|
| `server/db/schema.ts` | Drizzle ORM schema |
| `server/db/migrations/postgresql/0000_*.sql` | Auto-generated migration |
| `server/tasks/seed.ts` | Nitro seed task |
| `shared/types/db.ts` | TypeScript types for client |

### Commands

```bash
# Generate migration (after schema changes)
cd apps/web
npx nuxt db generate

# Apply migration
npx nuxt db migrate

# Run seed task
npx nitro task run db:seed
```

## Implementation Log

### 2026-02-15
- ✅ Created Drizzle ORM schema in `apps/web/server/db/schema.ts`
- ✅ **Application-generated IDs** (no `defaultRandom()`)
- ✅ Added `company_id` to `user_group_members` for easy sync
- ✅ Removed `parent_id` from `folders` (hierarchy in menu)
- ✅ Generated new migration after schema fixes
- ✅ Created seed task at `server/tasks/seed.ts`
- ✅ Created shared types at `shared/types/db.ts`
- ✅ Feature complete
