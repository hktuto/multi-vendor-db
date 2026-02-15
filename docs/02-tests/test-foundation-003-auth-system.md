---
test_id: TEST-003
feature_id: FEAT-003
status: completed
created: 2026-02-15
last_run: 2026-02-15
pass_rate: 100%
---

# Test Plan: Auth System

## Overview

Test plan for [[../00-foundation/003-auth-system|003: Auth System]].

## Test Scenarios

### 1. Happy Path - Email/Password Registration

| Field | Value |
|-------|-------|
| **ID** | TEST-003-01 |
| **Description** | User can register with email and password |
| **Preconditions** | Fresh database, no existing user |
| **Steps** | 1. Navigate to /register<br>2. Enter email: "test@example.com"<br>3. Enter password: "SecurePass123!"<br>4. Enter name: "Test User"<br>5. Click Register button |
| **Expected Result** | - User created in database<br>- User session set<br>- Redirected to /dashboard<br>- Toast: "Account created successfully" |
| **Status** | ✅ Pass |

### 2. Happy Path - Email/Password Login

| Field | Value |
|-------|-------|
| **ID** | TEST-003-02 |
| **Description** | User can login with valid credentials |
| **Preconditions** | User exists with email "test@example.com" and password "SecurePass123!" |
| **Steps** | 1. Navigate to /login<br>2. Enter email: "test@example.com"<br>3. Enter password: "SecurePass123!"<br>4. Click Login button |
| **Expected Result** | - Session created<br>- Redirected to /dashboard<br>- User data available via useUserSession() |
| **Status** | ✅ Pass |

### 3. Happy Path - OAuth Login (GitHub)

| Field | Value |
|-------|-------|
| **ID** | TEST-003-03 |
| **Description** | User can login with GitHub OAuth |
| **Preconditions** | GitHub OAuth app configured, user has GitHub account |
| **Steps** | 1. Navigate to /login<br>2. Click "Login with GitHub"<br>3. Authorize app on GitHub<br>4. Redirect back to app |
| **Expected Result** | - User account created/linked<br>- Session set<br>- Redirected to /dashboard |
| **Status** | ⏭️ Skipped (requires OAuth setup) |

### 4. Happy Path - OAuth Login (Google)

| Field | Value |
|-------|-------|
| **ID** | TEST-003-04 |
| **Description** | User can login with Google OAuth |
| **Preconditions** | Google OAuth app configured, user has Google account |
| **Steps** | 1. Navigate to /login<br>2. Click "Login with Google"<br>3. Select Google account<br>4. Redirect back to app |
| **Expected Result** | - User account created/linked<br>- Session set<br>- Redirected to /dashboard |
| **Status** | ⏭️ Skipped (requires OAuth setup) |

### 5. Happy Path - Logout

| Field | Value |
|-------|-------|
| **ID** | TEST-003-05 |
| **Description** | User can logout and session is cleared |
| **Preconditions** | User is logged in |
| **Steps** | 1. Click user menu in top nav<br>2. Click "Logout" |
| **Expected Result** | - Session cleared<br>- Redirected to /login<br>- useUserSession().loggedIn is false |
| **Status** | ✅ Pass |

### 6. Happy Path - Session Persistence

| Field | Value |
|-------|-------|
| **ID** | TEST-003-06 |
| **Description** | Session persists across page reloads |
| **Preconditions** | User is logged in |
| **Steps** | 1. Login successfully<br>2. Refresh the page<br>3. Check session status |
| **Expected Result** | - User remains logged in<br>- useUserSession().user data persists |
| **Status** | ✅ Pass |

### 7. Edge Case - Login with Wrong Password

| Field | Value |
|-------|-------|
| **ID** | TEST-003-07 |
| **Description** | Login fails with incorrect password |
| **Preconditions** | User exists with email "test@example.com" |
| **Steps** | 1. Navigate to /login<br>2. Enter email: "test@example.com"<br>3. Enter password: "WrongPassword123"<br>4. Click Login |
| **Expected Result** | - Error message: "Invalid email or password"<br>- No session created<br>- Stays on login page |
| **Status** | ✅ Pass |

