# Test Coverage Dashboard

## Overview

This section tracks test plans and their execution status for all features.

## Test Status Matrix

| Feature | Test Plan | Status | Last Run |
|---------|-----------|--------|----------|
| (No tests yet) | - | - | - |

## Coverage Stats

- **Total Features**: 0
- **With Test Plans**: 0
- **Tests Passing**: 0
- **Tests Failing**: 0

## All Test Plans

```dataview
TABLE feature_id, status, created
FROM "02-tests"
WHERE file.name != "_index"
SORT created DESC
```

---

## Template

Use the [Test Plan Template](../01-features/_templates/test-plan-template.md) when creating new test plans.