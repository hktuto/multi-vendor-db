---
epic: Dynamic Tables
number: 2
status: pending
created: 2026-02-15
test_plan: "[[test-dynamic-tables-002-column-system]]"
tech_notes:
  - "[[dynamic-tables-002-column-architecture]]"
epic_ref: "[[dynamic-tables]]"
related:
  - "[[001-basic-schema]]"
tags:
  - epic/dynamic-tables
  - status/pending
---

# 002: Column System

## Overview

Design the column definition system that defines the structure of each table. This feature focuses on the column container and metadata, while field types are handled separately.

| Metadata | Value |
|----------|-------|
| **Epic** | Dynamic Tables |
| **Number** | 2 |
| **Status** | ⏳ Pending |

## Prerequisites

- ✅ [[001-basic-schema|001: Basic Schema]] (table_defs)

## Scope

### Included
- Column definition structure (`table_columns`)
- Column metadata (name, description, order)
- Column visibility and display settings
- Reference to field type (by slug, not definition)
- Soft delete support
- Column reordering

### Not Included (Other Features)
- Field type definitions → [[003-field-types-validation|003: Field Types & Validation]]
- Field validation rules → [[003-field-types-validation|003: Field Types & Validation]]
- Select options → [[003-field-types-validation|003: Field Types & Validation]]
- Default values → [[003-field-types-validation|003: Field Types & Validation]]

## Schema

### table_columns

```typescript
export const tableColumns = pgTable('table_columns', {
  id: uuid('id').primaryKey(),
  tableId: uuid('table_id').notNull().references(() => tableDefs.id, { onDelete: 'cascade' }),
  
  // Column metadata
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull(),
  description: text('description'),
  
  // Field type reference (see 003 for field type definitions)
  fieldType: varchar('field_type', { length: 50 }).notNull(),
  // Supported types (defined in 003):
  // text, longText, number, currency, percent, date, dateTime, time,
  // duration, select, multiSelect, boolean, user, users, relation,
  // lookup, rollup, file, files, email, url, phone, rating,
  // autoNumber, barcode, createdTime, updatedTime, createdBy, updatedBy
  
  // Field configuration (type-specific, validated against field type schema)
  config: jsonb('config').default({}).notNull(),
  // Structure validated by field type definition (003)
  // Examples:
  // { minLength: 10, maxLength: 100 }        // text
  // { precision: 2, min: 0, max: 1000000 }   // currency
  // { relatedTableId: "...", relationType: "oneToMany" } // relation
  
  // Validation rules (structure defined in 003)
  validation: jsonb('validation').default({}).notNull(),
  // { required: true, unique: false, customErrorMessage: "..." }
  
  // Default value (type-specific)
  defaultValue: jsonb('default_value'),
  
  // Display configuration
  orderIndex: integer('order_index').default(0).notNull(),
  width: integer('width'),                    // Column width in pixels
  isVisible: boolean('is_visible').default(true).notNull(),
  isPrimary: boolean('is_primary').default(false).notNull(), // Display field
  isReadOnly: boolean('is_read_only').default(false).notNull(),
  
  // Soft delete
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique('unique_column_slug_per_table').on(table.tableId, table.slug),
  index('idx_columns_table_id').on(table.tableId),
  index('idx_columns_deleted_at').on(table.deletedAt),
]);
```

### Relations

```typescript
export const tableColumnsRelations = relations(tableColumns, ({ one }) => ({
  table: one(tableDefs, {
    fields: [tableColumns.tableId],
    references: [tableDefs.id],
  }),
  // Future relations:
  // options: many(columnOptions),        → 003
  // relatedTable: one(tableDefs),        → 003 (relation fields)
}));
```

## Column Configuration Structure

The `config` JSONB follows a schema defined by each field type:

```typescript
// Field type config schema (defined in 003)
interface FieldTypeConfig {
  // Common to most types
  placeholder?: string;
  helpText?: string;
  
  // Type-specific (examples)
  // Text
  minLength?: number;
  maxLength?: number;
  regex?: string;
  
  // Number/Currency
  min?: number;
  max?: number;
  precision?: number;      // Decimal places
  currencyCode?: string;   // 'USD', 'EUR'
  
  // Select
  optionsSource?: 'static' | 'dynamic';
  
  // Relation
  relatedTableId?: string;
  relationType?: 'oneToOne' | 'oneToMany' | 'manyToMany';
  
  // ... etc (full list in 003)
}
```

## API Structure

```typescript
// Column CRUD
POST   /api/tables/:tableId/columns              // Create column
GET    /api/tables/:tableId/columns              // List columns
GET    /api/tables/:tableId/columns/:id          // Get column
PATCH  /api/tables/:tableId/columns/:id          // Update column
DELETE /api/tables/:tableId/columns/:id          // Soft delete column

// Column reordering
POST   /api/tables/:tableId/columns/reorder      // Reorder columns
{
  "columnIds": ["col-1", "col-2", "col-3"]
}

// Get table with columns
GET    /api/tables/:id?include=columns           // Include columns in response
```

## Key Concepts

### 1. Column vs Field Type
- **Column**: The instance (this table has a "Status" column)
- **Field Type**: The definition (what "select" fields behave like)

### 2. Slug-Based Identification
- Columns use slugs for record data keys
- Slug is immutable after creation (to preserve data integrity)
- Changing name is allowed, slug stays the same

### 3. Order Index
- Zero-based ordering
- Reordering updates all affected columns' indices
- Gaps are allowed (for easier reordering)

### 4. Primary Column
- One column per table can be `isPrimary: true`
- Used as the record display name
- Usually a text or autoNumber field

## Design Decisions

### Why Separate Column and Field Type?
1. **Single source of truth**: Field type logic in one place
2. **Easy to add new types**: Without changing column structure
3. **Validation reuse**: Same validation across all tables
4. **Migration safety**: Change field type behavior without schema changes

### JSONB for Config
- Flexible per-type configuration
- Validated against field type schema
- Easy to extend with new options

## Tasks

- [ ] Create `table_columns` table schema
- [ ] Add column relations to schema.ts
- [ ] Create Column API routes (CRUD)
- [ ] Create column reordering API
- [ ] Build column management UI
- [ ] Add column drag-and-drop reordering
- [ ] Test column soft delete

## Implementation Log

### 2026-02-15
- Feature created
- Column structure defined
- Separation from field types established
