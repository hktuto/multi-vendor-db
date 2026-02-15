---
epic_id: EPIC-003
epic_name: Dynamic Tables
phase: 2
status: processing
created: 2026-02-15
tags:
  - epic/dynamic-tables
  - status/processing
---

# Epic: Dynamic Tables

Custom table schemas, records, and file attachments.

## Phase
Phase 2 (Core Data)

## Features

| # | Feature | Status | Test Plan | Description |
|---|---------|--------|-----------|-------------|
| 0 | [[000-POC-electric-sql-where\|000: POC - Electric SQL WHERE]] | ⏳ Pending | [[../../02-tests/test-dynamic-tables-000-poc-electric-where\|Test]] | **CRITICAL POC** - Test JSONB in WHERE clauses |
| 1 | [[001-basic-schema\|001: Basic Schema]] | ⏳ Pending | [[../../02-tests/test-dynamic-tables-001-basic-schema\|Test]] | Table container & metadata |
| 2 | [[002-column-system\|002: Column System]] | ⏳ Pending | [[../../02-tests/test-dynamic-tables-002-column-system\|Test]] | Column definitions |
| 3 | [[003-field-types-validation\|003: Field Types & Validation]] | ⏳ Pending | [[../../02-tests/test-dynamic-tables-003-field-types\|Test]] | 30 field types + validation |
| 4 | [[004-record-operations\|004: Record Operations]] | ⏳ Pending | [[../../02-tests/test-dynamic-tables-004-record-ops\|Test]] | CRUD, bulk, import/export |
| 5 | [[005-querying-system\|005: Querying System]] | ⏳ Pending | [[../../02-tests/test-dynamic-tables-005-querying\|Test]] | Filter, sort, pagination |
| 6 | [[006-file-attachments\|006: File Attachments]] | ⏳ Pending | [[../../02-tests/test-dynamic-tables-006-files\|Test]] | File storage |

## Future Features (Out of Scope for Now)

| # | Feature | Planned Epic | Description |
|---|---------|--------------|-------------|
| 7 | Relationships | Dynamic Tables v2 | Table-to-table links |
| 8 | Rollups | Dynamic Tables v2 | Aggregate related data |
| 9 | Formulas | Dynamic Tables v2 | Computed fields |
| 10 | Revisions | Dynamic Tables v2 | Change history |
| 11 | Views | Views Epic | Saved queries/filters |
| 12 | Permissions | Permissions Epic | Field-level access |
| 13 | Real-time | Collaboration Epic | Live updates |
| 14 | Automation | Automation Epic | Triggers/webhooks |

## Dependencies
- [[../02-workspace/workspace\|Workspace]] (for table organization)

## Next Epic
→ [[../04-views/views\|Views]]

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      DYNAMIC TABLES                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐ │
│  │ 001: Basic  │    │ 002: Column │    │ 003: Field Types    │ │
│  │   Schema    │───▶│   System    │───▶│   & Validation      │ │
│  │             │    │             │    │                     │ │
│  │ table_defs  │    │ table_cols  │    │ column_options      │ │
│  └─────────────┘    └─────────────┘    └─────────────────────┘ │
│         │                  │                  │                 │
│         └──────────────────┴──────────────────┘                 │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              004: Record Operations                      │    │
│  │                                                          │    │
│  │   ┌─────────────┐    ┌─────────────┐    ┌───────────┐   │    │
│  │   │   Create    │    │    Read     │    │  Update   │   │    │
│  │   └─────────────┘    └─────────────┘    └───────────┘   │    │
│  │                                                          │    │
│  │   ┌─────────────┐    ┌─────────────┐    ┌───────────┐   │    │
│  │   │    Bulk     │    │   Import    │    │  Export   │   │    │
│  │   └─────────────┘    └─────────────┘    └───────────┘   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              005: Querying System                        │    │
│  │                                                          │    │
│  │   Filter ◄─────► Sort ◄─────► Paginate ◄─────► Search   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              006: File Attachments                       │    │
│  │                                                          │    │
│  │   Upload ◄─────► Store ◄─────► Associate ◄─────► Preview │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```
