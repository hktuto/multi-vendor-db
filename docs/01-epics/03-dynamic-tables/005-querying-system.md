---
epic: Dynamic Tables
number: 5
status: pending
created: 2026-02-15
test_plan: "[[test-dynamic-tables-005-querying]]"
tech_notes:
  - "[[dynamic-tables-005-query-engine]]"
  - "[[dynamic-tables-005-jsonb-indexing]]"
epic_ref: "[[dynamic-tables]]"
related:
  - "[[001-basic-schema]]"
  - "[[002-column-system]]"
  - "[[003-field-types-validation]]"
  - "[[004-record-operations]]"
tags:
  - epic/dynamic-tables
  - status/pending
---

# 005: Querying System

## Overview

Design the querying system for dynamic tables. This feature provides filtering, sorting, pagination, and search capabilities for JSONB-stored record data.

| Metadata | Value |
|----------|-------|
| **Epic** | Dynamic Tables |
| **Number** | 5 |
| **Status** | ⏳ Pending |

## Prerequisites

- ✅ [[001-basic-schema|001: Basic Schema]]
- ✅ [[002-column-system|002: Column System]]
- ✅ [[003-field-types-validation|003: Field Types & Validation]]
- ✅ [[004-record-operations|004: Record Operations]]

## Scope

### Included
- Filter/query builder
- Sorting by any column
- Pagination (offset and cursor-based)
- Full-text search
- Filter by relation
- Aggregations (count, sum, avg)
- Query optimization with JSONB indexes

### Not Included (Other Features)
- Views (saved queries) → Views epic
- Complex joins → Future feature
- Advanced analytics → Future feature

## Query Structure

### Request Format

```typescript
interface QueryRequest {
  // Filters
  filter?: FilterGroup;
  
  // Sorting
  sort?: SortConfig[];
  
  // Pagination
  pagination?: OffsetPagination | CursorPagination;
  
  // Search
  search?: SearchConfig;
  
  // Selection
  columns?: string[];           // Column slugs to return
  includeDisplay?: boolean;     // Include _display values
}

// Filter Types
interface FilterGroup {
  operator: 'and' | 'or';
  filters: (FilterCondition | FilterGroup)[];
}

interface FilterCondition {
  column: string;               // Column slug
  operator: FilterOperator;
  value: any;
}

type FilterOperator =
  // Comparison
  | 'eq' | 'neq'                // Equal, not equal
  | 'gt' | 'gte'                // Greater than, greater than or equal
  | 'lt' | 'lte'                // Less than, less than or equal
  // Text
  | 'contains' | 'notContains'  // String contains
  | 'startsWith' | 'endsWith'   // String prefix/suffix
  | 'regex'                     // Regular expression
  // Array
  | 'in' | 'notIn'              // In array, not in array
  | 'containsAll' | 'containsAny' // For multi-select
  // Null
  | 'isEmpty' | 'isNotEmpty'    // Null/empty check
  // Date
  | 'isToday' | 'isThisWeek' | 'isThisMonth'
  | 'isBefore' | 'isAfter'
  // Relation
  | 'hasAny' | 'hasAll';        // For relations

interface SortConfig {
  column: string;
  direction: 'asc' | 'desc';
  nulls?: 'first' | 'last';
}

interface OffsetPagination {
  type: 'offset';
  offset: number;
  limit: number;
}

interface CursorPagination {
  type: 'cursor';
  cursor?: string;              // Base64 encoded position
  limit: number;
  direction: 'forward' | 'backward';
}

interface SearchConfig {
  query: string;
  columns?: string[];           // Search specific columns (default: all text)
  fuzzy?: boolean;
}
```

### Response Format

```typescript
interface QueryResponse {
  records: TableRecord[];
  pagination: {
    total: number;              // Total matching records
    hasMore: boolean;
    // For offset pagination
    offset?: number;
    limit?: number;
    // For cursor pagination
    nextCursor?: string;
    previousCursor?: string;
  };
  meta: {
    executionTime: number;      // Query execution time (ms)
    appliedFilters: FilterGroup;
    appliedSort: SortConfig[];
  };
}
```

