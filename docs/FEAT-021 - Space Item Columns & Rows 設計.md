# FEAT-021: Space Item Columns & Rows 設計

## 背景

FEAT-020 完成了 Space Item Tree（folder/table/view/dashboard 的層級管理）。

FEAT-021 實現 Table/View 的 Column 定義和 Row 數據存儲。

## 核心設計原則

### 1. Table = View 的本質
- **Table** 就是 `is_default = true` 的 View
- 所有 Column 都屬於 **Table**，View 只控制「顯示方式」
- View 只能創建 **Dynamic Column** (formula/rollup)，但實際存儲在 Table

### 2. Column 分類

| 分類 | 屬於 | 說明 | 例子 |
|------|------|------|------|
| **Information** | Table | 基礎數據欄位 | text, number, date, select |
| **Relation** | Table | 關聯其他 Table | link to Customers |
| **Dynamic** | Table | 計算/聚合欄位 | formula, rollup, count |

### 3. View 的特殊性
- View **不能**創建 Information/Relation Column
- View 創建 Dynamic Column 時，**實際創建在 Table**
- View 的 `config` 只存「顯示配置」(順序、篩選、排序)

## Schema 設計

### space_items (現有，擴展)
```typescript
{
  id: uuid,
  type: 'table' | 'view' | 'folder' | 'dashboard',
  source_table_id: uuid | null,  // View 指向 Table
  config: {
    // View 特有配置
    column_order?: uuid[],        // 可見 column ids 順序
    filters?: FilterConfig[],     // 篩選條件
    sorts?: SortConfig[],         // 排序
    group_by?: GroupConfig,       // 分組
    view_type?: 'grid' | 'list' | 'kanban' | 'calendar'  // 視圖類型
  }
}
```

### space_item_columns (新表)
```typescript
{
  id: uuid,
  item_id: uuid,              // 指向 space_items (一定是 Table！)
  name: string,               // 顯示名稱 (可重複)
  key: string,                // 唯一 key (自動生成，如 "total_x7k9m")
  
  // Column 分類
  category: 'information' | 'relation' | 'dynamic',
  
  // 具體類型
  type: 'text' | 'number' | 'date' | 'datetime' | 'select' | 'multi_select' 
      | 'boolean' | 'user' | 'file' | 'relation' | 'lookup' 
      | 'formula' | 'rollup' | 'count',
  
  order_index: number,        // 在 Table 中的排序
  
  // 配置 (根據 type 不同結構)
  config: {
    // Information: { maxLength, min, max, options: [...], format }
    // Relation: { targetTableId, displayField, allowMultiple }
    // Dynamic: { expression, dependencies: [...], aggregation, sourceTableId }
  },
  
  default_value: any,         // 預設值 (可選)
  
  created_at: timestamp,
  updated_at: timestamp,
  deleted_at: timestamp | null
}
```

### space_item_rows (新表)
```typescript
{
  // 系統欄位
  id: uuid,
  company_id: uuid,           // Partition key (for 權限/查詢)
  space_id: uuid,             // Space 隔離
  item_id: uuid,              // 指向 Table (不是 View！)
  
  // 數據 (JSONB 存 Cell 值)
  data: {
    [columnKey: string]: {
      value: any,             // 實際值
      type: string,           // 用於渲染
      display?: string        // 顯示文本 (如 relation 的目標名稱)
    }
  },
  
  // Metadata
  created_by: uuid,
  created_at: timestamp,
  updated_by: uuid | null,
  updated_at: timestamp | null,
  deleted_by: uuid | null,
  deleted_at: timestamp | null
}
```

## 關鍵設計決策

### 1. Column Key 生成規則
- 用戶輸入 `name` (如 "Total Price")
- 系統生成 `key`: `total_price_x7k9m` (自動添加隨機後綴確保唯一)
- 好處：不同 View 創建的同名 Dynamic Column 不會衝突

### 2. View 創建 Dynamic Column 流程
```typescript
// 用戶在 View 點擊 "Add Formula"
async function createViewFormula(viewId, formulaConfig) {
  const view = await getView(viewId)
  
  // 1. 生成唯一 key
  const uniqueKey = generateUniqueKey(formulaConfig.name)
  
  // 2. 在 Table 創建 column (不是 View！)
  const column = await createColumn({
    item_id: view.source_table_id,
    name: formulaConfig.name,
    key: uniqueKey,
    category: 'dynamic',
    ...formulaConfig
  })
  
  // 3. 加入 View 的 column_order
  await updateViewConfig(viewId, {
    column_order: [...currentOrder, column.id]
  })
  
  return column
}
```

### 3. View 引入現有 Dynamic Column
```typescript
// View 可以使用 Table 上其他 View 創建的 Dynamic Column
async function addExistingColumnToView(viewId, columnId) {
  const view = await getView(viewId)
  const column = await getColumn(columnId)
  
  // 檢查 column 是否屬於同一個 Table
  assert(column.item_id === view.source_table_id)
  
  // 加入 View 顯示順序
  await addColumnToView(viewId, columnId)
}
```

### 4. 查詢 View 數據
```typescript
async function queryView(viewId: string) {
  const view = await getView(viewId)
  
  // 1. 獲取 Table 的所有 Columns
  const allColumns = await getColumns(view.source_table_id)
  
  // 2. 用 view.config.column_order 過濾和排序
  const orderedColumns = view.config.column_order
    ?.map(id => allColumns.find(c => c.id === id))
    ?.filter(Boolean) || allColumns
  
  // 3. 查詢 Rows (都是 Table 的 rows)
  let rows = await getRows(view.source_table_id)
  
  // 4. 應用 View filters
  if (view.config.filters) {
    rows = applyFilters(rows, view.config.filters)
  }
  
  // 5. 應用 View sorts
  if (view.config.sorts) {
    rows = applySorts(rows, view.config.sorts)
  }
  
  // 6. 計算 Dynamic Columns
  rows = await calculateDynamicColumns(rows, orderedColumns)
  
  return { columns: orderedColumns, rows }
}
```

## Electric SQL Sync 策略

| 表格 | Sync 策略 | 說明 |
|------|----------|------|
| `space_items` | 正常 sync | config 包含 view 配置 |
| `space_item_columns` | 正常 sync | 按 item_id (table) 過濾 |
| `space_item_rows` | 正常 sync | 按 company_id + space_id 過濾 |

## 不涉及的功能 (Out of Scope)

- ❌ Row-level Permission (FEAT-022)
- ❌ Form Validation (required 規則在表單層實現)
- ❌ Column 級權限控制

## 依賴

- FEAT-020: Space Item Tree (已完成)
- Electric SQL: PGlite sync 正常工作

## 下一步

1. 創建 Migration 文件
2. 實現 `useSpaceItemColumns` composable
3. 實現 `useSpaceItemRows` composable
4. 實現 View 查詢邏輯 (filter/sort/group)
5. 實現 Dynamic Column 計算 (formula/rollup)

---

**設計日期**: 2026-02-17
**相關分支**: feature/FEAT-021-table-view-columns