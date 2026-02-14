# AI Agent Instructions

This document contains operational guidelines for AI agents working on this project.

## Project Structure

This is a **monorepo** using pnpm workspaces:
- `apps/` - Application packages
- `packages/` - Shared library packages (including `@docs` for documentation)
- `docs/` - **Obsidian vault** for project management and documentation

## Document Access Rule

**CRITICAL**: Always use **Obsidian MCP tools** (`obsidian_*`) to access documents in the vault.
- ✅ `obsidian_read_note`, `obsidian_update_note`, `obsidian_global_search`
- ❌ Never use `ReadFile` on `docs/` folder except for image file uploads

## Image Handling

The Obsidian MCP does **NOT** support image uploads directly. For screenshots:
1. Use Chrome MCP's `take_screenshot` to save to a temp location
2. Use `ReadFile` (binary mode) to read the image
3. Use standard file operations to copy into `docs/` vault folder
4. Reference the image in Obsidian notes using `![[image.png]]` syntax

## Using Templates

All templates are in `docs/00-templates/`. **Always read the template first** before creating new documents.

### How to Create a New Feature Document

1. **Read the template**: `obsidian_read_note` on `00-templates/feature-template.md`
2. **Copy content** and customize with actual feature details
3. **Generate next feature ID**: Check `01-features/_index.md` for latest ID
4. **Create document**: `obsidian_update_note` to `01-features/feature-{ID}-{name}.md`
5. **Update frontmatter links**: Set `test_plan` and `user_guide` with future document names

### How to Create a Test Plan

1. **Read the template**: `obsidian_read_note` on `00-templates/test-plan-template.md`
2. **Copy content** and fill in test scenarios
3. **Match feature_id**: Use same ID as the feature (e.g., FEAT-001 → TEST-001)
4. **Link back**: Reference the feature using `[[../01-features/feature-{ID}|Feature Name]]`
5. **Create document**: `obsidian_update_note` to `02-tests/test-{ID}-{name}.md` (same name as feature, just different prefix)

### How to Create a User Guide

1. **Read the template**: `obsidian_read_note` on `00-templates/user-guide-template.md`
2. **Use Chrome MCP** to navigate the working feature
3. **Take screenshots** with `take_screenshot` at each step
4. **Save screenshots** to appropriate folder in `docs/`
5. **Embed images** using `![[image.png]]` syntax
6. **Link back**: Reference both feature and test plan documents
7. **Create document**: `obsidian_update_note` to `04-user-guides/guide-{ID}.md`

### Document Linking Conventions

Always maintain bidirectional links between related documents:

| Document Type | Frontmatter Links | Inline Links |
|--------------|-------------------|--------------|
| Feature | `test_plan: "[[test-001-project-setup]]"`<br>`user_guide: "[[guide-001-project-setup]]"` | Quick links table at top |
| Test Plan | `feature_id: FEAT-001` | `[[../01-features/feature-001-{name}\|Feature Name]]` in Overview |
| User Guide | `feature_id: FEAT-001` | Link to feature and test plan in Overview |

**IMPORTANT**: Links use the **filename** (e.g., `test-001-{name}`, `feature-001-{name}`), NOT the feature_id code (`FEAT-001`).

### Naming Conventions

| Document Type | Path | Filename Pattern | Example |
|--------------|------|------------------|---------|
| Feature | `01-features/` | `feature-{ID}-{name}.md` | `feature-001-user-auth.md` |
| Test Plan | `02-tests/` | `test-{ID}-{name}.md` | `test-001-project-setup.md` |
| Journal | `03-journal/` | `{YYYY-MM-DD}.md` | `2026-02-14.md` |
| User Guide | `04-user-guides/` | `guide-{ID}.md` | `guide-001.md` |

### Feature ID Format

- Pattern: `FEAT-XXX` (e.g., FEAT-001, FEAT-002)
- Check `01-features/_index.md` to find the next available number
- Use the same number for related test plan (TEST-001) and guide (GUIDE-001)

### Feature Frontmatter (Required Fields)

When creating a feature document, include these frontmatter fields:

```yaml
---
feature_id: FEAT-001
epic: "Foundation"           # Epic name (e.g., Foundation, Core Data, Views)
phase: 1                     # Phase number (e.g., 1, 2, 3)
sprint: "Sprint 1"           # Sprint name (reference only)
status: pending              # pending | processing | finish | hold | cancel
priority: critical           # critical | high | medium | low
created: 2026-02-14
started: 
completed: 
test_plan: "[[test-001-project-setup]]"   # Same naming pattern as feature
user_guide: "[[guide-001-project-setup]]"  # Same naming pattern as feature
related: []
tags:
  - status/pending
---
```

**Note**: Features are stored **flat** in `01-features/` folder. Use frontmatter (`epic`, `phase`, `sprint`) to organize them, not subfolders.

## Feature Development Workflow

### Phase 1: Feature Proposal
**Before any coding**, I must:
1. Read `00-templates/feature-template.md`
2. Create a feature overview with:
   - Feature description & purpose
   - Scope and boundaries
   - Technical approach summary
   - Estimated effort
3. Present to you as **checkpoint** for approval
4. **WAIT for your approval** before proceeding to Phase 2

