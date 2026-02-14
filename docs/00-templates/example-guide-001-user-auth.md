---
guide_id: GUIDE-001
feature_id: FEAT-001
version: 1.0.0
created: 2026-02-14
last_updated: 2026-02-14
---

# [DEMO] User Guide: How to Login

> ⚠️ **This is a demonstration document** for [[example-feature-001-user-auth|FEAT-001: User Authentication System]].

## Overview

This guide walks you through logging into the system step by step.

**Related Feature**: [[example-feature-FEAT-001|FEAT-001: User Authentication System]]

**Target Audience**: End users
**Prerequisites**: You must have a registered account

---

## Step-by-Step Instructions

### Step 1: Navigate to Login Page

1. Open your web browser
2. Go to `https://app.example.com/login`
3. You should see the login form

![Step 1: Login Page](screenshots/login-step-01.png)
*Screenshot: Login page with email and password fields*

### Step 2: Enter Your Email

1. Click on the "Email" field
2. Type your registered email address
3. The email is not case-sensitive

![Step 2: Enter Email](screenshots/login-step-02.png)
*Screenshot: Email field filled in*

### Step 3: Enter Your Password

1. Click on the "Password" field
2. Type your password (characters will be hidden)
3. If you forgot your password, click "Forgot Password?"

![Step 3: Enter Password](screenshots/login-step-03.png)
*Screenshot: Password field with masked characters*

### Step 4: Sign In

1. Click the blue "Sign In" button
2. If credentials are correct, you'll be redirected to the dashboard
3. If there's an error, see Troubleshooting below

![Step 4: Click Sign In](screenshots/login-step-04.png)
*Screenshot: Dashboard after successful login*

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Invalid credentials" error | Double-check email and password. Try resetting password if forgotten. |
| Page won't load | Check your internet connection and try again |
| Session expired message | Your session timed out. Simply log in again. |

## FAQ

**Q: Can I stay logged in?**
A: Yes, check "Remember me" before signing in. Sessions last 30 days.

**Q: Is my password secure?**
A: Yes, passwords are encrypted and never stored in plain text.

**Q: Can I change my email?**
A: Yes, go to Settings > Account after logging in.

---

*This guide was created after successful testing. See test results: [[example-test-001-user-auth]]*