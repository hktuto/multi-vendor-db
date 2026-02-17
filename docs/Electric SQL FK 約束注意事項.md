# Electric SQL FK 約束移除注意事項

## 背景

為了解決 Electric SQL sync 順序不固定導致的外鍵約束錯誤，我們移除了所有 `.references()` FK 約束。

## ⚠️ 重要影響

### 1. 手動管理 CASCADE DELETE

**之前（有 FK）:**
```typescript
// 數據庫自動處理
ON DELETE CASCADE  →  自動刪除子記錄
ON DELETE SET NULL →  自動設為 NULL
```

**現在（無 FK）:**
```typescript
// 必須人手處理！
await db.transaction(async (tx) => {
  await tx.delete(spaceMembers).where(...)
  await tx.delete(spaces).where(...)
  await tx.delete(companyMembers).where(...)
  await tx.delete(companies).where(...) // 最後刪除
})
```

### 2. 孤兒數據風險

刪除 parent 時如果忘記刪除 children，會留下指向不存在 parent 的孤兒記錄：

```sql
-- 這種記錄會出現
company_members: { 
  id: 'xxx', 
  company_id: '已刪除的公司ID',  -- ← 指向不存在！
  user_id: 'yyy' 
}
```

### 3. 需要手動處理的關聯

| Parent Table | Child Tables | 刪除順序 |
|-------------|--------------|---------|
| `companies` | `spaces`, `company_members`, `invite_links`, `user_groups` | 先刪 children |
| `spaces` | `space_members`, `space_items` | 先刪 children |
| `space_items` | `space_item_permissions` | 先刪 permissions |
| `users` | `user_accounts`, `company_members`, `space_members` | 先刪 memberships |

## 🛡️ 防禦策略

### 1. API 層保證
所有刪除 API 必須正確處理 cascade：

```typescript
// server/api/companies/[id].delete.ts
export default defineEventHandler(async (event) => {
  const companyId = getRouterParam(event, 'id')
  
  await db.transaction(async (tx) => {
    // 按正確順序刪除
    await tx.delete(spaceItemPermissions)
      .where(inArray(...))
    await tx.delete(spaceItems).where(...)
    await tx.delete(spaceMembers).where(...)
    await tx.delete(spaces).where(...)
    await tx.delete(inviteLinks).where(...)
    await tx.delete(companyMembers).where(...)
    await tx.delete(companies).where(eq(companies.id, companyId))
  })
})
```

### 2. 查詢時過濾
查詢時忽略孤兒數據：

```typescript
const members = await db.query.companyMembers.findMany({
  where: and(
    eq(companyMembers.companyId, companyId),
    // 額外檢查 company 是否存在
    inArray(companyMembers.companyId, 
      db.select({ id: companies.id }).from(companies)
    )
  )
})
```

### 3. 定期清理
考慮添加後台 job 清理孤兒數據。

## ✅ 檢查清單

- [ ] 刪除 company 時清理所有關聯數據
- [ ] 刪除 space 時清理 items 和 members
- [ ] 刪除 user 時清理 memberships
- [ ] 查詢時驗證關聯是否存在
- [ ] 測試刪除流程

## 📅 修改日期

- **2025-02-17**: 移除所有 FK 約束，改為純 uuid 欄位
- **Migration**: `0001_remove_fk_constraints.sql`

---

**相關文件:**
- `apps/web/server/db/schema.ts`
- `apps/web/server/db/migrations/postgresql/0001_remove_fk_constraints.sql`