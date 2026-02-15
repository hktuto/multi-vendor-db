---
epic: Dynamic Tables
number: 1
status: pending
created: 2026-02-15
test_plan: "[[test-dynamic-tables-001-basic-schema]]"
tech_notes:
  - "[[dynamic-tables-001-architecture]]"
epic_ref: "[[dynamic-tables]]"
related: []
tags:
  - epic/dynamic-tables
  - status/pending
---

# 001: Basic Schema

## Overview

Design the foundational schema structure for Dynamic Tables. This feature defines the table container and outlines all sub-features needed for the complete dynamic table system.

| Metadata | Value |
|----------|-------|
| **Epic** | Dynamic Tables |
| **Number** | 1 |
| **Status** | ⏳ Pending |

## Scope

### Included
- Table definition structure (`table_defs`)
- High-level architecture
- Feature roadmap for all dynamic table capabilities
- Table metadata (name, description, settings)
- Soft delete support

### Not Included (Future Features)
- Column definitions → [[002-column-system|002: Column System]]
- Field types → [[003-field-types-validation|003: Field Types & Validation]]
- Record operations → [[004-record-operations|004: Record Operations]]
- Querying system → [[005-querying-system|005: Querying System]]
- File attachments → [[006-file-attachments|006: File Attachments]]

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DYNAMIC TABLES SYSTEM                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │ Table Defs  │──│  Columns    │──│   Records   │──│   Views     │ │
│  │  (001)      │  │  (002-003)  │  │  (004-005)  │  │  (Views     │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  │   Epic)     │ │
│         │                │                │         └─────────────┘ │
│         │                │                │                        │
│         ▼                ▼                ▼                        │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                    table_records (JSONB)                     │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │  │
│  │  │    Data     │  │  Metadata   │  │  Revisions  │          │  │
│  │  │  (values)   │  │  (audit)    │  │  (history)  │          │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘          │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Schema

### table_defs

The container for all table metadata.

```typescript
export const tableDefs = pgTable('table_defs', {
  id: uuid('id').primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
  
  // Core metadata
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull(),
  description: text('description'),
  icon: varchar('icon', { length: 50 }),
  color: varchar('color', { length: 7 }),
  
  // Table configuration
  settings: jsonb('settings').default({}).notNull(),
  // {
  //   allowMultiple: boolean,        // Allow multiple records per user
  //   recordNameFormat: string,      // Template for record display name
  //   defaultView: string,           // Default view type
  //   enableComments: boolean,       // Record-level comments
  //   enableAttachments: boolean,    // Record-level file attachments
  //   enableRevisions: boolean,      // Track record changes
  //   enableForm: boolean,           // Public form submission
  // }
  
  // Soft delete
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  
  // Timestamps
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique('unique_table_slug_per_company').on(table.companyId, table.slug),
  index('idx_table_defs_company_id').on(table.companyId),
  index('idx_table_defs_workspace_id').on(table.workspaceId),
  index('idx_table_defs_deleted_at').on(table.deletedAt),
]);
```

### Relations

```typescript
export const tableDefsRelations = relations(tableDefs, ({ one, many }) => ({
  company: one(companies, {
    fields: [tableDefs.companyId],
    references: [companies.id],
  }),
  workspace: one(workspaces, {
    fields: [tableDefs.workspaceId],
    references: [workspaces.id],
  }),
  createdByUser: one(users, {
    fields: [tableDefs.createdBy],
    references: [users.id],
  }),
  // Future relations (will be added in subsequent features):
  // columns: many(tableColumns),
  // records: many(tableRecords),
}));
```

## Feature Roadmap

This table outlines all features needed for the complete Dynamic Tables system:

| # | Feature | Description | Status |
|---|---------|-------------|--------|
| 1 | **Basic Schema** | Table container, metadata | ⏳ Current |
| 2 | **Column System** | Column definitions structure | ⏳ Pending |
| 3 | **Field Types** | All field types + validation | ⏳ Pending |
| 4 | **Record Operations** | CRUD, bulk, import/export | ⏳ Pending |
| 5 | **Querying System** | Filter, sort, pagination | ⏳ Pending |
| 6 | **File Attachments** | File storage in records | ⏳ Pending |
| 7 | **Relationships** | Table-to-table links | ⏳ Future |
| 8 | **Rollups** | Aggregated data from relations | ⏳ Future |
| 9 | **Formulas** | Computed fields | ⏳ Future |
| 10 | **Permissions** | Field-level access control | ⏳ Permissions Epic |
| 11 | **Views** | Custom views, filters, sorts | ⏳ Views Epic |
| 12 | **Comments** | Record-level discussions | ⏳ Collaboration Epic |
| 13 | **Revisions** | Change history | ⏳ Future |
| 14 | **Automation** | Triggers, webhooks | ⏳ Automation Epic |

## API Structure

```typescript
// Table Management (this feature)
POST   /api/tables              // Create table
GET    /api/tables              // List tables
GET    /api/tables/:id          // Get table
PATCH  /api/tables/:id          // Update table
DELETE /api/tables/:id          // Soft delete table

// Future APIs (defined in subsequent features):
// GET    /api/tables/:id/columns      → 002: Column System
// POST   /api/tables/:id/columns      → 002: Column System
// GET    /api/tables/:id/records      → 004: Record Operations
// POST   /api/tables/:id/records      → 004: Record Operations
// POST   /api/tables/:id/query        → 005: Querying System
```

## Design Decisions

### 1. Table-First Architecture
Tables exist independently of columns and records. This allows:
- Creating tables before defining columns
- Configuring table-level settings
- Soft delete without losing data

### 2. JSONB Settings
Table configuration stored as JSONB for flexibility:
- Easy to add new settings without migration
- Per-table feature toggles
- Custom configuration per use case

### 3. Company-Scoped + Workspace-Optional
- Every table belongs to a company
- Can optionally belong to a workspace (null = global)
- Slug uniqueness per company

## Tasks

- [ ] Create `table_defs` table schema
- [ ] Add table relations to schema.ts
- [ ] Create Table API routes (CRUD)
- [ ] Create table list UI
- [ ] Create table creation modal
- [ ] Create table settings page
- [ ] Test table soft delete

## Implementation Log

### 2026-02-15
- Feature created
- Architecture designed
- Feature roadmap defined (14 features)
- Scope limited to table container only
