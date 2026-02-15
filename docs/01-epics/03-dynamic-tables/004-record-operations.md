---
epic: Dynamic Tables
number: 4
status: pending
created: 2026-02-15
test_plan: "[[test-dynamic-tables-004-record-operations]]"
tech_notes:
  - "[[dynamic-tables-004-record-storage]]"
  - "[[dynamic-tables-004-bulk-operations]]"
epic_ref: "[[dynamic-tables]]"
related:
  - "[[001-basic-schema]]"
  - "[[002-column-system]]"
  - "[[003-field-types-validation]]"
tags:
  - epic/dynamic-tables
  - status/pending
---

# 004: Record Operations

## Overview

Design the record storage and CRUD operations for dynamic tables. This feature handles creating, reading, updating, and deleting records with JSONB data storage.

| Metadata | Value |
|----------|-------|
| **Epic** | Dynamic Tables |
| **Number** | 4 |
| **Status** | ⏳ Pending |

## Prerequisites

- ✅ [[001-basic-schema|001: Basic Schema]]
- ✅ [[002-column-system|002: Column System]]
- ✅ [[003-field-types-validation|003: Field Types & Validation]]

## Scope

### Included
- Record storage schema (`table_records`)
- CRUD operations (create, read, update, delete)
- Bulk operations (batch create/update/delete)
- Data validation on write
- Display value enrichment
- Soft delete support
- Import/Export (CSV, JSON)
- Duplicate detection

### Not Included (Other Features)
- Querying/Filtering → [[005-querying-system|005: Querying System]]
- Revision history → Future feature
- File attachments → [[006-file-attachments|006: File Attachments]]
- Real-time sync → Collaboration epic

## Schema

### table_records

```typescript
export const tableRecords = pgTable('table_records', {
  id: uuid('id').primaryKey(),
  tableId: uuid('table_id').notNull().references(() => tableDefs.id, { onDelete: 'cascade' }),
  
  // Record data - keyed by column slug
  data: jsonb('data').default({}).notNull(),
  // {
  //   [columnSlug]: rawValue,
  //   _display: { [columnSlug]: displayValue }
  // }
  
  // Extended metadata
  metadata: jsonb('metadata').default({}).notNull(),
  // {
  //   source: 'ui' | 'import' | 'api' | 'automation' | 'form',
  //   importId: string,           // Reference to import batch
  //   importRow: number,          // Row number in import
  //   externalId: string,         // ID from external system
  //   duplicateOf: string,        // ID of duplicate record
  // }
  
  // Timestamps & authors
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedBy: uuid('updated_by').notNull().references(() => users.id),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  
  // Soft delete
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => [
  index('idx_records_table_id').on(table.tableId),
  index('idx_records_created_at').on(table.createdAt),
  index('idx_records_deleted_at').on(table.deletedAt),
  // GIN index for JSONB queries
  index('idx_records_data_gin').on(table.data).using('gin'),
  // Index for external ID lookups
  index('idx_records_external_id').on(sql`((metadata->>'externalId'))`),
]);
```

### Relations

```typescript
export const tableRecordsRelations = relations(tableRecords, ({ one }) => ({
  table: one(tableDefs, {
    fields: [tableRecords.tableId],
    references: [tableDefs.id],
  }),
  createdByUser: one(users, {
    fields: [tableRecords.createdBy],
    references: [users.id],
  }),
  updatedByUser: one(users, {
    fields: [tableRecords.updatedBy],
    references: [users.id],
  }),
}));
```

## Data Structure

### Record Data Format

```typescript
// Raw record data (stored in JSONB)
interface RecordData {
  // Column values keyed by slug
  [columnSlug: string]: any;
  
  // Computed display values (for performance)
  _display?: {
    [columnSlug: string]: string;
  };
}

// Example
{
  // User-entered data
  "title": "Project Alpha",
  "status": "opt-123-abc",
  "priority": ["opt-456-def", "opt-789-ghi"],
  "budget": 15000.00,
  "startDate": "2026-03-01",
  "lead": "usr-789-ghi",
  "client": "rec-333-jkl",
  "completed": false,
  
  // Computed display values
  "_display": {
    "status": "In Progress",
    "priority": "High, Urgent",
    "lead": "John Doe",
    "client": "Acme Corp"
  }
}
```

