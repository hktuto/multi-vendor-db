---
epic: Dynamic Tables
number: 3
status: pending
created: 2026-02-15
test_plan: "[[test-dynamic-tables-003-field-types]]"
tech_notes:
  - "[[dynamic-tables-003-field-type-registry]]"
  - "[[dynamic-tables-003-validation-engine]]"
epic_ref: "[[dynamic-tables]]"
related:
  - "[[002-column-system]]"
tags:
  - epic/dynamic-tables
  - status/pending
---

# 003: Field Types & Validation

## Overview

Define all field types, their configurations, validation rules, and storage formats. This is the core type system that determines how data is stored, validated, and displayed.

| Metadata | Value |
|----------|-------|
| **Epic** | Dynamic Tables |
| **Number** | 3 |
| **Status** | ⏳ Pending |

## Prerequisites

- ✅ [[001-basic-schema|001: Basic Schema]]
- ✅ [[002-column-system|002: Column System]]

## Scope

### Included
- Field type definitions (24 types)
- Configuration schemas for each type
- Validation rules and validators
- Select/multi-select options storage
- Default value handling
- Display value formatting

### Field Types Breakdown

| Category | Types |
|----------|-------|
| **Basic** | text, longText, number, boolean |
| **Date/Time** | date, dateTime, time, duration |
| **Numeric** | currency, percent, rating, autoNumber |
| **Choice** | select, multiSelect |
| **Reference** | user, users, relation |
| **Computed** | lookup, rollup, createdTime, updatedTime, createdBy, updatedBy |
| **Media** | file, files |
| **Contact** | email, url, phone |
| **Other** | barcode, button |

### Not Included (Other Features)
- Column container → [[002-column-system|002: Column System]]
- Record CRUD → [[004-record-operations|004: Record Operations]]
- File storage → [[006-file-attachments|006: File Attachments]]

## Schema

### column_options

For select and multi-select fields.

```typescript
export const columnOptions = pgTable('column_options', {
  id: uuid('id').primaryKey(),
  columnId: uuid('column_id').notNull().references(() => tableColumns.id, { onDelete: 'cascade' }),
  
  name: varchar('name', { length: 255 }).notNull(),
  color: varchar('color', { length: 7 }),     // Hex color
  icon: varchar('icon', { length: 50 }),
  orderIndex: integer('order_index').default(0).notNull(),
  
  // Soft delete (for history preservation)
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_options_column_id').on(table.columnId),
]);
```

## Field Type Definitions

### Type Registry

```typescript
// Field type metadata
interface FieldTypeDefinition {
  id: string;                    // 'text', 'number', etc.
  name: string;                  // Display name
  category: string;              // 'basic', 'date', 'numeric', etc.
  icon: string;                  // Lucide icon name
  description: string;
  
  // Storage
  dataType: 'string' | 'number' | 'boolean' | 'array' | 'object';
  storageFormat: string;         // How stored in JSONB
  
  // Configuration
  configSchema: JSONSchema;      // Validation for column.config
  defaultConfig: Record<string, any>;
  
  // Validation
  validationSchema: JSONSchema;  // Validation for column.validation
  defaultValidation: Record<string, any>;
  
  // Value validation
  validate: (value: any, config: any) => ValidationResult;
  
  // Display
  formatDisplay: (value: any, config: any) => string;
  formatExport: (value: any, config: any) => string;
  
  // Special flags
  isComputed: boolean;           // Auto-populated (createdTime, etc.)
  supportsDefault: boolean;      // Can have default value
  supportsUnique: boolean;       // Can enforce uniqueness
  
  // Relations
  requiresOptions: boolean;      // Needs column_options (select)
  supportsRelation: boolean;     // Can reference other tables
}
```

### Field Type Catalog

