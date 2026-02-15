---
epic: Foundation
number: 7
status: pending
created: 2026-02-15
started: 
completed: 
test_plan: "[[test-foundation-007-company-frontend]]"
tech_notes:
  - "[[foundation-007-sync-integration]]"
epic_ref: "[[foundation]]"
related: []
tags:
  - epic/foundation
  - status/pending
---

# 007: Company Frontend Integration

## Overview

Integrate company management with the frontend and Electric SQL sync. Build the company UI with real-time data from local-first storage.

| Metadata | Value |
|----------|-------|
| **Epic** | Foundation |
| **Number** | 7 |
| **Status** | ⏳ Pending |

## Prerequisites

This feature comes AFTER:
- ✅ 003: Auth System (user sessions)
- ✅ 004: Frontend Setup (layouts, navigation)
- ✅ 006: Electric SQL + PGlite (sync infrastructure)

## Scope

### Included
- Company dashboard page
- Company list/switcher UI
- Member management UI with sync
- Invite flow UI with sync
- Company settings page with sync
- Real-time updates via Electric SQL

### Not Included
- Workspace management → in Company epic
- Table views → in Dynamic Tables epic
- Billing/subscriptions → in Billing epic

## Technical Design

### Sync-Enabled Composables

```typescript
// composables/useSyncedCompanies.ts
export function useSyncedCompanies() {
  // Sync companies where user is a member
  const { data, isLoading, error } = useShape({
    url: `${electricUrl}/v1/shape`,
    params: {
      table: 'companies',
      // Filter by user's memberships
    }
  })
  
  return { companies: data, isLoading, error }
}

// composables/useSyncedMembers.ts
export function useSyncedMembers(companyId: string) {
  // Sync company members in real-time
  const { data } = useShape({
    url: `${electricUrl}/v1/shape`,
    params: {
      table: 'company_members',
      where: `company_id = '${companyId}'`
    }
  })
  
  return { members: data }
}
```

### Pages

```
pages/
├── dashboard/
│   └── index.vue           # List user's companies
├── companies/
│   ├── [id]/
│   │   ├── index.vue       # Company dashboard
│   │   ├── members.vue     # Member management
│   │   └── settings.vue    # Company settings
│   └── join/[token].vue    # Accept invite
```

### Real-Time Features

- Member list updates when someone joins/leaves
- Settings changes sync across all open tabs
- Invite status updates in real-time

## Tasks

- [ ] Create company list page (synced)
- [ ] Create company dashboard page
- [ ] Build member management UI with sync
- [ ] Build invite flow UI with sync
- [ ] Create company settings page with sync
- [ ] Add real-time indicators (sync status)
- [ ] Test offline → online sync

## Implementation Log

### 2026-02-15
- Feature created
- Depends on: Auth System + Frontend Setup + Electric SQL