## CRUD Operations

### Create Record

```typescript
async function createRecord(
  tableId: string,
  data: Record<string, any>,
  userId: string,
  options?: { source?: string; externalId?: string }
): Promise<TableRecord> {
  // 1. Get table columns
  const columns = await getColumns(tableId);
  
  // 2. Validate all fields
  const validationResults = await Promise.all(
    columns.map(async (col) => {
      const value = data[col.slug];
      const result = await validateFieldValue(value, col, {
        columnId: col.id,
        tableId,
        userId,
        isCreate: true,
      });
      return { column: col, result };
    })
  );
  
  const errors = validationResults.filter(r => !r.result.valid);
  if (errors.length > 0) {
    throw new ValidationError(errors);
  }
  
  // 3. Apply default values for missing fields
  const completeData: Record<string, any> = {};
  for (const col of columns) {
    if (data[col.slug] !== undefined) {
      completeData[col.slug] = data[col.slug];
    } else if (col.defaultValue !== undefined) {
      completeData[col.slug] = col.defaultValue;
    }
  }
  
  // 4. Generate auto-number fields
  for (const col of columns) {
    const fieldType = getFieldType(col.fieldType);
    if (fieldType.id === 'autoNumber') {
      completeData[col.slug] = await fieldType.generate(tableId, col.config);
    }
  }
  
  // 5. Enrich with display values
  const enrichedData = await enrichDisplayValues(completeData, columns);
  
  // 6. Insert record
  const [record] = await db.insert(tableRecords).values({
    id: uuidv7(),
    tableId,
    data: enrichedData,
    metadata: {
      source: options?.source || 'ui',
      externalId: options?.externalId,
    },
    createdBy: userId,
    updatedBy: userId,
  }).returning();
  
  return record;
}
```

### Get Record

```typescript
async function getRecord(
  recordId: string,
  options?: { includeDisplay?: boolean }
): Promise<TableRecord | null> {
  const record = await db.query.tableRecords.findFirst({
    where: and(
      eq(tableRecords.id, recordId),
      isNull(tableRecords.deletedAt)
    ),
    with: {
      createdByUser: true,
      updatedByUser: true,
    }
  });
  
  if (!record) return null;
  
  // Refresh display values if requested
  if (options?.includeDisplay) {
    const columns = await getColumns(record.tableId);
    record.data = await enrichDisplayValues(record.data, columns);
  }
  
  return record;
}
```

### Update Record

```typescript
async function updateRecord(
  recordId: string,
  data: Record<string, any>,
  userId: string,
  options?: { partial?: boolean; source?: string }
): Promise<TableRecord> {
  // 1. Get existing record
  const existing = await getRecord(recordId);
  if (!existing) throw new NotFoundError('Record not found');
  
  // 2. Get columns
  const columns = await getColumns(existing.tableId);
  const columnsToUpdate = options?.partial 
    ? columns.filter(c => data[c.slug] !== undefined)
    : columns;
  
  // 3. Validate updated fields
  for (const col of columnsToUpdate) {
    const value = data[col.slug];
    const result = await validateFieldValue(value, col, {
      columnId: col.id,
      tableId: existing.tableId,
      userId,
      isCreate: false,
    });
    if (!result.valid) {
      throw new ValidationError([{ column: col.slug, error: result.error }]);
    }
  }
  
  // 4. Merge data
  const newData = options?.partial
    ? { ...existing.data, ...data }
    : data;
  
  // 5. Enrich display values
  const enrichedData = await enrichDisplayValues(newData, columns);
  
  // 6. Update record
  const [record] = await db.update(tableRecords)
    .set({
      data: enrichedData,
      updatedBy: userId,
      updatedAt: new Date(),
    })
    .where(eq(tableRecords.id, recordId))
    .returning();
  
  return record;
}
```

