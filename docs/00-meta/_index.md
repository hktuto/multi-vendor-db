---
document_type: project_dashboard
created: 2026-02-15
---

# Project Dashboard

Dynamic Multi-Vendor Database Tool

## Quick Links

| Document | Link |
|----------|------|
| **Roadmap** | [[roadmap]] |
| **Standards** | [[standards]] |
| **All Epics** | [[../01-epics/_index\|Epics]] |

## Epics Status

```dataview
TABLE status, phase, priority
FROM "01-epics"
WHERE file.name = "_index"
SORT file.path ASC
```

## Recent Activity

```dataview
TABLE file.mtime as "Modified", epic, status
FROM "01-epics"
WHERE file.name != "_index"
SORT file.mtime DESC
LIMIT 10
```

## Active Features

```dataview
TABLE epic, status, priority
FROM "01-epics"
WHERE status = "processing"
SORT file.path ASC
```
