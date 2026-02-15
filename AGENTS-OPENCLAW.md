# AI Agent Instructions (OpenClaw Version)

This document contains operational guidelines for Clawer (OpenClaw AI) working on this project.

**Note:** This is the OpenClaw-adapted version. Original AGENTS.md uses MCP tools which OpenClaw doesn't support. This version uses OpenClaw's native tools + Obsidian REST API.

---

## Project Structure

### Vault Structure (Epic-Based)

```
docs/
├── 00-meta/                   # Project-level docs
│   ├── _index.md             # Project dashboard
│   ├── roadmap.md            # Phases → Epics
│   └── standards.md          # Naming conventions
│
├── 01-epics/                  # Epic folders
│   ├── epics.md              # All epics overview
│   ├── 00-foundation/        # Epic folder
│   │   ├── foundation.md     # Epic index (status + features)
│   │   ├── 001-project-setup.md
│   │   ├── 002-db-schema-basic.md
│   │   └── 003-auth-system.md
│   ├── 01-company/
│   │   ├── company.md
│   │   └── 001-*.md
│   └── ...
│
├── 02-tests/                  # Test plans (flat)
├── 03-journal/                # Daily logs
├── 04-user-guides/            # Client-facing docs
└── 05-tech-notes/             # Technical deep-dives
```

### Key Principles

| Principle | Implementation |
|-----------|----------------|
| **Token Efficiency** | Epic index <300 tokens, Feature <800 tokens |
| **No Duplication** | Single source of truth per level |
| **Easy Navigation** | Epic name files (e.g., `foundation.md`) |
| **Clear Status** | Status at epic AND feature level |

---

## Workflow Rules

### 1. Finding the Next Feature Number

1. Read epic folder: `read docs/01-epics/{epic-name}/{epic-name}.md`
2. Look at feature list table
3. Use next number (e.g., if last is 003, use 004)
4. Update epic file's feature table after creating feature

### 2. Creating a Feature

**File**: `docs/01-epics/{epic-folder}/{number}-{name}.md`

**Frontmatter**:
```yaml
---
epic: Foundation              # Epic name
number: 4                     # Feature number (within epic)
status: pending               # pending | processing | finish | hold
created: 2026-02-15
test_plan: "[[test-foundation-004-name]]"
tech_notes:
  - "[[foundation-004-topic]]"
epic_ref: "[[foundation]]"    # Link to epic file
tags:
  - epic/foundation
  - status/pending
---
```

**Content** (<800 tokens):
```markdown
# 004: Feature Name

## Overview
One paragraph description.

## Scope
- Included
- Not included

## Key Design Decisions
Brief bullets

## Tasks
- [ ] Task 1
- [ ] Task 2

## Implementation Log
- Date: What was done
```

**Create via Obsidian API**:
```bash
curl -X POST "http://127.0.0.1:27123/vault/01-epics/{epic-folder}/{number}-{name}.md" \
  -H "Authorization: Bearer {OBSIDIAN_API_KEY}" \
  -H "Content-Type: text/markdown" \
  -d "{content}"
```

### 3. Creating an Epic

**When**: New functional area with 3+ features

**Folder**: `docs/01-epics/{order}-{name}/`

**Files**:
- `{name}.md` - Epic index
- `001-first-feature.md` - First feature

**Epic Frontmatter**:
```yaml
---
epic_id: EPIC-009
epic_name: New Epic
phase: 2
status: pending
created: 2026-02-15
tags:
  - epic/new-epic
  - status/pending
---
```

**Epic Content**:
```markdown
# Epic: New Epic

Brief description.

## Phase
Phase 2

## Features

| # | Feature | Status | Test Plan |
|---|---------|--------|-----------|
| 1 | [[001-first-feature\|First Feature]] | ⏳ Pending | [[...\|Test]] |

## Dependencies
- [[../00-foundation/foundation\|Foundation]]

## Next Epic
→ [[../next-epic/epic-name\|Next Epic]]
```

**Update**: Also update `docs/01-epics/epics.md` and `docs/00-meta/roadmap.md`

