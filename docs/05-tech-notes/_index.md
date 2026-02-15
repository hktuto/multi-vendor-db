# Tech Notes Index

Technical deep-dive documents for complex features.

## Naming Convention

`{feature-prefix}-{ID}-{topic}.md`

Examples:
- `db-002-sql-migration.md` - Database schema SQL
- `db-002-data-models.md` - TypeScript interfaces
- `auth-004-oauth-flow.md` - Authentication flow

## Purpose

- Keep feature documents under 5k tokens
- Store detailed SQL, algorithms, architecture
- Reference from feature frontmatter `tech_notes` array

## Documents

```dataview
TABLE file.mtime as "Modified"
FROM "05-tech-notes"
WHERE file.name != "_index"
SORT file.name ASC
```
