---
epic: Dynamic Tables
number: 0
status: pending
created: 2026-02-15
test_plan: "[[test-dynamic-tables-000-poc-electric-where]]"
tech_notes:
  - "[[dynamic-tables-architecture-decision]]"
epic_ref: "[[dynamic-tables]]"
tags:
  - epic/dynamic-tables
  - status/pending
  - type/poc
---

# 000: POC - Electric SQL WHERE Clause Testing

## Overview

Proof of concept to verify Electric SQL WHERE clause capabilities, specifically testing:
1. Can we filter on JSONB paths (`data->>'field'`)?
2. What column types work in WHERE clauses?
3. Can we do row-level permissions with single-table approach?

| Metadata | Value |
|----------|-------|
| **Epic** | Dynamic Tables |
| **Number** | 0 (POC) |
| **Status** | ⏳ Pending |
| **Type** | Proof of Concept |

## Prerequisites

- Docker & Docker Compose (for Postgres + Electric)
- Basic understanding of Electric SQL shapes

## Test Plan

### Phase 1: Setup

Create a test environment with PostgreSQL + Electric SQL.

```yaml
# docker-compose.poc.yml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: electric_poc
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    command:
      - postgres
      - -c
      - wal_level=logical

  electric:
    image: electricsql/electric:latest
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/electric_poc
      ELECTRIC_PORT: 3000
      ELECTRIC_INSECURE: "true"
    ports:
      - "3000:3000"
    depends_on:
      - postgres
```

```bash
# Start test environment
docker-compose -f docker-compose.poc.yml up -d

# Wait for services
sleep 10
```

### Phase 2: Create Test Tables

Create two test tables to compare approaches:

```sql
-- Connect to PostgreSQL
psql postgresql://postgres:postgres@localhost:5432/electric_poc

-- ========================================
-- Table 1: Single Table with JSONB (EAV)
-- ========================================
CREATE TABLE single_table_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_id UUID NOT NULL,
    company_id UUID NOT NULL,
    -- Normal columns in JSONB
    data JSONB NOT NULL DEFAULT '{}',
    -- Permission columns (for comparison)
    assignee_id UUID,
    created_by UUID,
    status VARCHAR(50),
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert test data
INSERT INTO single_table_records (table_id, company_id, data, assignee_id, created_by, status, is_public) VALUES
('11111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '{"title": "Project A", "priority": "high", "budget": 50000}'::jsonb, 'user-1', 'user-1', 'active', false),
('11111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '{"title": "Project B", "priority": "medium", "budget": 30000}'::jsonb, 'user-2', 'user-1', 'active', true),
('11111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '{"title": "Project C", "priority": "low", "budget": 10000}'::jsonb, 'user-1', 'user-2', 'archived', false),
('22222222-2222-2222-2222-222222222222', 'dddddddd-dddd-dddd-dddd-dddddddddddd', '{"title": "Task X", "completed": true}'::jsonb, 'user-3', 'user-3', 'active', false);

-- ========================================
-- Table 2: Schema-Per-Company Style
-- ========================================
CREATE SCHEMA company_cccccccc;

CREATE TABLE company_cccccccc.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_id UUID NOT NULL,
    -- Normal data in JSONB
    data JSONB NOT NULL DEFAULT '{}',
    -- Real columns for relations/filters
    assignee_id UUID,
    created_by UUID,
    status VARCHAR(50),
    is_public BOOLEAN DEFAULT false,
    priority VARCHAR(20),  -- Extracted from JSONB for filtering
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert same test data
INSERT INTO company_cccccccc.projects (table_id, data, assignee_id, created_by, status, is_public, priority) VALUES
('11111111-1111-1111-1111-111111111111', '{"title": "Project A", "budget": 50000}'::jsonb, 'user-1', 'user-1', 'active', false, 'high'),
('11111111-1111-1111-1111-111111111111', '{"title": "Project B", "budget": 30000}'::jsonb, 'user-2', 'user-1', 'active', true, 'medium'),
('11111111-1111-1111-1111-111111111111', '{"title": "Project C", "budget": 10000}'::jsonb, 'user-1', 'user-2', 'archived', false, 'low');

-- Enable Electric SQL replication
ALTER TABLE single_table_records REPLICA IDENTITY FULL;
ALTER TABLE company_cccccccc.projects REPLICA IDENTITY FULL;
```

### Phase 3: Test WHERE Clauses

Test each WHERE clause pattern with Electric SQL shapes.

#### Test 1: Real Column Filter (Should Work)

```bash
# Test filtering on real column
curl "http://localhost:3000/v1/shape?table=single_table_records&where=assignee_id=%27user-1%27&offset=-1"

# Expected: Returns Project A and Project C
```

#### Test 2: JSONB Path Filter (The Critical Test)

```bash
# Test filtering on JSONB path (data->>'priority')
curl "http://localhost:3000/v1/shape?table=single_table_records&where=data-%3E%3E%27priority%27=%27high%27&offset=-1"
# URL decoded: data->>'priority'='high'

# Expected result:
# If SUPPORTED: Returns Project A
# If NOT SUPPORTED: Electric error or empty result
```

#### Test 3: JSONB Containment