### Delete Record (Soft Delete)

```typescript
async function deleteRecord(
  recordId: string,
  userId: string,
  options?: { permanent?: boolean }
): Promise<void> {
  if (options?.permanent) {
    // Hard delete (admin only)
    await db.delete(tableRecords).where(eq(tableRecords.id, recordId));
  } else {
    // Soft delete
    await db.update(tableRecords)
      .set({ deletedAt: new Date() })
      .where(eq(tableRecords.id, recordId));
  }
}
```

## Bulk Operations

### Bulk Create

```typescript
async function bulkCreateRecords(
  tableId: string,
  records: Record<string, any>[],
  userId: string,
  options?: { continueOnError?: boolean }
): Promise<BulkResult> {
  const columns = await getColumns(tableId);
  const results: BulkResult = { created: [], errors: [] };
  
  await db.transaction(async (tx) => {
    for (let i = 0; i < records.length; i++) {
      try {
        const record = await createRecordInTx(tx, tableId, records[i], userId, columns);
        results.created.push({ index: i, record });
      } catch (error) {
        results.errors.push({ index: i, error: error.message });
        if (!options?.continueOnError) {
          throw error; // Rollback transaction
        }
      }
    }
  });
  
  return results;
}
```

### Bulk Update

```typescript
async function bulkUpdateRecords(
  updates: { recordId: string; data: Record<string, any> }[],
  userId: string
): Promise<BulkResult> {
  const results: BulkResult = { updated: [], errors: [] };
  
  await db.transaction(async (tx) => {
    for (let i = 0; i < updates.length; i++) {
      try {
        const record = await updateRecordInTx(tx, updates[i].recordId, updates[i].data, userId);
        results.updated.push({ index: i, record });
      } catch (error) {
        results.errors.push({ index: i, error: error.message });
      }
    }
  });
  
  return results;
}
```

### Bulk Delete

```typescript
async function bulkDeleteRecords(
  recordIds: string[],
  userId: string
): Promise<BulkResult> {
  const results: BulkResult = { deleted: [], errors: [] };
  
  await db.transaction(async (tx) => {
    for (const id of recordIds) {
      try {
        await deleteRecordInTx(tx, id, userId);
        results.deleted.push(id);
      } catch (error) {
        results.errors.push({ id, error: error.message });
      }
    }
  });
  
  return results;
}
```

## Import/Export

### CSV Import

```typescript
// POST /api/tables/:tableId/import/csv
async function importCSV(
  tableId: string,
  file: File,
  mapping: Record<string, string>,  // CSV column -> Table column slug
  options: {
    skipFirstRow: boolean;          // Header row
    updateExisting: boolean;        // Update by external ID
    externalIdColumn?: string;      // Which CSV column is external ID
    continueOnError: boolean;
  },
  userId: string
): Promise<ImportResult> {
  const rows = await parseCSV(file);
  const records: Record<string, any>[] = [];
  
  for (let i = options.skipFirstRow ? 1 : 0; i < rows.length; i++) {
    const record: Record<string, any> = {};
    for (const [csvCol, tableCol] of Object.entries(mapping)) {
      record[tableCol] = rows[i][csvCol];
    }
    
    if (options.updateExisting && options.externalIdColumn) {
      // Check for existing record
      const externalId = rows[i][options.externalIdColumn];
      const existing = await findByExternalId(tableId, externalId);
      if (existing) {
        await updateRecord(existing.id, record, userId);
        continue;
      }
    }
    
    records.push(record);
  }
  
  return bulkCreateRecords(tableId, records, userId, options);
}
```

### CSV Export

```typescript
// GET /api/tables/:tableId/export/csv?columns=col1,col2,col3
async function exportCSV(
  tableId: string,
  columnSlugs: string[],
  options?: { filters?: Filter[] }
): Promise<string> {
  const columns = await getColumns(tableId);
  const selectedColumns = columns.filter(c => columnSlugs.includes(c.slug));
  
  // Get records (using query system)
  const records = await queryRecords(tableId, { filters: options?.filters });
  
  // Build CSV
  const headers = selectedColumns.map(c => c.name);
  const rows = records.map(r => 
    selectedColumns.map(c => formatForCSV(r.data[c.slug], c))
  );
  
  return generateCSV([headers, ...rows]);
}
```