## Query Builder Implementation

### SQL Generation

```typescript
function buildQuery(tableId: string, request: QueryRequest) {
  let query = db
    .select()
    .from(tableRecords)
    .where(and(
      eq(tableRecords.tableId, tableId),
      isNull(tableRecords.deletedAt)
    ));
  
  // Apply filters
  if (request.filter) {
    const filterSql = buildFilterSql(request.filter);
    query = query.where(filterSql);
  }
  
  // Apply search
  if (request.search) {
    const searchSql = buildSearchSql(request.search);
    query = query.where(searchSql);
  }
  
  // Apply sorting
  if (request.sort) {
    for (const sort of request.sort) {
      query = query.orderBy(buildOrderBy(sort));
    }
  } else {
    // Default sort by created_at desc
    query = query.orderBy(desc(tableRecords.createdAt));
  }
  
  // Apply pagination
  if (request.pagination) {
    if (request.pagination.type === 'offset') {
      query = query
        .limit(request.pagination.limit)
        .offset(request.pagination.offset);
    } else {
      // Cursor pagination
      const cursor = decodeCursor(request.pagination.cursor);
      query = applyCursor(query, cursor, request.pagination);
    }
  }
  
  return query;
}

function buildFilterSql(filter: FilterGroup | FilterCondition): SQL {
  if ('operator' in filter && 'filters' in filter) {
    // FilterGroup
    const conditions = filter.filters.map(f => buildFilterSql(f));
    return filter.operator === 'and' 
      ? and(...conditions) 
      : or(...conditions);
  } else {
    // FilterCondition
    return buildConditionSql(filter);
  }
}

function buildConditionSql(condition: FilterCondition): SQL {
  const { column, operator, value } = condition;
  
  switch (operator) {
    case 'eq':
      return sql`data->>${column} = ${value}`;
    case 'neq':
      return sql`data->>${column} != ${value}`;
    case 'gt':
      return sql`(data->>${column})::numeric > ${value}`;
    case 'gte':
      return sql`(data->>${column})::numeric >= ${value}`;
    case 'lt':
      return sql`(data->>${column})::numeric < ${value}`;
    case 'lte':
      return sql`(data->>${column})::numeric <= ${value}`;
    case 'contains':
      return sql`data->>${column} ILIKE ${`%${value}%`}`;
    case 'startsWith':
      return sql`data->>${column} ILIKE ${`${value}%`}`;
    case 'endsWith':
      return sql`data->>${column} ILIKE ${`%${value}`}`;
    case 'in':
      return sql`data->>${column} = ANY(${value})`;
    case 'isEmpty':
      return or(
        sql`data->>${column} IS NULL`,
        sql`data->>${column} = ''`,
        sql`data->>${column} = '[]'`
      );
    case 'isToday':
      return sql`DATE(data->>${column}) = CURRENT_DATE`;
    case 'isThisWeek':
      return sql`data->>${column} >= DATE_TRUNC('week', CURRENT_DATE)`;
    case 'isBefore':
      return sql`data->>${column} < ${value}`;
    case 'isAfter':
      return sql`data->>${column} > ${value}`;
    case 'containsAny':
      // For multi-select: array overlap
      return sql`data->${column} ?| ${value}`;
    case 'containsAll':
      // For multi-select: array contains
      return sql`data->${column} ?& ${value}`;
    default:
      throw new Error(`Unknown operator: ${operator}`);
  }
}
```

## Field Type Specific Queries

### Text Fields

```typescript
// Exact match
eq: sql`data->>${column} = ${value}`

// Case-insensitive contains
contains: sql`data->>${column} ILIKE ${`%${value}%`}`

// Regex
regex: sql`data->>${column} ~ ${value}`
```

### Number Fields