```bash
# Test JSONB containment operator
curl "http://localhost:3000/v1/shape?table=single_table_records&where=data%20%40%3E%20%27%7B%22priority%22%3A%20%22high%22%7D%27&offset=-1"
# URL decoded: data @> '{"priority": "high"}'

# Expected: Likely NOT supported
```

#### Test 4: Complex Permission Filter

```bash
# Test row-level permission pattern (real columns)
curl "http://localhost:3000/v1/shape?table=single_table_records&where=assignee_id=%27user-1%27%20OR%20created_by=%27user-1%27%20OR%20is_public=true&offset=-1"

# Expected: Returns Project A, Project B, Project C (user-1 has access to all)
```

#### Test 5: Schema-Qualified Table

```bash
# Test with schema-qualified table name
curl "http://localhost:3000/v1/shape?table=company_cccccccc.projects&where=assignee_id=%27user-1%27&offset=-1"

# Expected: Works if Electric supports schema-qualified names
```

#### Test 6: Multiple Conditions

```bash
# Test combining JSONB and real column (if JSONB works)
curl "http://localhost:3000/v1/shape?table=single_table_records&where=status=%27active%27&offset=-1"

# Then add JSONB filter if supported
curl "http://localhost:3000/v1/shape?table=single_table_records&where=status=%27active%27%20AND%20company_id=%27cccccccc-cccc-cccc-cccc-cccccccccccc%27&offset=-1"
```

### Phase 4: Document Results

Create a results table:

| Test | WHERE Clause | Supported | Notes |
|------|--------------|-----------|-------|
| 1 | `assignee_id = 'user-1'` | ? | Real column |
| 2 | `data->>'priority' = 'high'` | ? | **JSONB path - CRITICAL** |
| 3 | `data @> '{"priority": "high"}'` | ? | JSONB containment |
| 4 | `assignee_id = 'x' OR created_by = 'x'` | ? | Permission pattern |
| 5 | Schema-qualified table | ? | Schema isolation |
| 6 | `status = 'active' AND company_id = 'x'` | ? | Multi-condition |

## Expected Outcomes

### Scenario A: JSONB NOT Supported (Most Likely)

If Test 2 fails:
- ❌ Single table with JSONB cannot do row-level permissions
- ✅ Must use real columns for permission fields
- **Decision:** Use partitioned table or schema-per-company

### Scenario B: JSONB IS Supported

If Test 2 succeeds:
- ✅ Single table approach viable
- ✅ Can store all data in JSONB
- **Decision:** Use single table (simpler)

## Implementation Script

```bash
#!/bin/bash
# poc-electric-where.sh

ELECTRIC_URL="http://localhost:3000/v1/shape"

echo "=== POC: Electric SQL WHERE Clause ==="
echo ""

# Test 1: Real column
echo "Test 1: Real column filter"
curl -s "$ELECTRIC_URL?table=single_table_records&where=assignee_id=%27user-1%27&offset=-1" | jq '.[] | {id, data}'
echo ""

# Test 2: JSONB path (CRITICAL)
echo "Test 2: JSONB path filter (data->>'priority')"
curl -s "$ELECTRIC_URL?table=single_table_records&where=data-%3E%3E%27priority%27=%27high%27&offset=-1" | jq '.'
echo ""

# Test 3: Complex permission
echo "Test 3: Complex permission filter"
curl -s "$ELECTRIC_URL?table=single_table_records&where=assignee_id=%27user-1%27%20OR%20is_public=true&offset=-1" | jq '.[] | {id, data}'
echo ""

# Test 4: Schema-qualified
echo "Test 4: Schema-qualified table"
curl -s "$ELECTRIC_URL?table=company_cccccccc.projects&where=assignee_id=%27user-1%27&offset=-1" | jq '.[] | {id, data}'
echo ""

echo "=== POC Complete ==="
```

## Success Criteria

| Criterion | Target | Measurement |
|-----------|--------|-------------|
| JSONB path filter | Clarify support | Document if `data->>'field'` works |
| Row-level permission | Must work | OR conditions on real columns |
| Schema-qualified | Nice to have | Electric accepts `schema.table` |
| Performance | <100ms | Shape creation response time |

## Tasks

- [ ] Create `docker-compose.poc.yml`
- [ ] Create test tables with data
- [ ] Run Test 1: Real column filter
- [ ] Run Test 2: JSONB path filter (**CRITICAL**)
- [ ] Run Test 3: JSONB containment
- [ ] Run Test 4: Complex permission filter
- [ ] Run Test 5: Schema-qualified table
- [ ] Document results in [[dynamic-tables-architecture-decision]]
- [ ] Make final architecture decision

## Decision Gates

**Gate 1:** If JSONB path works (Test 2)
- → Single table approach viable
- → Proceed with simple architecture

**Gate 2:** If JSONB path fails but real columns work (Test 1, 4)
- → Must use real columns for permissions
- → Proceed with partitioned table or schema-per-company

**Gate 3:** If schema-qualified works (Test 5)
- → Schema-per-company is viable option
- → Compare complexity vs partitioned table

## Implementation Log

### 2026-02-15
- POC feature created
- Test plan defined with 6 test cases
- Critical test identified: JSONB path in WHERE clause
- Decision gates defined

---

**Next:** Run POC and update [[dynamic-tables-architecture-decision]] with results
