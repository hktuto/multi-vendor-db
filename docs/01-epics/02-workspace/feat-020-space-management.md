---
feature_id: FEAT-020
epic: "Workspace"
phase: 1
status: finish
priority: high
created: 2026-02-16
started: 2026-02-16
completed: 
test_plan: "[[test-020-space-management]]"
user_guide: "[[guide-020-space-management]]"
related:
  - "[[FEAT-021-space-items]]"
  - "[[FEAT-022-space-members]]"
tags:
  - status/finish
  - epic/workspace
  - priority/high
---

# Feature: Space Management

## Overview

Space 是公司內的獨立工作區，類似 Notion 的 Workspace。用戶可以在 Space 內創建 Folder、Table、View 和 Dashboard。

**命名變更**: 原本叫 "Workspace"，現簡化為 "Space" 以減少歧義。

| Metadata | Value |
|----------|-------|
| **Feature ID** | `FEAT-020` |
| **Epic** | Workspace |
| **Phase** | 1 |
| **Status** | 🔄 Processing |
| **Priority** | High |

## 核心架構原則

### Sync 策略
| 數據 | 策略 | 理由 |
|------|------|------|
| **Spaces** | 全局 State (Electric Sync) | 頻繁切換，需要即時可用 |
| **Space Items** | Query-on-demand | 數據量大，按 Space 查詢 |
| **Space Members** | Query-on-demand | 只在 members 頁面需要 |

### 與 Companies 模式一致
```typescript
// useCompanies (已有)
const { allCompanies, currentCompanyId, switchCompany } = useCompanies()

// useSpaces (新建)
const { allSpaces, currentSpaceId, switchSpace, queryItems } = useSpaces()
```

## Requirements

### Functional Requirements
- [ ] 列出所有有權限公司的所有 Space
- [ ] 創建新的 Space
- [ ] 編輯 Space 設定（名稱、描述、icon、color）
- [ ] 切換當前 Space
- [ ] 歸檔/刪除 Space
- [ ] 顯示 Space 列表按公司分組

### Non-Functional Requirements
- [ ] 性能: Space 切換 < 100ms（本地數據）
- [ ] UX: 創建後自動切換到新 Space
- [ ] 同步: Electric SQL 同步所有公司的 Space

## Technical Design

### Database Schema
```typescript
// spaces - Electric Sync (全局)
export const spaces = pgTable('spaces', {
  id: uuid('id').primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  icon: varchar('icon', { length: 50 }),
  color: varchar('color', { length: 7 }),
  settings: jsonb('settings').default({}).notNull(),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

// space_members - Query-on-demand
export const spaceMembers = pgTable('space_members', {
  id: uuid('id').primaryKey(),
  spaceId: uuid('space_id').notNull().references(() => spaces.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  role: varchar('role', { length: 20 }).notNull().$type<'admin' | 'editor' | 'viewer'>(),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
  invitedBy: uuid('invited_by').references(() => users.id),
}, (table) => [unique('unique_space_member').on(table.spaceId, table.userId)]);
```

### Composables

#### useSpaces()
```typescript
interface UseSpacesReturn {
  // State (全局)
  allSpaces: Ref<SyncedSpace[]>
  currentSpaceId: Ref<string | null>
  currentSpace: ComputedRef<SyncedSpace | undefined>
  isLoading: Ref<boolean>
  
  // Actions
  switchSpace: (spaceId: string) => void
  refreshSpaces: () => Promise<void>
  createSpace: (data: CreateSpaceInput) => Promise<SyncedSpace>
  updateSpace: (id: string, data: UpdateSpaceInput) => Promise<void>
  archiveSpace: (id: string) => Promise<void>
}

function useSpaces(): UseSpacesReturn
```

#### Synced Types
```typescript
interface SyncedSpace {
  id: string
  company_id: string
  name: string
  description: string | null
  icon: string | null
  color: string | null
  settings: Record<string, any>
  created_by: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/spaces | 列出用戶有權限的所有 Space |
| POST | /api/spaces | 創建新 Space |
| PATCH | /api/spaces/:id | 更新 Space 設定 |
| DELETE | /api/spaces/:id | 歸檔 Space |

### Electric Sync
```typescript
// Spaces 全局同步
const unsubscribe = await electric.subscribe<SyncedSpace>({
  table: 'spaces',
  where: `company_id IN (${allCompanyIds.join(',')})`,
  callbacks: {
    onInsert: (space) => { /* 添加到 allSpaces */ },
    onUpdate: (space) => { /* 更新 allSpaces */ },
    onDelete: (id) => { /* 從 allSpaces 移除 */ }
  }
})
```

## Tasks

### Phase 1: Core
- [ ] 創建 `useSpaces()` composable
- [ ] 實現 Electric Sync for spaces 表
- [ ] 創建 `/spaces/index.vue` 列表頁
- [ ] 創建 `/spaces/new.vue` 創建頁面
- [ ] 創建 `/spaces/[id]/settings.vue` 設定頁

### Phase 2: Navigation
- [ ] 更新 Sidebar 顯示 Space 樹
- [ ] 實現 Space 切換
- [ ] 添加 Space 快速切換器

## Implementation Log

### 2026-02-16
- ✅ 設計 Space 架構（取代舊 Workspace 設計）
- ✅ 確定 Sync 策略（全局 State + Query-on-demand）
- ✅ 定義 Database Schema
- ✅ 創建 `useSpaces()` composable
- ✅ 創建 `useCurrentSpace()` convenience composable
- ✅ 更新 PGlite TABLE_SCHEMAS
- ✅ 實現 API endpoints (GET, POST, PATCH, DELETE)
- ✅ 創建 `/spaces` 列表頁面
- ✅ 創建 `/spaces/[id]` 詳情頁面
- ✅ Space 創建 Modal
- ✅ Item 創建 Modal (folder/table/view/dashboard)

---

*Related: [[FEAT-021-space-items]], [[FEAT-022-space-members]]*