### 4. Linking Conventions

```markdown
# Within same epic
[[001-project-setup]]
[[002-db-schema-basic]]

# To epic file
[[foundation]]
[[company]]

# To other epic
[[../01-company/company]]

# To test
[[../../02-tests/test-foundation-002-db-schema]]
```

---

## Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Epic folder | `{order}-{name}/` | `00-foundation/` |
| Epic file | `{name}.md` | `foundation.md` |
| Feature | `{number}-{name}.md` | `002-db-schema-basic.md` |
| Test | `test-{epic}-{number}-{name}.md` | `test-foundation-002-db-schema.md` |
| Tech Note | `{epic}-{number}-{topic}.md` | `foundation-002-sql.md` |

---

## Status Management

### Epic Status
In `{epic-name}.md` frontmatter:
```yaml
status: processing
tags:
  - epic/foundation
  - status/processing
```

### Feature Status
In feature file frontmatter + epic feature table:
```yaml
# In feature file
status: finish
tags:
  - epic/foundation
  - status/finish
```

```markdown
# In epic file - update this too!
| 2 | [[002-db-schema-basic\|DB Schema]] | ✅ Finish | [[...\|Test]] |
```

### Status Values

| Value | Emoji | Tag |
|-------|-------|-----|
| pending | ⏳ | `#status/pending` |
| processing | 🚧 | `#status/processing` |
| finish | ✅ | `#status/finish` |
| hold | ⏸️ | `#status/hold` |

---

## Development Workflow

### Phase 1: Feature Proposal
1. Read `docs/01-epics/{name}/{name}.md` for next number
2. Create feature overview (<500 tokens)
3. Present for **approval**
4. **WAIT** before proceeding

### Phase 2: Test Planning
1. Create test plan in `docs/02-tests/`
2. Present for **approval**
3. **WAIT** before implementing

### Phase 3: Implementation
1. Implement feature
2. Run tests
3. Update feature status via Obsidian API
4. Update epic feature table

### Phase 4: Documentation
1. Create user guide in `docs/04-user-guides/`
2. Present for review

---

## Tool Usage (OpenClaw)

| Task | Tool |
|------|------|
| Read files | `read` |
| Write/Edit files | `write` / `edit` |
| Search vault | `exec` + Obsidian REST API |
| Navigate web | `browser` / `web_fetch` |
| Take screenshots | `browser screenshot` |
| Run commands | `exec` |
| Search code | `exec` + `grep`/`find` |
| Project memory | `memory_search` / `memory_get` |

### Obsidian API Commands

**List vault files**:
```bash
curl -s "http://127.0.0.1:27123/vault/" \
  -H "Authorization: Bearer 0cd92be703aa8761afc290b056500549a8d1e8a86458a24306bd8dea4e706e93"
```

**Read note**:
```bash
curl -s "http://127.0.0.1:27123/vault/01-epics/foundation/foundation.md" \
  -H "Authorization: Bearer 0cd92be703aa8761afc290b056500549a8d1e8a86458a24306bd8dea4e706e93"
```

**Write/Update note**:
```bash
curl -X POST "http://127.0.0.1:27123/vault/01-epics/foundation/004-new-feature.md" \
  -H "Authorization: Bearer 0cd92be703aa8761afc290b056500549a8d1e8a86458a24306bd8dea4e706e93" \
  -H "Content-Type: text/markdown" \
  -d "# content here"
```

**Search vault**:
```bash
curl -s "http://127.0.0.1:27123/search?query=auth" \
  -H "Authorization: Bearer 0cd92be703aa8761afc290b056500549a8d1e8a86458a24306bd8dea4e706e93"
```

---

## Library Documentation

**For technical questions**, use:
1. `web_search` - Find official docs
2. `web_fetch` - Read specific pages
3. `read` - Check existing code in project
4. `exec` - Run `npm`/`pnpm` commands to check versions

**Example workflow**:
```
User: "How to use X in Nuxt?"
→ web_search: "Nuxt 3 X documentation"
→ web_fetch: official docs URL
→ read: check existing implementation
→ Implement
```

