---
feature_id: FEAT-022
epic: "Workspace"
phase: 1
status: pending
priority: medium
created: 2026-02-16
started: 
completed: 
test_plan: "[[test-022-space-members]]"
user_guide: "[[guide-022-space-members]]"
related:
  - "[[FEAT-020-space-management]]"
tags:
  - status/pending
  - epic/workspace
  - priority/medium
---

# Feature: Space Members

## Overview

Space Members 管理誰可以訪問 Space。與 Company Members 分開，一個用戶可以在不同 Space 有不同角色。

**角色設計**:
- `admin`: 管理 Space 設定和成員
- `editor`: 創建和編輯 Items
- `viewer`: 只讀訪問

| Metadata | Value |
|----------|-------|
| **Feature ID** | `FEAT-022` |
| **Epic** | Workspace |
| **Phase** | 1 |
| **Status** | ⏳ Pending |
| **Priority** | Medium |

## Requirements

### Functional Requirements
- [ ] 列出 Space 的所有成員
- [ ] 邀請成員（輸入 email，選擇 role）
- [ ] 修改成員角色
- [ ] 移除成員
- [ ] 顯示成員在線狀態（可選）

### Non-Functional Requirements
- [ ] 權限檢查: 只有 admin 可以管理成員
- [ ] 通知: 被邀請時收到通知

## Technical Design

### Database Schema
```typescript
export const spaceMembers = pgTable('space_members', {
  id: uuid('id').primaryKey(),
  spaceId: uuid('space_id').notNull().references(() => spaces.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  role: varchar('role', { length: 20 }).notNull()
    .$type<'admin' | 'editor' | 'viewer'>(),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
  invitedBy: uuid('invited_by').references(() => users.id),
}, (table) => [
  unique('unique_space_member').on(table.spaceId, table.userId),
]);
```

### Composables

#### useSpaceMembers() - Query-on-demand
```typescript
interface UseSpaceMembersReturn {
  // State
  members: Ref<SyncedSpaceMember[]>
  isLoading: Ref<boolean>
  canManage: ComputedRef<boolean>  // 當前用戶是否為 admin
  
  // Actions
  loadMembers: (spaceId: string) => Promise<void>
  inviteMember: (email: string, role: Role) => Promise<void>
  updateRole: (memberId: string, role: Role) => Promise<void>
  removeMember: (memberId: string) => Promise<void>
}

interface SyncedSpaceMember {
  id: string
  space_id: string
  user_id: string
  role: 'admin' | 'editor' | 'viewer'
  joined_at: string
  invited_by: string | null
  // Join 用戶信息
  user?: {
    name: string
    email: string
    avatar_url: string | null
  }
}
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/spaces/:spaceId/members | 列出成員 |
| POST | /api/spaces/:spaceId/members | 邀請成員 |
| PATCH | /api/space-members/:id | 更新角色 |
| DELETE | /api/space-members/:id | 移除成員 |

### 邀請流程
```
1. 輸入 email
2. 系統查找 user（必須已註冊且在同一 company）
3. 發送邀請通知
4. 用戶接受後加入 space_members
```

## Tasks

- [ ] 創建 `/spaces/[id]/members.vue` 頁面
- [ ] 成員列表顯示（頭像、名稱、角色）
- [ ] 邀請成員 Modal
- [ ] 角色下拉選擇
- [ ] 移除成員確認

## Implementation Log

### 2026-02-16
- ⏳ 等待 FEAT-020 完成後開始

---

*Related: [[FEAT-020-space-management]]*
