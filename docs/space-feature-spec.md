# Space Feature - 實現規格

## 架構原則

### Sync 範圍
- **Spaces**: Sync **所有有權限公司的 Space**（不只是當前公司）
- 理由：Space 數量少，頻繁切換需要即時響應
- 類比：`useCompanies` 同步所有用戶的公司

### State 管理
| 數據 | 策略 | 原因 |
|------|------|------|
| `allSpaces` | 全局 Ref (long-lived) | 導航需要 |
| `currentSpaceId` | 全局 Ref | 當前上下文 |
| `currentSpaceItems` | Query-on-demand | 數據量大，按 Space 查詢 |
| `currentSpaceMembers` | Query-on-demand | 只在 members 頁面需要 |

### 與 Companies 對比
```typescript
// useCompanies (已有)
const { allCompanies, currentCompanyId, switchCompany } = useCompanies()

// useSpaces (新建)
const { allSpaces, currentSpaceId, switchSpace, currentSpaceItems } = useSpaces()
```

---

## Database Schema（已定義）

```typescript
// spaces - 需要同步到 PGlite
// space_members - query-on-demand
// space_items - query-on-demand  
// space_item_permissions - query-on-demand
```

---

## Composables 設計

### useSpaces() - 全局同步
```typescript
interface UseSpacesReturn {
  // State
  allSpaces: Ref<SyncedSpace[]>
  currentSpaceId: Ref<string | null>
  currentSpace: ComputedRef<SyncedSpace | undefined>
  
  // Actions
  switchSpace: (spaceId: string) => void
  refreshSpaces: () => Promise<void>
  
  // Query-on-demand (類似 useCompanyQueries)
  queryItems: (spaceId: string) => Promise<SyncedSpaceItem[]>
  queryMembers: (spaceId: string) => Promise<SyncedSpaceMember[]>
  onItemsChange: (spaceId: string, callback: ItemsChangeCallback) => () => void
  onMembersChange: (spaceId: string, callback: MembersChangeCallback) => () => void
}
```

### Synced Types (PGlite)
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

interface SyncedSpaceItem {
  id: string
  space_id: string
  parent_id: string | null
  type: 'folder' | 'table' | 'view' | 'dashboard'
  name: string
  description: string | null
  icon: string | null
  color: string | null
  order_index: number
  config: Record<string, any>
  created_by: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

interface SyncedSpaceMember {
  id: string
  space_id: string
  user_id: string
  role: 'admin' | 'editor' | 'viewer'
  joined_at: string
  invited_by: string | null
}
```

---

## Electric Sync 配置

### Spaces 表同步
```typescript
// useSpaces.ts
const unsubscribe = await electric.subscribe<SyncedSpace>({
  table: 'spaces',
  // where: company_id IN (用戶有權限的所有公司)
  // 暫時：company_id IN (allCompanies.value.map(c => c.id))
  callbacks: {
    onInsert: (space) => { /* 添加到 allSpaces */ },
    onUpdate: (space) => { /* 更新 allSpaces */ },
    onDelete: (id) => { /* 從 allSpaces 移除 */ }
  }
})
```

### Space Items 查詢（Query-on-demand）
```typescript
// 不按 Space 訂閱，而是按需查詢 PGlite
async function queryItems(spaceId: string): Promise<SyncedSpaceItem[]> {
  const pg = await getPgWorker()
  const result = await pg.query<SyncedSpaceItem>(
    'SELECT * FROM space_items WHERE space_id = $1 AND deleted_at IS NULL ORDER BY order_index',
    [spaceId]
  )
  return result.rows
}

// 變更監聽（可選）
function onItemsChange(spaceId: string, callback: Callback) {
  // 訂閱該 Space 的 items（短暫訂閱，頁面離開取消）
}
```

---

## 頁面結構

```
/spaces
├── index.vue              # Space 列表（所有公司的 Space）
├── new.vue                # 創建 Space Modal
└── [id]
    ├── index.vue          # Space 首頁（顯示 Items 樹）
    ├── settings.vue       # Space 設定
    └── members.vue        # 成員管理（query-on-demand）
```

---

## UI 設計

### Space 列表頁 (/spaces)
- 按公司分組顯示 Space
- 公司名稱作為分組標題
- 每個 Space 顯示：icon + name + 成員數

### Space 導航 (Sidebar)
```
📁 Company A
  ├─ 🏠 Space 1
  │   ├─ 📁 Folder A
  │   │   ├─ 📊 Table 1
  │   │   └─ 📊 Table 2
  │   └─ 📈 Dashboard 1
  └─ 🏠 Space 2

📁 Company B
  └─ 🏠 Space 3
```

---

## 實現順序

參見 `space-checkpoints.md`
