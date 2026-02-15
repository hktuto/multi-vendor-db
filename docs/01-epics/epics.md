---
document_type: epics_index
created: 2026-02-15
---

# All Epics

## By Phase

### Phase 1: Foundation
- [[00-foundation/foundation\|Foundation]]
- [[01-company/company\|Company]]
- [[02-workspace/workspace\|Workspace]]

### Phase 2: Core Data
- [[03-dynamic-tables/dynamic-tables\|Dynamic Tables]]
- [[04-views/views\|Views]]

### Phase 3: Advanced
- [[05-permissions/permissions\|Permissions]]
- [[06-collaboration/collaboration\|Collaboration]]

### Phase 4: Automation & Deploy
- [[07-automation/automation\|Automation]]
- [[08-deployment/deployment\|Deployment]]

## Status Overview

```dataview
TABLE phase, status, length(file.inlinks) as "Features"
FROM "01-epics"
WHERE file.name != "_index"
SORT epic_id ASC
```

## Active Epics

```dataview
TABLE phase, status
FROM "01-epics"
WHERE file.name != "_index" AND status = "processing"
```
