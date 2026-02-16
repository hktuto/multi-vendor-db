-- PGlite Migration: Replace workspaces with spaces
-- This migration removes old tables and creates new unified space schema

-- Drop old tables if they exist (from previous schema)
DROP TABLE IF EXISTS folders;
DROP TABLE IF EXISTS workspaces;

-- Spaces table (replaces workspaces)
CREATE TABLE IF NOT EXISTS spaces (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    color TEXT,
    settings JSONB DEFAULT '{}',
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
);

-- Space members
CREATE TABLE IF NOT EXISTS space_members (
    id TEXT PRIMARY KEY,
    space_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL,
    joined_at TEXT NOT NULL,
    invited_by TEXT,
    UNIQUE(space_id, user_id)
);

-- Space items (unified: folder/table/view/dashboard)
CREATE TABLE IF NOT EXISTS space_items (
    id TEXT PRIMARY KEY,
    space_id TEXT NOT NULL,
    parent_id TEXT,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    color TEXT,
    order_index INTEGER DEFAULT 0,
    config JSONB DEFAULT '{}',
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
);

-- Space item permissions
CREATE TABLE IF NOT EXISTS space_item_permissions (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    permission TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(item_id, user_id)
);
