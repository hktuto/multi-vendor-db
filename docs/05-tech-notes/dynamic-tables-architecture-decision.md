# Tech Note: Dynamic Tables Architecture Decision

## Context

Date: 2026-02-15
Topic: Architecture comparison for dynamic table storage
Stakeholders: Development Team

## Problem Statement

We need to design the storage architecture for dynamic tables with the following requirements:
1. Support custom tables per company
2. Row-level permissions with Electric SQL sync
3. Data isolation between companies
4. Handle relations between records
5. Efficient querying and syncing

## Approaches Considered

### Approach 1: Single Table (EAV Pattern)

```sql
CREATE TABLE table_records (
  id uuid PRIMARY KEY,
  table_id uuid REFERENCES table_defs(id),
  company_id uuid,
  data jsonb  -- All column values stored here
);
```

**Pros:**
- Simple implementation
- No DDL required for new tables/columns
- Easy migrations (single table)
- Electric SQL works with simple configuration
- Good connection pooling (one table)

**Cons:**
- ❌ Cannot use JSONB operators in Electric SQL WHERE clauses (CRITICAL)
- ❌ Row-level permissions impossible with Electric shapes
- No referential integrity (FKs) for relations
- Complex queries for relations (application-level joins)
- Harder company deletion (DELETE WHERE)

**Verdict:** ❌ **REJECTED** - Cannot support row-level permissions with Electric SQL

---

### Approach 2: Schema-Per-Company

```sql
-- Schema: company_123
CREATE TABLE projects (
  id uuid PRIMARY KEY,
  data jsonb,
  assignee_id uuid,  -- Real column for filtering
  created_by uuid
);
```

**Pros:**
- ✅ Real columns for Electric SQL WHERE clauses
- ✅ Row-level permissions work
- ✅ True FK constraints for relations
- ✅ Easy company isolation (DROP SCHEMA)
- ✅ Company-level backup/restore

**Cons:**
- Complex connection pooling (schema switching)
- DDL required for table creation
- Complex migrations (run on every schema)
- Query complexity (schema-qualified names)
- Limited by PostgreSQL schema count (performance degradation)
- Electric SQL needs schema-qualified table names

**Verdict:** ⚠️ **VALID but high-maintenance** - Good for <100 companies

---

### Approach 3: Partitioned Table (Recommended)

```sql
CREATE TABLE table_records (
  id uuid,
  company_id uuid NOT NULL,  -- Partition key
  table_id uuid,
  data jsonb,
  -- Real columns for Electric WHERE
  assignee_id uuid,
  created_by uuid,
  status varchar,
  PRIMARY KEY (company_id, id)
) PARTITION BY LIST (company_id);

CREATE TABLE records_company_123 PARTITION OF table_records
  FOR VALUES IN ('company-123');
```

**Pros:**
- ✅ Real columns for Electric SQL WHERE clauses
- ✅ Row-level permissions work
- ✅ Single table abstraction (simpler queries)
- ✅ Easy company deletion (DROP PARTITION)
- ✅ One migration affects all partitions
- ✅ Better connection pooling than multi-schema
- ✅ Electric SQL works with company_id filter

**Cons:**
- DDL required for new companies (CREATE PARTITION)
- ~1000 partition limit per table
- Cannot have FK to other partitioned tables (circular dependency)

**Verdict:** ✅ **RECOMMENDED** - Best balance for 100-10,000 companies

---

## Key Findings

### Electric SQL WHERE Clause Limitations