#### 1. text - Single Line Text
```typescript
{
  id: 'text',
  name: 'Single Line Text',
  category: 'basic',
  dataType: 'string',
  
  configSchema: {
    minLength: { type: 'number', min: 0 },
    maxLength: { type: 'number', max: 10000 },
    regex: { type: 'string' },           // Validation pattern
    placeholder: { type: 'string' },
  },
  
  defaultConfig: {
    maxLength: 255,
  },
  
  validate: (v, c) => ({
    valid: typeof v === 'string' && 
           v.length >= (c.minLength || 0) &&
           v.length <= (c.maxLength || 255) &&
           (c.regex ? new RegExp(c.regex).test(v) : true),
    error: 'Invalid text value',
  }),
}
```

#### 2. longText - Long Text
```typescript
{
  id: 'longText',
  name: 'Long Text',
  category: 'basic',
  dataType: 'string',
  
  configSchema: {
    minLength: { type: 'number', min: 0 },
    maxLength: { type: 'number', max: 100000 },
    richText: { type: 'boolean' },       // Enable formatting
  },
  
  defaultConfig: {
    maxLength: 10000,
    richText: false,
  },
}
```

#### 3. number - Number
```typescript
{
  id: 'number',
  name: 'Number',
  category: 'numeric',
  dataType: 'number',
  
  configSchema: {
    min: { type: 'number' },
    max: { type: 'number' },
    precision: { type: 'number', min: 0, max: 10 },  // Decimal places
    format: { type: 'string', enum: ['decimal', 'integer'] },
  },
  
  defaultConfig: {
    precision: 0,
    format: 'integer',
  },
  
  validate: (v, c) => ({
    valid: typeof v === 'number' && 
           !isNaN(v) &&
           (c.min !== undefined ? v >= c.min : true) &&
           (c.max !== undefined ? v <= c.max : true),
    error: 'Invalid number',
  }),
}
```

#### 4. currency - Currency
```typescript
{
  id: 'currency',
  name: 'Currency',
  category: 'numeric',
  dataType: 'number',
  
  configSchema: {
    currencyCode: { 
      type: 'string', 
      enum: ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'HKD'] 
    },
    min: { type: 'number' },
    max: { type: 'number' },
  },
  
  defaultConfig: {
    currencyCode: 'USD',
  },
  
  formatDisplay: (v, c) => {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency: c.currencyCode || 'USD',
    }).format(v);
  },
}
```

#### 5. percent - Percentage
```typescript
{
  id: 'percent',
  name: 'Percentage',
  category: 'numeric',
  dataType: 'number',
  
  configSchema: {
    min: { type: 'number', min: 0, max: 100 },
    max: { type: 'number', min: 0, max: 100 },
    decimalPlaces: { type: 'number', min: 0, max: 4 },
  },
  
  defaultConfig: {
    min: 0,
    max: 100,
    decimalPlaces: 0,
  },
  
  formatDisplay: (v, c) => `${v}%`,
}
```

#### 6. date - Date
```typescript
{
  id: 'date',
  name: 'Date',
  category: 'date',
  dataType: 'string',  // ISO date string: '2026-03-15'
  
  configSchema: {
    minDate: { type: 'string' },    // 'today', 'specific', 'field'
    maxDate: { type: 'string' },
    dateFormat: { 
      type: 'string', 
      enum: ['YYYY-MM-DD', 'MM/DD/YYYY', 'DD/MM/YYYY'] 
    },
  },
  
  defaultConfig: {
    dateFormat: 'YYYY-MM-DD',
  },
  
  validate: (v, c) => ({
    valid: /^\d{4}-\d{2}-\d{2}$/.test(v),
    error: 'Invalid date format',
  }),
}
```

#### 7. dateTime - Date & Time
```typescript
{
  id: 'dateTime',
  name: 'Date & Time',
  category: 'date',
  dataType: 'string',  // ISO datetime: '2026-03-15T14:30:00Z'
  
  configSchema: {
    includeSeconds: { type: 'boolean' },
    use24Hour: { type: 'boolean' },
  },
  
  defaultConfig: {
    includeSeconds: false,
    use24Hour: true,
  },
}
```

