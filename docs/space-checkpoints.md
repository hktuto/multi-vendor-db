# Space Feature - Checkpoints

## Checkpoint 0: 準備 (Pre-req)
- [ ] 確認 schema 已應用到數據庫
- [ ] 更新 `usePgWorker.ts` TABLE_SCHEMAS 添加新表
- [ ] 確認 Electric SQL 可以同步 spaces 表

---

## Checkpoint 1: useSpaces Composable
**Branch:** `feature/use-spaces`
**Time:** 2-3 hours

### Tasks
- [ ] 創建 `app/composables/useSpaces.ts`
- [ ] 定義 `SyncedSpace`, `SyncedSpaceItem`, `SyncedSpaceMember` 類型
- [ ] 實現 `allSpaces` 全局 Ref（所有有權限公司的 Space）
- [ ] 實現 `currentSpaceId` 和 `currentSpace` computed
- [ ] 實現 `switchSpace()` 方法
- [ ] 實現 Electric sync（spaces 表）
- [ ] 實現 `refreshSpaces()` 手動刷新

### Acceptance Criteria
- [ ] `useSpaces()` 可在多個組件中共享狀態
- [ ] 切換公司時 `allSpaces` 自動更新
- [ ] 可以 `switchSpace()` 並正確設置當前 Space

---

## Checkpoint 2: Query-on-demand for Items
**Branch:** `feature/space-query-on-demand`  
**Time:** 3-4 hours

### Tasks
- [ ] 在 `useSpaces` 中添加 `queryItems(spaceId)` 方法
- [ ] 使用 PGlite worker 查詢 items（不是 Electric subscribe）
- [ ] 實現 `onItemsChange()` 可選訂閱（頁面級別）
- [ ] 實現 items 樹狀結構構建（parent_id 遞歸）

### Acceptance Criteria
- [ ] `queryItems()` 返回指定 Space 的所有 items
- [ ] 可以正確構建嵌套的 folder/item 樹
- [ ] 頁面切換時不保留舊 Space 的 items 在內存

---

## Checkpoint 3: Space 列表頁面
**Branch:** `feature/spaces-list-page`
**Time:** 2-3 hours

### Tasks
- [ ] 創建 `/spaces/index.vue`
- [ ] 按公司分組顯示 Space 列表
- [ ] 每個 Space 顯示 icon, name, 描述
- [ ] 點擊 Space 進入 `/spaces/[id]`
- [ ] 添加「創建 Space」按鈕（打開 Modal）

### Acceptance Criteria
- [ ] 可以看到所有公司的所有 Space
- [ ] 可以從列表進入特定 Space
- [ ] UI 響應式，支持移動端

---

## Checkpoint 4: 創建 Space
**Branch:** `feature/create-space`
**Time:** 2-3 hours

### Tasks
- [ ] 創建「創建 Space」Modal
- [ ] 表單：name, description, icon, color
- [ ] 選擇所屬 Company（默認當前）
- [ ] API endpoint: `POST /api/spaces`
- [ ] 創建後自動設為當前 Space

### Acceptance Criteria
- [ ] 可以創建新 Space
- [ ] 創建後出現在列表中（Electric 同步）
- [ ] 自動切換到新 Space

---

## Checkpoint 5: Space 導航 (Sidebar)
**Branch:** `feature/space-sidebar`
**Time:** 3-4 hours

### Tasks
- [ ] 更新 Sidebar 組件
- [ ] 顯示所有公司的 Space 樹
- [ ] 當前 Space 高亮
- [ ] 點擊 Space 展開/收起 Items
- [ ] 顯示 Item icon (folder/table/view/dashboard)

### Acceptance Criteria
- [ ] Sidebar 可以導航所有 Space
- [ ] 展開 Space 顯示其 Items 樹
- [ ] 切換 Space 時頁面內容更新

---

## Checkpoint 6: Space 首頁
**Branch:** `feature/space-home`
**Time:** 2-3 hours

### Tasks
- [ ] 創建 `/spaces/[id]/index.vue`
- [ ] 顯示 Space 信息和 Items 總覽
- [ ] 快速操作：創建 Folder/Table
- [ ] 如果沒有 Items，顯示空狀態指引

### Acceptance Criteria
- [ ] Space 首頁顯示正確信息
- [ ] 可以從首頁創建第一個 Item

---

## Checkpoint 7: Folder 管理
**Branch:** `feature/folder-management`
**Time:** 4-5 hours

### Tasks
- [ ] 創建 Folder Modal
- [ ] API: `POST /api/space-items` (type='folder')
- [ ] 實現 Folder 拖放排序
- [ ] 實現 Folder 嵌套（parent_id）
- [ ] 編輯/刪除 Folder

### Acceptance Criteria
- [ ] 可以創建、編輯、刪除 Folder
- [ ] Folder 可以嵌套
- [ ] 可以拖放排序

---

## Checkpoint 8: Table 創建與查看
**Branch:** `feature/space-tables`
**Time:** 5-6 hours

### Tasks
- [ ] 創建 Table Modal（選 Schema）
- [ ] API: `POST /api/space-items` (type='table')
- [ ] Table 網格視圖頁面
- [ ] 基礎欄位顯示

### Acceptance Criteria
- [ ] 可以創建 Table Item
- [ ] 可以打開 Table 查看數據
- [ ] 顯示基礎網格視圖

---

## Checkpoint 9: Space 設定
**Branch:** `feature/space-settings`
**Time:** 2-3 hours

### Tasks
- [ ] `/spaces/[id]/settings.vue`
- [ ] 編輯 Space 名稱、描述、icon、color
- [ ] 歸檔/刪除 Space

### Acceptance Criteria
- [ ] 可以修改 Space 設定
- [ ] 可以歸檔 Space

---

## Checkpoint 10: Space 成員
**Branch:** `feature/space-members`
**Time:** 3-4 hours

### Tasks
- [ ] `/spaces/[id]/members.vue`
- [ ] 成員列表（query-on-demand）
- [ ] 邀請成員 Modal
- [ ] API: `POST /api/space-members`

### Acceptance Criteria
- [ ] 可以查看 Space 成員
- [ ] 可以邀請新成員
- [ ] 可以修改成員角色

---

## 合併策略

```
main
  └── checkpoint-1 (useSpaces)
        └── checkpoint-2 (query-on-demand)
              └── checkpoint-3 (list-page)
                    └── checkpoint-4 (create-space)
                          └── checkpoint-5 (sidebar)
                                └── checkpoint-6 (space-home)
                                      └── checkpoint-7 (folder)
                                            └── checkpoint-8 (tables)
                                                  └── checkpoint-9 (settings)
                                                        └── checkpoint-10 (members)
                                                              └── merge to main
```

每個 checkpoint 完成後可以單獨測試，不一定要等全部完成才合併。

---

## 開始開發

**第一個 Checkpoint:** `feature/use-spaces`

需要我現在開始實現嗎？
