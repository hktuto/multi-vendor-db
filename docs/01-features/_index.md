# Features Dashboard

Features are stored **flat** in this folder. Use frontmatter (`epic`, `phase`, `sprint`) to organize them.

## Status Overview

| Status | Count | Filter |
|--------|-------|--------|
| ⏳ Pending | 0 | `tag:#status/pending` |
| 🚧 Processing | 0 | `tag:#status/processing` |
| ✅ Finish | 0 | `tag:#status/finish` |
| ⏸️ Hold | 0 | `tag:#status/hold` |
| ❌ Cancel | 0 | `tag:#status/cancel` |

## By Epic

### EPIC 1: Foundation
```dataview
TABLE status, priority, created, sprint
FROM "01-features"
WHERE epic = "Foundation"
SORT priority DESC, feature_id ASC
```

### EPIC 2: Core Data
```dataview
TABLE status, priority, created, sprint
FROM "01-features"
WHERE epic = "Core Data"
SORT priority DESC, feature_id ASC
```

### EPIC 3: Views
```dataview
TABLE status, priority, created, sprint
FROM "01-features"
WHERE epic = "Views"
SORT priority DESC, feature_id ASC
```

### EPIC 4: Dashboards
```dataview
TABLE status, priority, created, sprint
FROM "01-features"
WHERE epic = "Dashboards"
SORT priority DESC, feature_id ASC
```

### EPIC 5: Permissions
```dataview
TABLE status, priority, created, sprint
FROM "01-features"
WHERE epic = "Permissions"
SORT priority DESC, feature_id ASC
```

### EPIC 6: Collaboration
```dataview
TABLE status, priority, created, sprint
FROM "01-features"
WHERE epic = "Collaboration"
SORT priority DESC, feature_id ASC
```

## All Features

```dataview
TABLE epic, status, priority, sprint
FROM "01-features"
WHERE file.name != "_index"
SORT phase ASC, feature_id ASC
```

## By Phase

### Phase 1 (MVP)
```dataview
TABLE epic, status, priority, sprint
FROM "01-features"
WHERE phase = 1
SORT sprint ASC, feature_id ASC
```

---

## Templates

- [[../00-templates/feature-template|Feature Template]]
- [[../00-templates/test-plan-template|Test Plan Template]]

## Naming Convention

| Document | Filename Pattern | Example |
|----------|------------------|---------|
| Feature | `feature-{ID}-{name}.md` | `feature-001-project-setup.md` |

**No subfolders** - all features are flat in this directory!