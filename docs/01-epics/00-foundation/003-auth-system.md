---
epic: Foundation
number: 3
status: pending
created: 2026-02-15
started:
completed:
test_plan: "[[test-foundation-003-auth-system]]"
tech_notes:
  - "[[foundation-003-nuxt-auth-utils]]"
epic_ref: "[[foundation]]"
related: []
tags:
  - epic/foundation
  - status/pending
---

# 003: Auth System

## Overview

Authentication system using `nuxt-auth-utils` for session management, OAuth, and password login.

| Metadata | Value |
|----------|-------|
| **Epic** | Foundation |
| **Number** | 3 |
| **Status** | ⏳ Pending |

## Technology Choice: nuxt-auth-utils

**Package**: [nuxt-auth-utils](https://github.com/atinux/nuxt-auth-utils)

**Why this package?**
- ✅ Official Nuxt community module
- ✅ 40+ OAuth providers built-in
- ✅ Password hashing (scrypt)
- ✅ WebAuthn/Passkey support
- ✅ Session management with sealed cookies
- ✅ `useUserSession()` composable for Vue
- ✅ Works with Nuxt server (SSR compatible)
- ✅ Minimal dependencies (UnJS only)
- ✅ Works with NuxtHub

## Scope

### Included
- Email/password login
- Session management (cookie-based)
- Password hashing
- Registration flow
- Logout flow
- Password reset

### Not Included
- MFA (future feature)
- WebAuthn/Passkey (future feature)

## Technical Design

### Session Management

```typescript
// server/api/auth/login.post.ts
export default defineEventHandler(async (event) => {
  const { email, password } = await readBody(event)
  
  // Verify credentials...
  
  await setUserSession(event, {
    user: {
      id: user.id,
      email: user.email,
      name: user.name
    },
    loggedInAt: new Date()
  })
  
  return { success: true }
})
```

### Vue Composable

```vue
<script setup>
const { loggedIn, user, clear } = useUserSession()

async function logout() {
  await clear()
  await navigateTo('/login')
}
</script>

<template>
  <div v-if="loggedIn">
    <p>Welcome {{ user.name }}!</p>
    <button @click="logout">Logout</button>
  </div>
  <div v-else>
    <a href="/api/auth/github">Login with GitHub</a>
  </div>
</template>
```

## Tasks

- [ ] Install nuxt-auth-utils
- [ ] Configure session password (env)
- [ ] Create auth API routes (login, register, logout)
- [ ] Setup OAuth providers (GitHub, Google)
- [ ] Create login/register pages
- [ ] Add auth middleware
- [ ] Test session persistence

## Implementation Log

### 2026-02-15
- Feature created
- Technology chosen: nuxt-auth-utils
