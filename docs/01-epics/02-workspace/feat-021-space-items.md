---
feature_id: FEAT-021
epic: "Workspace"
phase: 2
status: pending
priority: high
created: 2026-02-16
started: 
completed: 
test_plan: "[[test-021-space-items]]"
user_guide: "[[guide-021-space-items]]"
related:
  - "[[FEAT-020-space-management]]"
  - "[[FEAT-023-space-table-view]]"
  - "[[FEAT-024-space-dashboard]]"
tags:
  - status/pending
  - epic/workspace
  - priority/high
---

# Feature: Space Items (Unified)

## Overview

Space Items 是統一的資源表，包含 Folder、Table、View、Dashboard 四種類型。使用 `parent_id` 自引用實現嵌套結構。

**設計原則**: 一個表統一管理，避免多表 JOIN，簡化權限控制。

| Metadata | Value |
|----------|-------|
| **Feature ID** | `FEAT-021` |
| **Epic** | Workspace |
| **Phase** | 2 |
| **Status** | ⏳ Pending |
| **Priority** | High |

## Item Types

| Type | 用途 | Config 示例 |
|------|------|-------------|
| `folder` | 組織容器 | `{ isExpanded: true }` |
| `table` | 動態表格 | `{ schemaId, filters, sorts }` |
| `view` | 保存的查詢 | `{ tableId, filters, visibleColumns }` |
| `dashboard` | 儀表板 | `{ widgets, layout }` |

## Requirements

### Functional Requirements
- [ ] 創建四種類型的 Item
- [ ] Folder 嵌套（parent_id 自引用）
- [ ] Item 重命名、修改 icon/color
- [ ] 拖放排序（同級 items order_index）
- [ ] 移動 Item 到其他 Folder/Space
- [ ] 刪除 Item（軟刪除）

### Non-Functional Requirements
- [ ] 性能: 構建樹狀結構 < 50ms（本地 PGlite）
- [ ] UX: 無限嵌套 Folder 支持
- [ ] 擴展: Config JSONB 可靈活擴展

## Technical Design

### Database Schema
```typescript
export const spaceItems = pgTable('space_items', {
  id: uuid('id').primaryKey(),
  spaceId: uuid('space_id').notNull().references(() => spaces.id),
  parentId: uuid('parent_id').references(() => spaceItems.id), // 嵌套
  type: varchar('type', { length: 50 }).notNull()
    .$type<'folder' | 'table' | 'view' | 'dashboard'>(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  icon: varchar('icon', { length: 50 }),
  color: varchar('color', { length: 7 }),
  orderIndex: integer('order_index').default(0).notNull(),
  config: jsonb('config').default({}).notNull(),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
}, (table) => [
  unique('unique_space_item_name').on(table.spaceId, table.parentId, table.name),
]);
```

### Config 結構

#### Folder Config
```typescript
interface FolderConfig {
  isExpanded?: boolean
  defaultView?: 'list' | 'grid'
}
```

#### Table Config
```typescript
interface TableConfig {
  schemaId: string           // 關聯的 dynamic_table
  columnOrder?: string[]     // 欄位顯示順序
  filters?: Filter[]         // 預設過濾器
  sorts?: Sort[]             // 預設排序
  defaultView?: 'grid' | 'form' | 'kanban'
}

interface Filter {
  column: string
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'contains' | 'in'
  value: any
}

interface Sort {
  column: string
  direction: 'asc' | 'desc'
}
```

#### View Config
```typescript
interface ViewConfig {
  sourceTableId: string      // 基於哪個 Table
  filters: Filter[]
  sorts: Sort[]
  visibleColumns: string[]   // 顯示哪些欄位
  groupBy?: string           // 分組欄位
}
```

#### Dashboard Config
```typescript
interface DashboardConfig {
  layout: 'grid' | 'free'
  widgets: Widget[]
}

interface Widget {
  id: string
  type: 'table' | 'view' | 'chart' | 'metric'
  itemId: string             // 引用哪個 item
  position: { x: number, y: number, w: number, h: number }
  config: Record<string, any> // widget 專有配置
}
```

### Composables

#### useSpaceItems() - Query-on-demand
```typescript
interface UseSpaceItemsReturn {
  // State
  items: Ref<SyncedSpaceItem[]>
  tree: ComputedRef<ItemTreeNode[]>
  isLoading: Ref<boolean>
  
  // Actions
  loadItems: (spaceId: string) => Promise<void>
  createItem: (data: CreateItemInput) => Promise<SyncedSpaceItem>
  updateItem: (id: string, data: UpdateItemInput) => Promise<void>
  moveItem: (id: string, parentId: string | null, orderIndex: number) => Promise<void>
  deleteItem: (id: string) => Promise<void>
  expandFolder: (id: string, expanded: boolean) => void
}

// Tree 節點結構
interface ItemTreeNode extends SyncedSpaceItem {
  children: ItemTreeNode[]
  isExpanded: boolean
  level: number
}
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/spaces/:spaceId/items | 列出 Space 的所有 Items |
| POST | /api/space-items | 創建新 Item |
| PATCH | /api/space-items/:id | 更新 Item |
| DELETE | /api/space-items/:id | 刪除 Item |
| POST | /api/space-items/:id/move | 移動 Item |

## Tasks

### Folder Management
- [ ] 創建 Folder
- [ ] Folder 嵌套（多層）
- [ ] 展開/收起 Folder
- [ ] 重命名 Folder
- [ ] 移動 Folder
- [ ] 刪除 Folder（連同子 items）

### Item Tree UI
- [ ] 樹狀組件（遞歸渲染）
- [ ] 拖放排序
- [ ] Context menu（右鍵選單）
- [ ] 快速創建按鈕

## Implementation Log

### 2026-02-16
- ⏳ 等待 FEAT-020 完成後開始

---

*Related: [[FEAT-020-space-management]], [[FEAT-023-space-table-view]], [[FEAT-024-space-dashboard]]*
