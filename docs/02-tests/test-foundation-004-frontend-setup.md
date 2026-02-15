---
test_id: TEST-004
feature_id: FEAT-004
status: pending
created: 2026-02-15
last_run: 
pass_rate: 0%
---

# Test Plan: Frontend Setup

## Overview

Test plan for [[../00-foundation/004-frontend-setup|004: Frontend Setup]] using Nuxt UI Dashboard template.

**Approach:** Use Nuxt UI Dashboard template components (sidebar, navigation, theme system, user menu)

## Test Scenarios

### 1. Happy Path - Dashboard Layout Renders

| Field | Value |
|-------|-------|
| **ID** | TEST-004-01 |
| **Description** | UDashboardLayout renders with sidebar and navigation |
| **Preconditions** | User is logged in |
| **Steps** | 1. Navigate to /dashboard<br>2. Observe layout structure |
| **Expected Result** | - Sidebar visible on left<br>- Top header with search<br>- Main content area visible<br>- No layout errors |
| **Status** | ⬜ Not Tested |

### 2. Happy Path - Company Switcher (TeamsMenu)

| Field | Value |
|-------|-------|
| **ID** | TEST-004-02 |
| **Description** | Company/team switcher in sidebar header |
| **Preconditions** | User is logged in, has companies |
| **Steps** | 1. Click company dropdown<br>2. Select different company<br>3. Observe switch |
| **Expected Result** | - Dropdown shows available companies<br>- Selection changes active company<br>- UI reflects selected company |
| **Status** | ⬜ Not Tested |

### 3. Happy Path - User Menu with Auth

| Field | Value |
|-------|-------|
| **ID** | TEST-004-03 |
| **Description** | User menu shows current user and logout works |
| **Preconditions** | User is logged in |
| **Steps** | 1. Click user menu in sidebar footer<br>2. Click Logout |
| **Expected Result** | - Shows user name/avatar<br>- Logout option available<br>- Logout clears session and redirects |
| **Status** | ⬜ Not Tested |

### 4. Happy Path - Theme Toggle (Light/Dark)

| Field | Value |
|-------|-------|
| **ID** | TEST-004-04 |
| **Description** | Theme toggle in user menu works |
| **Preconditions** | User is logged in |
| **Steps** | 1. Open user menu<br>2. Click Appearance<br>3. Toggle Light/Dark |
| **Expected Result** | - Theme changes immediately<br>- Preference persists on reload |
| **Status** | ⬜ Not Tested |

### 5. Happy Path - Sidebar Navigation

| Field | Value |
|-------|-------|
| **ID** | TEST-004-05 |
| **Description** | Navigation links in sidebar work |
| **Preconditions** | User is logged in |
| **Steps** | 1. Click Dashboard link<br>2. Click Companies link |
| **Expected Result** | - Navigation works<br>- Active link highlighted |
| **Status** | ⬜ Not Tested |

### 6. Happy Path - Sidebar Collapse

| Field | Value |
|-------|-------|
| **ID** | TEST-004-06 |
| **Description** | Sidebar can be collapsed to icon-only mode |
| **Preconditions** | User is logged in |
| **Steps** | 1. Click collapse button on sidebar<br>2. Observe collapse<br>3. Click expand |
| **Expected Result** | - Sidebar collapses to icon-only<br>- Tooltips show on hover<br>- Expands back to full |
| **Status** | ⬜ Not Tested |

### 7. Happy Path - Global Search

| Field | Value |
|-------|-------|
| **ID** | TEST-004-07 |
| **Description** | Dashboard search button opens search modal |
| **Preconditions** | User is logged in |
| **Steps** | 1. Click search button in sidebar<br>2. Type search query |
| **Expected Result** | - Search modal opens<br>- Shows navigation links<br>- Keyboard shortcut (Cmd+K) works |
| **Status** | ⬜ Not Tested |

### 8. Happy Path - Notifications Slideover

| Field | Value |
|-------|-------|
| **ID** | TEST-004-08 |
| **Description** | Notifications slideover opens and shows items |
| **Preconditions** | User is logged in |
| **Steps** | 1. Click notifications icon<br>2. View notifications |
| **Expected Result** | - Slideover opens from right<br>- Shows notification list<br>- Can dismiss/click items |
| **Status** | ⬜ Not Tested |

### 9. Happy Path - useState for Global State

| Field | Value |
|-------|-------|
| **ID** | TEST-004-09 |
| **Description** | useState/composables maintain global state |
| **Preconditions** | User is logged in |
| **Steps** | 1. Toggle sidebar state<br>2. Navigate to different page<br>3. Check state persists |
| **Expected Result** | - State persists across navigation<br>- No state loss |
| **Status** | ⬜ Not Tested |

### 10. Edge Case - Mobile Responsive

| Field | Value |
|-------|-------|
| **ID** | TEST-004-10 |
| **Description** | Layout adapts to mobile with drawer |
| **Preconditions** | User is logged in |
| **Steps** | 1. Resize browser to mobile<br>2. Open/close sidebar drawer |
| **Expected Result** | - Sidebar becomes drawer<br>- Overlay appears<br>- Touch-friendly |
| **Status** | ⬜ Not Tested |

## Technical Notes

- Using `useDashboard()` composable from Nuxt UI template (createSharedComposable)
- Using `useState()` for simple global state
- Using Nuxt hooks for lifecycle events
- Theme via `useColorMode()` from @nuxt/ui

## Test Data

| Data Set | Values |
|----------|--------|
| Screen sizes | Mobile (375px), Tablet (768px), Desktop (1440px) |
| Themes | Light, Dark, System |
| Companies | Company A, Company B |

## Execution Log

| Date | Run By | Pass | Fail | Notes |
|------|--------|------|------|-------|
| 2026-02-15 | - | 0 | 0 | Initial plan created |

---

*Status Legend: ⬜ Not Tested | 🟡 Partial | 🟢 Pass | 🔴 Fail*