---

## Quick Reference

### Starting a New Feature
```
1. Read docs/01-epics/{epic}/{epic}.md
2. Note next feature number
3. Create docs/01-epics/{epic}/{number}-{name}.md via Obsidian API
4. Update epic file's feature table
5. Present for approval
```

### Creating a New Epic
```
1. Create folder docs/01-epics/{order}-{name}/
2. Create {name}.md with status: pending via Obsidian API
3. Create first feature 001-{name}.md
4. Update docs/01-epics/epics.md
5. Update docs/00-meta/roadmap.md
```

---

## NuxtHub Database

This project uses **NuxtHub Database** with Drizzle ORM.

### AI Agent Rules (CRITICAL)

| Rule | Why |
|------|-----|
| **Never create `drizzle.config.ts`** | Generated automatically by NuxtHub |
| **Never write manual SQL migrations** | Always use `npx nuxt db generate` |
| **Never touch `server/db/migrations/`** | Auto-generated directory |
| **Use PGlite for local dev** | No Docker/setup needed |
| **Use camelCase in schema** | Auto-converted to snake_case in DB |
| **⚠️ NEVER use `defaultRandom()` for IDs** | IDs must be app-generated for migration/sync |

### Configuration

- **Dialect**: `nuxt.config.ts` → `hub.db: 'postgresql'`
- **Local Dev**: PGlite (embedded PostgreSQL)
- **Production**: PostgreSQL via env vars

### Schema Location

```
apps/web/server/db/schema.ts          # Main schema
apps/web/server/db/schema/*.ts        # Additional schemas
```

### Schema Definition

```typescript
import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const users = pgTable('users', {
  id: uuid('id').primaryKey(), // ⚠️ NO defaultRandom() - app generates ID
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(userAccounts),
}))
```

### ⚠️ ID Generation Rule (CRITICAL)

**NEVER use `defaultRandom()` or database-generated IDs.**

All IDs must be generated by the application using **UUIDv7**:

```typescript
// ❌ WRONG - Database generates ID
id: uuid('id').primaryKey().defaultRandom()

// ❌ WRONG - Using standard UUID v4 (not sortable)
import { randomUUID } from 'crypto'
id: randomUUID()

// ✅ CORRECT - Application generates UUIDv7
import { uuidv7 } from 'uuidv7'

const newUser = await db.insert(users).values({
  id: uuidv7(), // Time-based, sortable UUID
  email: 'test@example.com',
  name: 'Test User'
})
```

**Why UUIDv7?**
- **Time-based**: First 48 bits = Unix timestamp (sortable!)
- **Better indexing**: Database indexes are more efficient
- **Time extractable**: Can get creation time from ID
- **Collision resistant**: 122 bits of randomness

**Install:**
```bash
pnpm add uuidv7
```

**Note:** UUIDv7 requires package installation. Always ask before using ID libraries.

### Migration Workflow

```bash
# 1. Modify schema.ts
# 2. Generate migration (creates SQL in server/db/migrations/)
npx nuxt db generate

# 3. Apply migration
npx nuxt db migrate
# OR run dev (auto-applies)
npx nuxt dev
```

### Database Access

```typescript
import { db } from '@nuxthub/db'

// Query
const users = await db.select().from(tables.users)

// Insert
const user = await db.insert(tables.users).values({
  email: 'test@example.com',
  name: 'Test User'
}).returning()
```

---

## Key Differences from MCP Version

| Original (MCP) | OpenClaw Version |
|----------------|------------------|
| `obsidian_update_note` | `write` / `edit` or Obsidian REST API |
| `obsidian_global_search` | `exec` + curl to Obsidian API |
| `obsidian_manage_frontmatter` | `read` + parse + `write` |
| `context7_resolve_library` + `query_docs` | `web_search` + `web_fetch` |
| `chrome_navigate` + `take_screenshot` | `browser` tool |

---

**Last Updated**: 2026-02-15
**Version**: OpenClaw Adaptation v1.0
