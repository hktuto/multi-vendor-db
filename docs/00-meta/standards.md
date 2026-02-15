---
document_type: standards
created: 2026-02-15
---

# Project Standards

## File Naming

### Epics
```
01-epics/{order}-{name}/
```
Examples:
- `00-foundation/`
- `01-company/`
- `02-workspace/`

### Features (No "feature-" prefix)
```
01-epics/{epic}/{number}-{name}.md
```
Examples:
- `001-project-setup.md`
- `002-db-schema-basic.md`
- `003-auth-system.md`

### Tests
```
02-tests/test-{epic}-{number}-{name}.md
```

### Tech Notes
```
05-tech-notes/{epic}-{number}-{topic}.md
```

## Frontmatter Template

### Epic Index
```yaml
---
epic_id: EPIC-001
epic_name: Foundation
phase: 1
status: pending          # pending | processing | finish | hold
created: 2026-02-15
tags:
  - epic/foundation
  - status/pending
---
```

### Feature
```yaml
---
epic: Foundation
number: 1
status: pending
created: 2026-02-15
epic_ref: "[[00-foundation/_index]]"
test_plan: "[[test-foundation-001-project-setup]]"
tech_notes:
  - "[[foundation-001-sql]]"
tags:
  - epic/foundation
  - status/pending
---
```

## Status Values

| Value | Emoji | Meaning |
|-------|-------|---------|
| pending | ⏳ | Not started |
| processing | 🚧 | In progress |
| finish | ✅ | Completed |
| hold | ⏸️ | On hold |
