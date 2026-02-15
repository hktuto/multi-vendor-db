---
epic: Foundation
number: 5
status: completed
created: 2026-02-15
started: 2026-02-15
completed: 2026-02-15
test_plan: "[[test-foundation-005-company-management]]"
tech_notes:
  - "[[foundation-005-company-architecture]]"
  - "[[foundation-005-invite-system]]"
epic_ref: "[[foundation]]"
related: []
tags:
  - epic/foundation
  - status/completed
---

# 005: Company Management

## Overview

User management, company creation, and member invitation system. This is the multi-tenant foundation for the entire application.

| Metadata | Value |
|----------|-------|
| **Epic** | Foundation |
| **Number** | 5 |
| **Status** | ✅ Completed |

## Scope

### Included
- User registration and profile management
- Company creation
- Company settings (name, logo, theme)
- Member management (invite, remove, change role)
- User groups (organization within company)
- Invitation links (token-based)

### Not Included
- Authentication (password/OAuth) → in 003: Auth System
- Workspace management → in Company epic
- Permissions/RBAC → in Permissions epic
- Billing/subscriptions → in Billing epic

## Technical Design

### User Registration Flow

```
POST /api/users
{
  "email": "user@example.com",
  "name": "John Doe"
}
```

- Creates user in `users` table
- Returns user ID for linking to auth accounts

### Company Creation Flow

```
POST /api/companies
{
  "name": "Acme Inc",
  "slug": "acme-inc"
}
```

- Creates company in `companies` table
- Creates company_members entry with `admin` role
- Returns company data

### Member Invitation Flow

```
POST /api/companies/:id/invites
{
  "email": "new@example.com",
  "role": "member"
}
```

- Creates invite_links entry with token
- Sends email with invite link
- Invitee accepts → creates user + company_members

### API Routes

```
/users
  POST          - Create user profile
  GET /me       - Get current user
  PATCH /me     - Update profile

/companies
  GET           - List my companies
  POST          - Create company
  
/companies/:id
  GET           - Get company details
  PATCH         - Update company
  DELETE        - Delete company (owner only)

/companies/:id/members
  GET           - List members
  DELETE /:userId - Remove member
  PATCH /:userId - Update member role

/companies/:id/invites
  GET           - List pending invites
  POST          - Create invite
  DELETE /:token - Cancel invite

/invites/:token
  GET           - Validate invite
  POST          - Accept invite
```

### Composables

```typescript
// composables/useCompany.ts
export function useCompany(companyId: string) {
  const { data: company, refresh } = useFetch(`/api/companies/${companyId}`)
  const { data: members } = useFetch(`/api/companies/${companyId}/members`)
  
  async function update(data: Partial<Company>) {
    await $fetch(`/api/companies/${companyId}`, {
      method: 'PATCH',
      body: data
    })
    await refresh()
  }
  
  return { company, members, update }
}

// composables/useInvites.ts
export function useInvites(companyId: string) {
  const { data: invites, refresh } = useFetch(`/api/companies/${companyId}/invites`)
  
  async function invite(email: string, role: 'admin' | 'member') {
    await $fetch(`/api/companies/${companyId}/invites`, {
      method: 'POST',
      body: { email, role }
    })
    await refresh()
  }
  
  return { invites, invite, cancel: (token: string) => ... }
}
```

## Tasks

- [ ] Create user API routes
- [ ] Create company API routes
- [ ] Create member management API
- [ ] Create invite system API
- [ ] Build company settings page
- [ ] Build member management UI
- [ ] Build invite acceptance flow
- [ ] Add email service for invites

## Implementation Log

### 2026-02-15
- ✅ Feature completed
- Add company CRUD API endpoints
- Add member management (add, remove, change roles)
- Add invite link system with public invite pages
- Create company listing, settings, and members pages
- Implement secondary navigation matching Nuxt UI Dashboard
- Fix invite flow with proper redirect handling
- Update login/register to preserve redirect params
- Add useCompanies composable for state management

### 2026-02-15
- Feature created