#### 8. time - Time Only
```typescript
{
  id: 'time',
  name: 'Time',
  category: 'date',
  dataType: 'string',  // '14:30:00' or '14:30'
  
  configSchema: {
    includeSeconds: { type: 'boolean' },
    use24Hour: { type: 'boolean' },
  },
}
```

#### 9. duration - Duration
```typescript
{
  id: 'duration',
  name: 'Duration',
  category: 'date',
  dataType: 'number',  // Seconds
  
  configSchema: {
    format: { type: 'string', enum: ['h:mm', 'h:mm:ss', 'minutes', 'hours'] },
  },
  
  defaultConfig: {
    format: 'h:mm',
  },
  
  formatDisplay: (v, c) => {
    const hours = Math.floor(v / 3600);
    const mins = Math.floor((v % 3600) / 60);
    return `${hours}:${mins.toString().padStart(2, '0')}`;
  },
}
```

#### 10. select - Single Select
```typescript
{
  id: 'select',
  name: 'Single Select',
  category: 'choice',
  dataType: 'string',  // Option ID
  
  configSchema: {
    allowOther: { type: 'boolean' },     // Allow custom values
  },
  
  requiresOptions: true,
  
  validate: async (v, c, context) => {
    // Validate against column_options
    const validOptions = await getOptions(context.columnId);
    return {
      valid: validOptions.some(o => o.id === v) || (c.allowOther && v),
      error: 'Invalid option',
    };
  },
}
```

#### 11. multiSelect - Multiple Select
```typescript
{
  id: 'multiSelect',
  name: 'Multiple Select',
  category: 'choice',
  dataType: 'array',   // Array of option IDs
  
  configSchema: {
    maxItems: { type: 'number', min: 1 },
    allowOther: { type: 'boolean' },
  },
  
  requiresOptions: true,
  
  validate: (v, c) => ({
    valid: Array.isArray(v) && 
           (c.maxItems ? v.length <= c.maxItems : true),
    error: 'Invalid selection',
  }),
}
```

#### 12. boolean - Checkbox
```typescript
{
  id: 'boolean',
  name: 'Checkbox',
  category: 'basic',
  dataType: 'boolean',
  
  configSchema: {
    style: { type: 'string', enum: ['checkbox', 'toggle'] },
    label: { type: 'string' },           // Label next to checkbox
  },
  
  defaultConfig: {
    style: 'checkbox',
  },
}
```

#### 13. user - User
```typescript
{
  id: 'user',
  name: 'User',
  category: 'reference',
  dataType: 'string',  // User ID
  
  configSchema: {
    restrictToCompany: { type: 'boolean' },
    restrictToGroup: { type: 'string' },   // Group ID
  },
  
  validate: async (v, c, context) => {
    // Validate user exists and has access
    const user = await getUser(v);
    return {
      valid: !!user && await canAccessUser(user, context),
      error: 'Invalid user',
    };
  },
}
```

#### 14. users - Multiple Users
```typescript
{
  id: 'users',
  name: 'Multiple Users',
  category: 'reference',
  dataType: 'array',   // Array of user IDs
  
  configSchema: {
    restrictToCompany: { type: 'boolean' },
    maxUsers: { type: 'number', min: 1 },
  },
}
```

#### 15. relation - Relation to Another Table
```typescript
{
  id: 'relation',
  name: 'Relation',
  category: 'reference',
  dataType: 'string',  // Record ID from related table
  
  configSchema: {
    relatedTableId: { type: 'string' },   // Required
    relationType: { 
      type: 'string', 
      enum: ['oneToOne', 'oneToMany', 'manyToMany'] 
    },
    allowMultiple: { type: 'boolean' },   // For oneToMany/manyToMany
  },
  
  supportsRelation: true,
  
  validate: async (v, c, context) => {
    const record = await getRecord(v, c.relatedTableId);
    return {
      valid: !!record && record.tableId === c.relatedTableId,
      error: 'Invalid relation',
    };
  },
}
```

