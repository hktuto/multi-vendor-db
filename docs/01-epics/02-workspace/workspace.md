---
epic_id: EPIC-002
epic_name: "Workspace"
phase: 1
status: processing
updated: 2026-02-16
created: 2026-02-15
updated: 2026-02-16
tags:
  - epic/workspace
  - status/processing
---

# Epic: Workspace

Workspace (已重命名為 Space) 管理和組織系統。統一的 `space_items` 表支持 Folder、Table、View、Dashboard 四種類型。

## 命名變更
- **舊**: Workspace / Folder 分離設計
- **新**: Space / Space Items 統一設計
- **原因**: 簡化架構，統一權限控制

## Phase
Phase 1 (MVP)

## Features

| # | Feature | ID | Status | Priority |
|---|---------|-----|--------|----------|
| 1 | [[feat-020-space-management\|Space Management]] | FEAT-020 | ✅ Finish | High |
| 2 | [[feat-021-space-items\|Space Items (Unified)]] | FEAT-021 | ⏳ Pending | High |
| 3 | [[feat-022-space-members\|Space Members]] | FEAT-022 | ⏳ Pending | Medium |

## Architecture

### Sync 策略
| 數據 | 策略 | 理由 |
|------|------|------|
| **Spaces** | 全局 State (Electric) | 頻繁切換 |
| **Space Items** | Query-on-demand | 數據量大 |
| **Space Members** | Query-on-demand | 按需查詢 |

### Database
- `spaces` - Electric Sync
- `space_members` - Query-on-demand
- `space_items` - Query-on-demand (Folder/Table/View/Dashboard 統一表)

## Dependencies
- [[../01-company/company\|Company]]
- [[../00-foundation/006-electric-sql-development-plan\|Electric SQL]]

## Next Epic
→ [[../03-dynamic-tables/dynamic-tables\|Dynamic Tables]]
