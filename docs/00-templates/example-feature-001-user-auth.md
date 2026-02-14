---
feature_id: FEAT-001
status: finish
priority: high
created: 2026-02-14
started: 2026-02-14
completed: 2026-02-14
test_plan: "[[example-test-001-user-auth]]"
user_guide: "[[example-guide-001-user-auth]]"
related: []
tags:
  - status/finish
---

# [DEMO] Feature: User Authentication System

> ⚠️ **This is a demonstration document** showing how features, tests, and user guides link together.

## Overview

A complete user authentication system with login, logout, and session management.

**Feature ID**: `FEAT-001`
**Status**: ✅ Finish
**Priority**: High

## Quick Links

| Document | Link | Status |
|----------|------|--------|
| 📋 Test Plan | [[example-test-001-user-auth]] | ✅ Complete |
| 📖 User Guide | [[example-guide-001-user-auth]] | ✅ Published |

## Requirements

### Functional Requirements
- [x] Users can log in with email and password
- [x] Users can log out
- [x] Sessions expire after 30 minutes of inactivity
- [x] Password reset functionality

### Non-Functional Requirements
- [x] Security: Passwords hashed with bcrypt
- [x] Performance: Login response < 200ms
- [x] Usability: Clear error messages

## Technical Design

### Data Models
```typescript
interface User {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

interface Session {
  id: string;
  userId: string;
  expiresAt: Date;
}
```

### API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/login | Authenticate user |
| POST | /api/auth/logout | End session |
| POST | /api/auth/reset-password | Initiate password reset |

## Tasks

- [x] Design database schema
- [x] Implement login endpoint
- [x] Implement logout endpoint
- [x] Add session management
- [x] Write tests
- [x] Create user guide

## Implementation Log

### 2026-02-14
- ✅ Feature implementation complete
- ✅ All tests passing (see [[example-test-001-user-auth]])
- ✅ User guide published (see [[example-guide-001-user-auth]])

---

*This is a demonstration. Real features would be in `01-features/` folder.*