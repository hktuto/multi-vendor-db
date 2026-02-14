# Templates & Examples

This folder contains reusable templates and demonstrates how documents link together in this vault.

## Templates

| Template | Use For | Link |
|----------|---------|------|
| Feature Template | New feature documentation | [[feature-template]] |
| Test Plan Template | Test planning per feature | [[test-plan-template]] |
| User Guide Template | Client-facing documentation | [[user-guide-template]] |
| Journal Template | Daily work logs | [[journal-template]] |

## Demo: How Documents Link

See the complete example showing how a feature, its test plan, and user guide connect:

### The Chain

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Feature Doc    │ ──► │   Test Plan     │ ──► │   User Guide    │
│   (FEAT-001)    │     │   (TEST-001)    │     │  (GUIDE-001)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Example Documents

1. **Example Feature**: [[example-feature-001-user-auth|Demo: Authentication System]]
   - Shows how to write requirements, tasks, and track progress
   - Links to its test plan via `test_plan:` frontmatter
   - Links to future user guide via `user_guide:` frontmatter

2. **Example Test Plan**: [[example-test-001-user-auth|Demo: Test Plan for Auth]]
   - Shows test scenarios with status tracking
   - Links back to feature via `feature_id:` frontmatter
   - Execution log format

3. **Example User Guide**: [[example-guide-001-user-auth|Demo: How to Login]]
   - Shows step-by-step with placeholder screenshots
   - Links to feature via `feature_id:` frontmatter
   - Troubleshooting and FAQ format

---

## Quick Links

- [[../01-features/_index|Go to Features]]
- [[../02-tests/_index|Go to Tests]]
- [[../04-user-guides/_index|Go to User Guides]]