#### 16-17. lookup / rollup - Computed from Relations
```typescript
{
  id: 'lookup',
  name: 'Lookup',
  category: 'computed',
  dataType: 'any',
  isComputed: true,
  supportsDefault: false,
  
  configSchema: {
    relationFieldId: { type: 'string' },  // Which relation to traverse
    lookupFieldId: { type: 'string' },    // Which field to fetch
  },
  
  // Value computed at read time
  compute: async (record, config) => {
    const related = await getRelatedRecord(record, config.relationFieldId);
    return related?.data[config.lookupFieldId];
  },
}

{
  id: 'rollup',
  name: 'Rollup',
  category: 'computed',
  dataType: 'any',
  isComputed: true,
  
  configSchema: {
    relationFieldId: { type: 'string' },
    rollupFieldId: { type: 'string' },    // Field to aggregate
    function: { 
      type: 'string', 
      enum: ['count', 'sum', 'avg', 'min', 'max', 'concat'] 
    },
  },
  
  compute: async (record, config) => {
    const related = await getRelatedRecords(record, config.relationFieldId);
    const values = related.map(r => r.data[config.rollupFieldId]);
    return applyRollupFunction(values, config.function);
  },
}
```

#### 18-19. file / files - File Attachments
```typescript
{
  id: 'file',
  name: 'File',
  category: 'media',
  dataType: 'string',  // File ID
  
  configSchema: {
    maxSize: { type: 'number' },          // Bytes
    allowedTypes: { type: 'array' },      // ['image/*', 'pdf']
  },
}

{
  id: 'files',
  name: 'Multiple Files',
  category: 'media',
  dataType: 'array',   // Array of file IDs
  
  configSchema: {
    maxFiles: { type: 'number', min: 1 },
    maxSize: { type: 'number' },
    allowedTypes: { type: 'array' },
  },
}
```

#### 20-22. email / url / phone
```typescript
{
  id: 'email',
  name: 'Email',
  category: 'contact',
  dataType: 'string',
  
  validate: (v) => ({
    valid: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    error: 'Invalid email',
  }),
}

{
  id: 'url',
  name: 'URL',
  category: 'contact',
  dataType: 'string',
  
  validate: (v) => ({
    valid: /^https?:\/\/.+/.test(v),
    error: 'Invalid URL',
  }),
}

{
  id: 'phone',
  name: 'Phone',
  category: 'contact',
  dataType: 'string',
  
  configSchema: {
    format: { type: 'string', enum: ['e164', 'national', 'international'] },
    defaultCountry: { type: 'string' },   // 'US', 'UK', etc.
  },
}
```

#### 23. rating - Star Rating
```typescript
{
  id: 'rating',
  name: 'Rating',
  category: 'numeric',
  dataType: 'number',
  
  configSchema: {
    maxStars: { type: 'number', enum: [5, 10] },
    allowHalf: { type: 'boolean' },
  },
  
  defaultConfig: {
    maxStars: 5,
    allowHalf: false,
  },
  
  validate: (v, c) => ({
    valid: v >= 0 && v <= c.maxStars && 
           (c.allowHalf ? v % 0.5 === 0 : Number.isInteger(v)),
    error: 'Invalid rating',
  }),
}
```

#### 24. autoNumber - Auto-Incrementing Number
```typescript
{
  id: 'autoNumber',
  name: 'Auto Number',
  category: 'numeric',
  dataType: 'string',  // Formatted string like "PROJ-0001"
  
  configSchema: {
    prefix: { type: 'string' },
    suffix: { type: 'string' },
    startNumber: { type: 'number', min: 0 },
    digits: { type: 'number', min: 1, max: 10 },
  },
  
  defaultConfig: {
    startNumber: 1,
    digits: 4,
  },
  
  isComputed: true,
  supportsDefault: false,
  
  // Generated on record create
  generate: async (tableId, config) => {
    const count = await getRecordCount(tableId);
    const num = config.startNumber + count;
    const padded = num.toString().padStart(config.digits || 4, '0');
    return `${config.prefix || ''}${padded}${config.suffix || ''}`;
  },
}
```

