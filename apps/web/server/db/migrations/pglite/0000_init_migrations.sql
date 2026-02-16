-- Migration tracking table for PGlite
-- This tracks which migrations have been applied locally

CREATE TABLE IF NOT EXISTS pglite_migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    migration_name TEXT NOT NULL UNIQUE,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    checksum TEXT,
    success BOOLEAN DEFAULT TRUE
);

-- Index for quick lookup
CREATE INDEX IF NOT EXISTS idx_pglite_migrations_name ON pglite_migrations(migration_name);