```typescript
// Cast to numeric for comparison
gt: sql`(data->>${column})::numeric > ${value}`

// Between
between: sql`(data->>${column})::numeric BETWEEN ${min} AND ${max}`
```

### Date Fields

```typescript
// Date comparison
gt: sql`data->>${column} > ${value}`

// Relative dates
isToday: sql`DATE(data->>${column}) = CURRENT_DATE`
isThisWeek: sql`data->>${column} >= DATE_TRUNC('week', CURRENT_DATE)`
isThisMonth: sql`data->>${column} >= DATE_TRUNC('month', CURRENT_DATE)`

// Date ranges
inLastDays: sql`data->>${column} >= CURRENT_DATE - INTERVAL '${days} days'`
```

### Select Fields

```typescript
// Single select (stored as option ID)
eq: sql`data->>${column} = ${optionId}`
in: sql`data->>${column} = ANY(${optionIds})`

// Multi-select (stored as JSON array)
containsAny: sql`data->${column} ?| ${optionIds}`  // ANY array overlap
containsAll: sql`data->${column} ?& ${optionIds}`  // ALL array contains
```

### Relation Fields

```typescript
// Has specific related record
eq: sql`data->>${column} = ${recordId}`

// Has any of multiple records
hasAny: sql`data->${column} ?| ${recordIds}`

// Has all of multiple records (many-to-many)
hasAll: sql`data->${column} ?& ${recordIds}`
```

## Full-Text Search

### Simple Search

```typescript
function buildSearchSql(search: SearchConfig): SQL {
  const searchColumns = search.columns || ['_display.*']; // All text columns
  const terms = search.query.split(' ').filter(t => t.length > 0);
  
  const conditions = terms.map(term => {
    const columnConditions = searchColumns.map(col => {
      if (col === '_display.*') {
        // Search all display values
        return sql`data->_display::text ILIKE ${`%${term}%`}`;
      }
      return sql`data->>${col} ILIKE ${`%${term}%`}`;
    });
    return or(...columnConditions);
  });
  
  return and(...conditions);
}
```

### Advanced Search (PostgreSQL Full-Text)

```typescript
// For better performance on large tables
function buildFullTextSearch(query: string): SQL {
  // Create tsvector from all text columns
  return sql`to_tsvector('english', data::text) @@ plainto_tsquery('english', ${query})`;
}
```

## Pagination

### Offset Pagination

Best for: Traditional page-based UIs

```typescript
// Request
{
  pagination: {
    type: 'offset',
    offset: 0,    // Skip 0 records
    limit: 50     // Return 50 records
  }
}

// Response
{
  records: [...],
  pagination: {
    total: 1250,
    hasMore: true,
    offset: 0,
    limit: 50
  }
}
```

**Pros:** Simple, can jump to any page
**Cons:** Performance degrades with large offsets

### Cursor Pagination

Best for: Infinite scroll, real-time data

```typescript
// Request first page
{
  pagination: {
    type: 'cursor',
    limit: 50,
    direction: 'forward'
  }
}

// Response with cursor
{
  records: [...],
  pagination: {
    total: 1250,
    hasMore: true,
    nextCursor: 'eyJpZCI6IjEyMyIsImNyZWF0ZWRBdCI6IjIwMjYtMDMtMTUifQ=='
  }
}

// Request next page
{
  pagination: {
    type: 'cursor',
    cursor: 'eyJpZCI6IjEyMyIsImNyZWF0ZWRBdCI6IjIwMjYtMDMtMTUifQ==',
    limit: 50,
    direction: 'forward'
  }
}
```

**Implementation:**

```typescript
interface Cursor {
  id: string;           // Record ID
  createdAt: string;    // Sort value (timestamp)
}

function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64');
}

function decodeCursor(encoded: string): Cursor {
  return JSON.parse(Buffer.from(encoded, 'base64').toString());
}

function applyCursor(
  query: any, 
  cursor: Cursor, 
  pagination: CursorPagination
): any {
  const operator = pagination.direction === 'forward' ? '<' : '>';
  
  return query.where(sql`
    (created_at, id) ${sql.raw(operator)} (${cursor.createdAt}, ${cursor.id})
  `);
}
```