#### 25-28. System Fields (Auto-Populated)
```typescript
{
  id: 'createdTime',
  name: 'Created Time',
  category: 'computed',
  dataType: 'string',  // ISO timestamp
  isComputed: true,
  supportsDefault: false,
  // Auto-set on record creation
}

{
  id: 'updatedTime',
  name: 'Updated Time',
  category: 'computed',
  dataType: 'string',
  isComputed: true,
  supportsDefault: false,
  // Auto-set on any record update
}

{
  id: 'createdBy',
  name: 'Created By',
  category: 'computed',
  dataType: 'string',  // User ID
  isComputed: true,
  supportsDefault: false,
}

{
  id: 'updatedBy',
  name: 'Updated By',
  category: 'computed',
  dataType: 'string',
  isComputed: true,
  supportsDefault: false,
}
```

#### 29. barcode - Barcode/QR
```typescript
{
  id: 'barcode',
  name: 'Barcode',
  category: 'other',
  dataType: 'string',
  
  configSchema: {
    format: { 
      type: 'string', 
      enum: ['code128', 'qr', 'ean13', 'upc'] 
    },
  },
}
```

#### 30. button - Action Button
```typescript
{
  id: 'button',
  name: 'Button',
  category: 'other',
  dataType: 'null',    // No stored value
  
  configSchema: {
    label: { type: 'string' },
    action: { 
      type: 'string', 
      enum: ['webhook', 'automation', 'url'] 
    },
    actionConfig: { type: 'object' },
  },
  
  supportsDefault: false,
}
```

## Validation Engine

### Validation Flow

```typescript
interface ValidationContext {
  columnId: string;
  tableId: string;
  companyId: string;
  userId: string;
  isCreate: boolean;
}

async function validateFieldValue(
  value: any,
  column: TableColumn,
  context: ValidationContext
): Promise<ValidationResult> {
  const fieldType = getFieldType(column.fieldType);
  
  // 1. Required check
  if (column.validation.required && (value === null || value === undefined || value === '')) {
    return { valid: false, error: column.validation.customErrorMessage || 'Required' };
  }
  
  // 2. Skip if empty and not required
  if (!value && !column.validation.required) {
    return { valid: true };
  }
  
  // 3. Type-specific validation
  const typeValidation = await fieldType.validate(value, column.config, context);
  if (!typeValidation.valid) {
    return typeValidation;
  }
  
  // 4. Unique check (if applicable)
  if (column.validation.unique && fieldType.supportsUnique) {
    const exists = await checkUnique(value, column, context);
    if (exists) {
      return { valid: false, error: 'Value must be unique' };
    }
  }
  
  return { valid: true };
}
```

## API Structure

```typescript
// Field Types
GET    /api/field-types                    // List all field types
GET    /api/field-types/:id                // Get field type details
GET    /api/field-types/:id/config-schema  // Get config JSON schema

// Column Options (for select fields)
POST   /api/columns/:columnId/options      // Create option
GET    /api/columns/:columnId/options      // List options
PATCH  /api/columns/:columnId/options/:id  // Update option
DELETE /api/columns/:columnId/options/:id  // Delete option
POST   /api/columns/:columnId/options/reorder // Reorder options

// Validation
POST   /api/columns/:columnId/validate     // Validate a value
{
  "value": "test value"
}
```

## Tasks

- [ ] Create `column_options` table schema
- [ ] Define all 30 field type definitions
- [ ] Create field type registry system
- [ ] Implement validation engine
- [ ] Create display formatters for each type
- [ ] Build field type selector UI
- [ ] Build column configuration forms
- [ ] Create option management UI
- [ ] Test all field types

## Implementation Log

### 2026-02-15
- Feature created
- 30 field types defined
- Validation engine designed
- System vs user fields separated
