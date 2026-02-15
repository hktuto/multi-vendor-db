---
test_id: TEST-F002
epic: Foundation
feature_number: 2
status: pending
created: 2026-02-15
last_run: 
pass_rate: 0%
---

# Test Plan: 002 DB Schema - Basic

Test plan for [[../01-epics/00-foundation/002-db-schema-basic|002: DB Schema - Basic]].

## Test Scenarios

### 1. ID Generation - Application Generated

| Field | Value |
|-------|-------|
| **ID** | TEST-F002-01 |
| **Description** | IDs are application-generated, not database auto-generated |
| **Preconditions** | Schema applied, app can insert data |
| **Steps** | 1. Generate UUID in app: `crypto.randomUUID()`<br>2. Insert user with explicit id<br>3. Query user by that id |
| **Expected Result** | User inserted with provided ID, not auto-generated |
| **Status** | ⬜ Not Tested |

### 2. Schema - Users Table

| Field | Value |
|-------|-------|
| **ID** | TEST-F002-02 |
| **Description** | Users table has correct columns |
| **Preconditions** | Migration applied |
| **Steps** | 1. Query table structure<br>2. Verify columns: id, email, name, avatar_url, preferences, created_at, updated_at, last_login_at, is_active |
| **Expected Result** | All columns exist with correct types |
| **Status** | ⬜ Not Tested |

### 3. Schema - User Accounts Table

| Field | Value |
|-------|-------|
| **ID** | TEST-F002-03 |
| **Description** | User accounts table supports multiple auth methods |
| **Preconditions** | Migration applied |
| **Steps** | 1. Insert password account<br>2. Insert OAuth account for same user<br>3. Query all accounts for user |
| **Expected Result** | Both accounts linked to same user |
| **Status** | ⬜ Not Tested |

### 4. Schema - Company with Settings JSONB

| Field | Value |
|-------|-------|
| **ID** | TEST-F002-04 |
| **Description** | Company settings stored as JSONB |
| **Preconditions** | Migration applied |
| **Steps** | 1. Create company with settings: `{ timezone: 'UTC', theme: { primary: '#3b82f6' } }`<br>2. Query company<br>3. Verify settings structure |
| **Expected Result** | Settings stored and retrieved correctly |
| **Status** | ⬜ Not Tested |

### 5. Schema - UserGroupMember with company_id

| Field | Value |
|-------|-------|
| **ID** | TEST-F002-05 |
| **Description** | UserGroupMember has company_id for easy sync |
| **Preconditions** | Migration applied |
| **Steps** | 1. Create company, group, member<br>2. Query user_group_members where company_id = ? |
| **Expected Result** | Can query members by company_id directly |
| **Status** | ⬜ Not Tested |

### 6. Schema - Folder without parent_id

| Field | Value |
|-------|-------|
| **ID** | TEST-F002-06 |
| **Description** | Folder has no parent_id (hierarchy in workspace.menu) |
| **Preconditions** | Migration applied |
| **Steps** | 1. Check folder table structure<br>2. Verify no parent_id column |
| **Expected Result** | parent_id column does not exist |
| **Status** | ⬜ Not Tested |

### 7. Schema - Workspace Menu JSONB

| Field | Value |
|-------|-------|
| **ID** | TEST-F002-07 |
| **Description** | Workspace stores menu as JSONB tree |
| **Preconditions** | Migration applied |
| **Steps** | 1. Create workspace with menu: `[{ id, type, itemId, order, children, permissions }]`<br>2. Query workspace<br>3. Verify menu structure |
| **Expected Result** | Menu stored and retrieved correctly |
| **Status** | ⬜ Not Tested |

### 8. Foreign Key Constraints

| Field | Value |
|-------|-------|
| **ID** | TEST-F002-08 |
| **Description** | Foreign keys prevent orphaned records |
| **Preconditions** | Migration applied |
| **Steps** | 1. Try inserting company_member with invalid company_id<br>2. Try inserting folder with invalid workspace_id |
| **Expected Result** | Both inserts rejected with FK constraint error |
| **Status** | ⬜ Not Tested |

### 9. Unique Constraints

| Field | Value |
|-------|-------|
| **ID** | TEST-F002-09 |
| **Description** | Unique constraints prevent duplicates |
| **Preconditions** | Migration applied |
| **Steps** | 1. Insert user with email "test@example.com"<br>2. Try inserting another user with same email |
| **Expected Result** | Second insert rejected with unique constraint error |
| **Status** | ⬜ Not Tested |

### 10. Soft Delete

| Field | Value |
|-------|-------|
| **ID** | TEST-F002-10 |
| **Description** | Soft delete sets deleted_at instead of removing |
| **Preconditions** | Migration applied, company exists |
| **Steps** | 1. Set company.deleted_at = NOW()<br>2. Query companies with deleted_at IS NULL<br>3. Query all companies |
| **Expected Result** | Company not returned in first query, returned in second |
| **Status** | ⬜ Not Tested |

### 11. Relations - Query with Relations

| Field | Value |
|-------|-------|
| **ID** | TEST-F002-11 |
| **Description** | Drizzle relations work for joined queries |
| **Preconditions** | Migration applied, seed data exists |
| **Steps** | 1. Query user with accounts using relations<br>2. Query company with members using relations |
| **Expected Result** | Related data fetched correctly |
| **Status** | ⬜ Not Tested |

## Test Data

| Entity | Required Data |
|--------|---------------|
| User | id, email, name |
| UserAccount | id, user_id, provider, provider_account_id |
| Company | id, name, slug, owner_id |
| CompanyMember | id, company_id, user_id, role |
| UserGroup | id, company_id, name, created_by |
| UserGroupMember | id, company_id, group_id, user_id, role, added_by |
| InviteLink | id, company_id, created_by, token, role |
| Workspace | id, company_id, name, menu, created_by |
| Folder | id, company_id, workspace_id, name, created_by |

## Execution Log

| Date | Run By | Pass | Fail | Notes |
|------|--------|------|------|-------|
| 2026-02-15 | - | 0 | 0 | Test plan created |

---

*Status Legend: ⬜ Not Tested | 🟡 Partial | 🟢 Pass | 🔴 Fail*
