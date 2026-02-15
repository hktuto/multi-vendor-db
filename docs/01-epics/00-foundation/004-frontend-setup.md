---
epic: Foundation
number: 4
status: finish
created: 2026-02-15
started:
completed:
test_plan: "[[test-foundation-004-frontend-setup]]"
tech_notes:
  - "[[foundation-004-frontend-architecture]]"
epic_ref: "[[foundation]]"
related: []
tags:
  - epic/foundation
  - status/pending
---

# 004: Frontend Setup

## Overview

Build the foundation of the frontend application including navigation, middleware, theming, and core layouts.

| Metadata | Value |
|----------|-------|
| **Epic** | Foundation |
| **Number** | 4 |
| **Status** | ⏳ Pending |

## Prerequisites
- ✅ 003: Auth System (for useUserSession)

## Scope

### Included
- Global layouts (default, auth)
- Navigation system (sidebar, top nav)
- Auth middleware
- Theme system (light/dark mode)
- Toast/notification system
- Loading states
- Error boundaries

### Not Included
- Company management pages
- Workspace pages (in Company/Workspace epics)
- Table views (in Dynamic Tables epic)

## Technical Design

### Layouts

```
layouts/
├── default.vue          # Main app layout with sidebar
├── auth.vue             # Auth pages layout (minimal)
└── blank.vue            # Blank layout (for modals, etc.)
```

### Navigation System

**Components:**
- `AppSidebar` - Main navigation sidebar
- `AppTopNav` - Top navigation bar
- `NavItem` - Individual nav item with icons
- `UserDropdown` - User menu in top nav

**Features:**
- Collapsible sidebar
- Active route highlighting
- Workspace switcher
- Company switcher

### Auth Middleware

```typescript
// middleware/auth.ts
export default defineNuxtRouteMiddleware((to, from) => {
  const { loggedIn } = useUserSession()
  
  if (!loggedIn.value && to.path !== '/login') {
    return navigateTo('/login')
  }
  
  if (loggedIn.value && to.path === '/login') {
    return navigateTo('/dashboard')
  }
})
```

### Theme System

```typescript
// composables/useTheme.ts
export function useTheme() {
  const colorMode = useColorMode()
  
  const isDark = computed(() => colorMode.value === 'dark')
  const toggle = () => colorMode.preference = isDark.value ? 'light' : 'dark'
  
  return {
    isDark,
    toggle,
    colorMode
  }
}
```

### Global State (Pinia)

```
stores/
├── auth.ts              # Auth state
├── company.ts           # Current company
├── workspace.ts         # Current workspace
├── navigation.ts        # Nav state (collapsed, etc.)
└── theme.ts             # Theme preferences
```

## Tasks

- [ ] Create global layouts
- [ ] Build navigation components (sidebar, top nav)
- [ ] Create auth middleware
- [ ] Setup theme system (light/dark)
- [ ] Setup Pinia stores
- [ ] Create toast/notification system
- [ ] Add loading states
- [ ] Create error boundary component

## Implementation Log

### 2026-02-15
- Feature created
