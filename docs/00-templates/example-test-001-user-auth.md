---
test_id: TEST-001
feature_id: FEAT-001
status: finish
created: 2026-02-14
last_run: 2026-02-14
pass_rate: 100%
---

# [DEMO] Test Plan: User Authentication System

> ⚠️ **This is a demonstration document** linked to [[example-feature-001-user-auth|FEAT-001: User Authentication System]].

## Overview

Test plan for authentication system covering happy paths, edge cases, and error scenarios.

**Related Feature**: [[example-feature-001-user-auth|FEAT-001: User Authentication System]]

## Test Scenarios

### 1. Happy Path - Successful Login

| Field | Value |
|-------|-------|
| **ID** | TEST-001-01 |
| **Description** | Valid credentials login |
| **Preconditions** | User exists with email: user@example.com, password: Password123! |
| **Steps** | 1. Navigate to login page<br>2. Enter valid email<br>3. Enter valid password<br>4. Click "Sign In" |
| **Expected Result** | User redirected to dashboard, session created |
| **Status** | 🟢 Pass |

### 2. Edge Case - Case Insensitive Email

| Field | Value |
|-------|-------|
| **ID** | TEST-001-02 |
| **Description** | Email should be case-insensitive |
| **Preconditions** | User registered with USER@EXAMPLE.COM |
| **Steps** | 1. Try login with user@example.com<br>2. Try login with USER@example.com |
| **Expected Result** | Both attempts succeed |
| **Status** | 🟢 Pass |

### 3. Error Case - Invalid Password

| Field | Value |
|-------|-------|
| **ID** | TEST-001-03 |
| **Description** | Wrong password should fail gracefully |
| **Preconditions** | User exists with valid credentials |
| **Steps** | 1. Enter valid email<br>2. Enter wrong password<br>3. Click "Sign In" |
| **Expected Result** | Error message: "Invalid credentials" (no password leak) |
| **Status** | 🟢 Pass |

### 4. Error Case - Non-existent User

| Field | Value |
|-------|-------|
| **ID** | TEST-001-04 |
| **Description** | Login with unregistered email |
| **Preconditions** | Email not in database |
| **Steps** | 1. Enter unregistered email<br>2. Enter any password<br>3. Click "Sign In" |
| **Expected Result** | Same error as wrong password (no user enumeration) |
| **Status** | 🟢 Pass |

## Test Data

| Data Set | Values |
|----------|--------|
| Valid user | email: user@example.com, password: Password123! |
| Invalid email | notanemail |
| Short password | 12345 |
| SQL injection | ' OR '1'='1 |

## Execution Log

| Date | Run By | Pass | Fail | Notes |
|------|--------|------|------|-------|
| 2026-02-14 | AI Agent | 4 | 0 | All scenarios passed |

---

*All tests passed! User guide created: [[example-guide-001-user-auth]]*