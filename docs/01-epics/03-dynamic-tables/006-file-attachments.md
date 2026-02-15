---
epic: Dynamic Tables
number: 6
status: pending
created: 2026-02-15
test_plan: "[[test-dynamic-tables-006-file-attachments]]"
tech_notes:
  - "[[dynamic-tables-006-file-storage]]"
epic_ref: "[[dynamic-tables]]"
related:
  - "[[001-basic-schema]]"
  - "[[003-field-types-validation]]"
  - "[[004-record-operations]]"
tags:
  - epic/dynamic-tables
  - status/pending
---

# 006: File Attachments

## Overview

Design the file attachment system for dynamic tables. Handles file uploads, storage, and association with records.

| Metadata | Value |
|----------|-------|
| **Epic** | Dynamic Tables |
| **Number** | 6 |
| **Status** | ⏳ Pending |

## Prerequisites

- ✅ [[001-basic-schema|001: Basic Schema]]
- ✅ [[003-field-types-validation|003: Field Types & Validation]] (file field types)
- ✅ [[004-record-operations|004: Record Operations]]

## Scope

### Included
- File metadata storage
- Upload URL generation (presigned URLs)
- File association with records
- File validation (type, size)
- Image thumbnails/previews
- File deletion/cleanup

### Not Included
- File content storage → Use S3/Blob storage
- Real-time upload progress → Future enhancement
- OCR/Extraction → Future feature

## Schema

### file_attachments

```typescript
export const fileAttachments = pgTable('file_attachments', {
  id: uuid('id').primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  
  // File metadata
  name: varchar('name', { length: 255 }).notNull(),
  originalName: varchar('original_name', { length: 255 }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  size: integer('size').notNull(),  // Bytes
  
  // Storage
  storageProvider: varchar('storage_provider', { length: 50 }).notNull().$type<'s3' | 'r2' | 'local'>(),
  storageKey: varchar('storage_key', { length: 500 }).notNull(),
  storageBucket: varchar('storage_bucket', { length: 255 }),
  
  // For images
  dimensions: jsonb('dimensions'),  // { width: number, height: number }
  thumbnails: jsonb('thumbnails'),  // { small: url, medium: url, large: url }
  
  // Association
  tableId: uuid('table_id').references(() => tableDefs.id, { onDelete: 'set null' }),
  recordId: uuid('record_id').references(() => tableRecords.id, { onDelete: 'set null' }),
  columnId: uuid('column_id').references(() => tableColumns.id, { onDelete: 'set null' }),
  
  // Timestamps
  uploadedBy: uuid('uploaded_by').notNull().references(() => users.id),
  uploadedAt: timestamp('uploaded_at', { withTimezone: true }).defaultNow().notNull(),
  
  // Access tracking
  lastAccessedAt: timestamp('last_accessed_at', { withTimezone: true }),
  downloadCount: integer('download_count').default(0).notNull(),
});
```

## API Structure

```typescript
// Upload flow
POST /api/files/upload-url        // Get presigned upload URL
{
  "filename": "document.pdf",
  "mimeType": "application/pdf",
  "size": 1024567
}
// Response
{
  "fileId": "...",
  "uploadUrl": "https://...",
  "fields": { ... }  // For S3 multipart
}

// After upload, associate with record
POST /api/tables/:tableId/records/:recordId/files
{
  "columnId": "...",
  "fileId": "..."
}

// Get file download URL
GET /api/files/:fileId/download   // Returns presigned download URL

// Delete file
DELETE /api/files/:fileId
```

## Tasks

- [ ] Create `file_attachments` table
- [ ] Implement upload URL generation
- [ ] Add file association to records
- [ ] Create file preview UI
- [ ] Add file validation

## Implementation Log

### 2026-02-15
- Feature created
- Storage architecture defined