### 8. Edge Case - Register with Existing Email

| Field | Value |
|-------|-------|
| **ID** | TEST-003-08 |
| **Description** | Registration fails if email already exists |
| **Preconditions** | User exists with email "test@example.com" |
| **Steps** | 1. Navigate to /register<br>2. Enter email: "test@example.com"<br>3. Fill other fields<br>4. Click Register |
| **Expected Result** | - Error message: "Email already registered"<br>- No new user created<br>- Stays on register page |
| **Status** | ✅ Pass |

### 9. Edge Case - OAuth Link to Existing Account

| Field | Value |
|-------|-------|
| **ID** | TEST-003-09 |
| **Description** | OAuth login links to existing email account |
| **Preconditions** | User exists with email matching OAuth account |
| **Steps** | 1. Login with OAuth (GitHub/Google)<br>2. Account has same email as existing user |
| **Expected Result** | - OAuth account linked to existing user<br>- Same user session<br>- User accounts table updated |
| **Status** | ⏭️ Skipped (requires OAuth setup) |

### 10. Error Case - Login with Non-existent Email

| Field | Value |
|-------|-------|
| **ID** | TEST-003-10 |
| **Description** | Login fails for non-existent user |
| **Preconditions** | No user with email "notfound@example.com" |
| **Steps** | 1. Navigate to /login<br>2. Enter email: "notfound@example.com"<br>3. Enter any password<br>4. Click Login |
| **Expected Result** | - Error message: "Invalid email or password" (same as wrong password)<br>- No session created |
| **Status** | ✅ Pass |

### 11. Error Case - Invalid Email Format

| Field | Value |
|-------|-------|
| **ID** | TEST-003-11 |
| **Description** | Registration validates email format |
| **Preconditions** | On registration page |
| **Steps** | 1. Enter email: "not-an-email"<br>2. Fill other fields<br>3. Click Register |
| **Expected Result** | - Validation error: "Please enter a valid email"<br>- Form not submitted |
| **Status** | ✅ Pass |

### 12. Error Case - Weak Password

| Field | Value |
|-------|-------|
| **ID** | TEST-003-12 |
| **Description** | Registration requires strong password |
| **Preconditions** | On registration page |
| **Steps** | 1. Enter email: "test@example.com"<br>2. Enter password: "123"<br>3. Click Register |
| **Expected Result** | - Validation error: "Password must be at least 8 characters"<br>- Form not submitted |
| **Status** | ✅ Pass |

### 13. Error Case - Auth Middleware Redirects

| Field | Value |
|-------|-------|
| **ID** | TEST-003-13 |
| **Description** | Auth middleware redirects unauthenticated users |
| **Preconditions** | User is not logged in |
| **Steps** | 1. Navigate to /dashboard (protected route) |
| **Expected Result** | - Redirected to /login<br>- Original URL saved for redirect after login |
| **Status** | ✅ Pass |

### 14. Error Case - Guest Redirect

| Field | Value |
|-------|-------|
| **ID** | TEST-003-14 |
| **Description** | Logged-in users redirected from auth pages |
| **Preconditions** | User is logged in |
| **Steps** | 1. Navigate to /login or /register |
| **Expected Result** | - Redirected to /dashboard<br>- Already logged in users can't see login page |
| **Status** | ✅ Pass |

## Test Data

| Data Set | Values |
|----------|--------|
| Valid email | test@example.com, user@domain.org |
| Invalid email | not-an-email, @nodomain.com, spaces in@email.com |
| Valid password | SecurePass123!, MyP@ssw0rd, LongPassword123! |
| Weak password | 123, abc, short, noNumbers! |
| Test user | email: testuser@example.com, password: TestPass123!, name: "Test User" |

## Execution Log

| Date | Run By | Pass | Fail | Notes |
|------|--------|------|------|-------|
| 2026-02-15 | Agent | 11 | 0 | 3 skipped (OAuth) |

---

*Status Legend: ⬜ Not Tested | 🟡 Partial | 🟢 Pass | 🔴 Fail*