### Phase 2: Test Planning
After approval, I must:
1. Read `00-templates/test-plan-template.md`
2. Create detailed test plan with:
   - Test scenarios (happy path, edge cases, error cases)
   - Expected inputs/outputs
   - Test data requirements
3. Present test plan for **approval**
4. **WAIT for your approval** before implementing tests

### Phase 3: Implementation & Testing
1. Implement the feature
2. Write tests according to approved plan
3. Run tests and verify all pass
4. Report test results

### Phase 4: Documentation
**After successful testing**, create client-facing documentation:
1. Read `00-templates/user-guide-template.md`
2. Use Chrome MCP to navigate the working feature
3. Take screenshots at each step using `take_screenshot`
4. Create step-by-step guide in Obsidian with embedded screenshots
5. Documentation should be in `04-user-guides/` folder
6. Present documentation for review

## Obsidian Vault Structure

```
docs/
├── _index.md                    # Project dashboard
├── AGENTS.md                    # This file (copied from root)
├── project-specification.md     # Full project spec with phase plan
├── 00-templates/                # 📋 ALL templates and examples
│   ├── _index.md                # Templates index + linking demo
│   ├── feature-template.md      # Feature document template
│   ├── test-plan-template.md    # Test plan template
│   ├── user-guide-template.md   # User guide template
│   ├── journal-template.md      # Daily log template
│   ├── example-feature-001-user-auth.md  # Demo: Complete feature example
│   ├── example-test-001-user-auth.md     # Demo: Linked test plan
│   └── example-guide-001-user-auth.md   # Demo: Linked user guide
├── 01-features/                 # 📁 FLAT structure - all features here
│   ├── _index.md                # Features dashboard (grouped by status/epic via Dataview)
│   ├── feature-001-project-setup.md
│   ├── feature-002-database-schema.md
│   └── feature-XXX-{name}.md    # Individual features (no subfolders!)
├── 02-tests/                    # 📁 Test plans (flat)
│   ├── _index.md                # Test coverage dashboard
│   ├── test-001.md
│   └── test-XXX.md              # Test plans
├── 03-journal/                  # Daily implementation logs
│   └── YYYY-MM-DD.md
├── 04-user-guides/              # Client-facing documentation
│   └── guide-XXX.md
└── 99-archive/                  # Completed features (moved here when done)
```

### Flat Structure Rule

**NO subfolders in `01-features/` or `02-tests/`**. All documents are flat.

Use **frontmatter** and **Dataview queries** to organize by epic/phase/sprint:
- `epic: "Foundation"` → Groups features by epic
- `phase: 1` → Groups by phase
- `sprint: "Sprint 1"` → Reference only, not for folder structure

The `01-features/_index.md` uses Dataview to show features grouped by status and epic.

## Status Tags (Frontmatter)

Use these exact status values in feature frontmatter:
- `#status/pending` ⏳ - Not started
- `#status/processing` 🚧 - In progress
- `#status/finish` ✅ - Completed
- `#status/hold` ⏸️ - On hold
- `#status/cancel` ❌ - Cancelled

## Checkpoints (ALWAYS Stop and Wait)

I **MUST** pause and wait for your approval at:
1. ✅ After feature overview, before adding to Obsidian
2. ✅ After test plan, before implementing tests
3. ✅ After test completion, before writing documentation
4. ✅ After documentation draft, before finalizing

## My Tools Reference

| Task | Tool |
|------|------|
| Read/Write vault notes | Obsidian MCP |
| Search vault | `obsidian_global_search` |
| Manage frontmatter | `obsidian_manage_frontmatter` |
| Navigate web apps | Chrome MCP |
| Take screenshots | Chrome MCP `take_screenshot` |
| Read image files | `ReadFile` (only for upload) |
| Query library docs | Context 7 MCP |

---

## Library Documentation Rule

**ALWAYS use Context 7 MCP to find official library documentation** before implementing features or making technical decisions.

### When to Use Context 7

| Scenario | Action |
|----------|--------|
| New framework/library | Query Context 7 for setup, config, best practices |
| Uncertain about API | Query Context 7 for accurate method signatures |
| Directory structure confusion | Query Context 7 for official conventions |
| Version differences | Query Context 7 for version-specific docs |

### How to Use Context 7

1. **Resolve library ID**: `resolve-library-id` with library name
2. **Query docs**: `query-docs` with specific questions
3. **Verify version**: Check if version-specific docs are needed

### Example Workflow

```
User: "Use Nuxt 4"
→ resolve-library-id: "nuxt" 
→ query-docs: "Nuxt 4 directory structure app folder"
→ Implement with correct structure
```

**Never assume** - always verify with official documentation via Context 7.

---

## Using the Project Specification

The `project-specification.md` is the **single source of truth** containing:
- All 45 features with IDs
- Phase breakdown (MVP = Phase 1 = 17 features)
- Sprint assignments for each feature
- Technical specifications

**Workflow**:
1. Reference `project-specification.md` for what features exist and their sprint assignments
2. When starting a feature, create the **feature document** in `01-features/`
3. Copy sprint/phase info from spec into feature frontmatter
4. Update feature status as work progresses

---

**Last Updated**: 2026-02-14