From [Electric SQL Documentation](https://electric-sql.com/docs/guides/shapes#where-clause):

Supported in WHERE:
- Columns: numerical, boolean, uuid, text, interval, date/time, arrays
- Operators: arithmetics, comparisons, logical operators, LIKE
- Subqueries (experimental)

**NOT supported:**
- ❌ JSONB operators (`->>`, `->`, `#>`)
- ❌ JSONB containment (`@>`, `<@`)
- ❌ JSONB existence (`?`, `?|`, `?&`)

**Implication:** We cannot use single-table-with-JSONB for row-level permissions because we can't filter on `data->>'assignee_id'` in Electric shapes.

### Row-Level Permissions Requirement

To sync only records a user can see:
```javascript
// Must use real columns in WHERE
{
  table: 'records',
  where: 'assignee_id = $1 OR created_by = $1 OR is_public = true',
  params: { '1': userId }
}
```

This requires `assignee_id`, `created_by`, `is_public` to be **real table columns**, not JSONB paths.

### Relation Handling

| Approach | Relation Storage | Cascade Delete |
|----------|------------------|----------------|
| Single Table | JSONB ID | Application-level |
| Schema-Per-Co | Real FK column | Native FK |
| Partitioned | Real column (no FK) | Application-level |

Note: Partitioned tables cannot have FK to other partitioned tables due to PostgreSQL limitations.

## Hybrid Column Strategy

For the partitioned approach, we recommend:

```sql
CREATE TABLE table_records (
  -- Identity
  id uuid,
  company_id uuid NOT NULL,
  table_id uuid,
  workspace_id uuid,
  
  -- Permission columns (real, for Electric WHERE)
  created_by uuid,
  updated_by uuid,
  assignee_id uuid,
  owner_id uuid,
  status varchar(50),
  is_public boolean DEFAULT false,
  
  -- Relation slots (pre-allocated, real columns)
  rel_1_id uuid,
  rel_2_id uuid,
  rel_3_id uuid,
  rel_4_id uuid,
  rel_5_id uuid,
  
  -- Data (JSONB for flexibility)
  data jsonb,
  
  PRIMARY KEY (company_id, id)
) PARTITION BY LIST (company_id);
```

**Column Mapping:**
- `table_columns` stores which `rel_N` slot is assigned to which column
- Most fields stored in `data` JSONB
- Permission/relation fields stored in real columns

## Decision Matrix

| Factor | Weight | Single Table | Schema-Per-Co | Partitioned |
|--------|--------|--------------|---------------|-------------|
| Electric SQL compatibility | High | ❌ | ✅ | ✅ |
| Row-level permissions | High | ❌ | ✅ | ✅ |
| Implementation complexity | Medium | ✅ | ❌ | ⚠️ |
| Migration simplicity | Medium | ✅ | ❌ | ✅ |
| Company isolation | Medium | ❌ | ✅ | ✅ |
| Connection pooling | Medium | ✅ | ❌ | ✅ |
| Scalability (>1000 cos) | High | ✅ | ❌ | ⚠️ |
| **TOTAL** | | ❌ | ⚠️ | ✅ |

## Recommendation

**Use Partitioned Table approach** with:
1. List partitioning by `company_id`
2. Real columns for permission filtering (assignee_id, created_by, etc.)
3. Pre-allocated relation slots (rel_1_id through rel_10_id)
4. JSONB `data` column for all other fields

**For very small scale (< 10 companies):** Schema-per-company is acceptable and simpler.

**For very large scale (> 10,000 companies):** Consider Citus (distributed Postgres) or database-per-company with orchestration.

## Next Steps

1. ✅ Create POC to verify Electric SQL WHERE clause with JSONB
2. Benchmark query performance for partitioned approach
3. Test Electric SQL sync with partitioned tables
4. Design column-to-slot mapping system

## References

- [Electric SQL Shapes Documentation](https://electric-sql.com/docs/guides/shapes)
- [PostgreSQL Table Partitioning](https://www.postgresql.org/docs/current/ddl-partitioning.html)
- [Multi-Tenant SaaS Database Patterns](https://docs.microsoft.com/en-us/azure/sql-database/saas-tenancy-app-design-patterns)

---

**Status:** Awaiting POC validation  
**Last Updated:** 2026-02-15