**Pros:** Consistent performance, handles real-time updates
**Cons:** Can't jump to arbitrary page

## Aggregations

### Basic Aggregations

```typescript
interface AggregationRequest {
  column: string;
  function: 'count' | 'sum' | 'avg' | 'min' | 'max';
  groupBy?: string;             // Group by column
  filter?: FilterGroup;
}

async function aggregate(
  tableId: string,
  request: AggregationRequest
): Promise<AggregationResult> {
  let query = db
    .select({
      value: sql`${sql.raw(request.function)}((data->>${request.column})::numeric)`,
      ...(request.groupBy ? { group: sql`data->>${request.groupBy}` } : {})
    })
    .from(tableRecords)
    .where(and(
      eq(tableRecords.tableId, tableId),
      isNull(tableRecords.deletedAt)
    ));
  
  if (request.filter) {
    query = query.where(buildFilterSql(request.filter));
  }
  
  if (request.groupBy) {
    query = query.groupBy(sql`data->>${request.groupBy}`);
  }
  
  return query;
}
```

### Usage Examples

```typescript
// Count all active records
{
  function: 'count',
  filter: { operator: 'and', filters: [{ column: 'status', operator: 'eq', value: 'active' }] }
}

// Sum of budget by status
{
  column: 'budget',
  function: 'sum',
  groupBy: 'status'
}

// Average rating
{
  column: 'rating',
  function: 'avg'
}
```

## Indexing Strategy

### JSONB Indexes

```sql
-- GIN index for flexible queries
CREATE INDEX idx_records_data_gin ON table_records USING GIN (data);

-- Specific path indexes for frequently queried columns
CREATE INDEX idx_records_status ON table_records ((data->>'status'));
CREATE INDEX idx_records_created ON table_records ((data->>'createdAt'));

-- Composite index for common filter combinations
CREATE INDEX idx_records_status_date ON table_records ((data->>'status'), (data->>'createdAt'));

-- Full-text search index
CREATE INDEX idx_records_search ON table_records USING GIN (to_tsvector('english', data::text));
```

### When to Add Indexes

| Query Pattern | Index Type |
|--------------|------------|
| Filter by specific column | B-tree on `data->>'column'` |
| Text search on column | GIN on `data` |
| Full-text search | GIN on `to_tsvector(data::text)` |
| Range queries (date, number) | B-tree on casted value |
| Multiple column filters | Composite B-tree |

## API Endpoints

```typescript
// Query records
POST /api/tables/:tableId/query
{
  "filter": {
    "operator": "and",
    "filters": [
      { "column": "status", "operator": "eq", "value": "active" },
      { "column": "budget", "operator": "gt", "value": 10000 }
    ]
  },
  "sort": [
    { "column": "createdAt", "direction": "desc" }
  ],
  "pagination": {
    "type": "offset",
    "offset": 0,
    "limit": 50
  },
  "search": {
    "query": "project alpha"
  }
}

// Get distinct values (for filters)
GET /api/tables/:tableId/columns/:columnSlug/distinct?limit=100

// Quick stats
GET /api/tables/:tableId/stats
{
  "total": 1250,
  "byStatus": {
    "active": 800,
    "completed": 350,
    "archived": 100
  }
}
```

## Tasks

- [ ] Implement filter SQL builder
- [ ] Implement sorting
- [ ] Implement offset pagination
- [ ] Implement cursor pagination
- [ ] Implement search functionality
- [ ] Add aggregation support
- [ ] Create query UI (filter builder)
- [ ] Add sort controls
- [ ] Add pagination components
- [ ] Optimize with JSONB indexes
- [ ] Add query performance monitoring

## Implementation Log

### 2026-02-15
- Feature created
- Query structure defined
- Pagination strategies designed
- Indexing strategy planned