### JSON Export/Import

```typescript
// Export full table data
async function exportJSON(tableId: string): Promise<TableExport> {
  const table = await getTable(tableId);
  const columns = await getColumns(tableId);
  const records = await getAllRecords(tableId);
  
  return {
    version: '1.0',
    table: {
      name: table.name,
      settings: table.settings,
    },
    columns: columns.map(c => ({
      name: c.name,
      slug: c.slug,
      fieldType: c.fieldType,
      config: c.config,
      validation: c.validation,
      defaultValue: c.defaultValue,
    })),
    records: records.map(r => ({
      id: r.id,
      data: r.data,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })),
  };
}

// Import full table data
async function importJSON(
  companyId: string,
  exportData: TableExport,
  userId: string
): Promise<Table> {
  // Create table
  const table = await createTable({
    companyId,
    name: exportData.table.name,
    settings: exportData.table.settings,
  }, userId);
  
  // Create columns
  for (const col of exportData.columns) {
    await createColumn(table.id, col, userId);
  }
  
  // Create records
  await bulkCreateRecords(
    table.id,
    exportData.records.map(r => r.data),
    userId
  );
  
  return table;
}
```

## Duplicate Detection

```typescript
async function detectDuplicates(
  tableId: string,
  options: {
    columnSlugs: string[];          // Check these columns
    similarity?: number;            // For text fields (0-1)
    caseSensitive?: boolean;
  }
): Promise<DuplicateGroup[]> {
  const records = await getAllRecords(tableId);
  const groups: DuplicateGroup[] = [];
  
  for (let i = 0; i < records.length; i++) {
    for (let j = i + 1; j < records.length; j++) {
      if (areRecordsDuplicate(records[i], records[j], options)) {
        // Add to or create group
        addToGroup(groups, [records[i], records[j]]);
      }
    }
  }
  
  return groups;
}

function areRecordsDuplicate(
  a: TableRecord,
  b: TableRecord,
  options: DetectOptions
): boolean {
  for (const slug of options.columnSlugs) {
    const valA = a.data[slug];
    const valB = b.data[slug];
    
    if (!valuesMatch(valA, valB, options)) {
      return false;
    }
  }
  return true;
}
```

## API Structure

```typescript
// Record CRUD
POST   /api/tables/:tableId/records                    // Create
GET    /api/tables/:tableId/records/:recordId          // Get
PATCH  /api/tables/:tableId/records/:recordId          // Update
DELETE /api/tables/:tableId/records/:recordId          // Soft delete

// Bulk operations
POST   /api/tables/:tableId/records/bulk               // Bulk create
PATCH  /api/tables/:tableId/records/bulk               // Bulk update
DELETE /api/tables/:tableId/records/bulk               // Bulk delete

// Import/Export
POST   /api/tables/:tableId/import/csv                 // Import CSV
GET    /api/tables/:tableId/export/csv                 // Export CSV
GET    /api/tables/:tableId/export/json                // Export JSON
POST   /api/tables/:tableId/import/json                // Import JSON

// Duplicates
POST   /api/tables/:tableId/duplicates/find            // Find duplicates
POST   /api/tables/:tableId/duplicates/merge           // Merge duplicates
```

## Tasks

- [ ] Create `table_records` table schema
- [ ] Add record relations to schema.ts
- [ ] Implement create record API
- [ ] Implement get/update/delete record APIs
- [ ] Implement bulk operations
- [ ] Create CSV import functionality
- [ ] Create CSV export functionality
- [ ] Create JSON import/export
- [ ] Implement duplicate detection
- [ ] Build record form UI
- [ ] Build record detail view
- [ ] Build bulk actions UI
- [ ] Create import wizard

## Implementation Log

### 2026-02-15
- Feature created
- Record storage schema defined
- CRUD operations designed
- Import/export functionality planned
