# Multi-Vendor DB Project Dashboard

## Overview

Welcome to the **Multi-Vendor Database** project dashboard.

> 📋 **[Project Specification](project-specification.md)** - Full spec with all 45 features, phase plan, and technical details

## Quick Links

| Section | Description | Link |
|---------|-------------|------|
| 📋 Templates | Templates and examples | [[00-templates/_index\|Templates & Examples]] |
| 🚀 Features | Feature backlog (flat structure) | [[01-features/_index\|Features]] |
| 🧪 Tests | Test plans | [[02-tests/_index\|Tests]] |
| 📝 Journal | Daily logs | [[03-journal/_index\|Journal]] |
| 📚 User Guides | Client documentation | [[04-user-guides/_index\|User Guides]] |

## Phase 1: MVP (In Progress)

**Duration**: 5 weeks | **Features**: 17 | **Status**: ⏳ Planning

| Sprint | Features | Epic | Status |
|--------|----------|------|--------|
| Sprint 1 | F001-F005 | Foundation | ⏳ Not Started |
| Sprint 2 | F006-F008, F038 | Core Data | ⏳ Not Started |
| Sprint 3 | F011-F014 | Views | ⏳ Not Started |
| Sprint 4 | F042-F044, F016 | Collaboration | ⏳ Not Started |
| Sprint 5 | F041, F040 | Polish | ⏳ Not Started |

## Current Status

```dataview
TABLE epic, status, priority
FROM "01-features"
WHERE status != "finish"
SORT priority DESC
LIMIT 10
```

## Project Stats

| Metric | Count |
|--------|-------|
| ⏳ Pending | `tag:#status/pending` |
| 🚧 Processing | `tag:#status/processing` |
| ✅ Finished | `tag:#status/finish` |
| ⏸️ On Hold | `tag:#status/hold` |

## Tech Stack

**Frontend**: Nuxt 4 + Nuxt UI + Tailwind  
**Backend**: Nuxt 4 + Nuxt Hub  
**Database**: PGlite + Electric SQL  
**File Storage**: Nuxt Hub Blob  

---

*Last updated: 2026-02-14*