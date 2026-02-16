-- PGlite Migration: Initial schema for synced tables
-- Applied: when setting up new PGlite database

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    avatar_url TEXT,
    preferences JSONB DEFAULT '{}',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    last_login_at TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    owner_id TEXT NOT NULL,
    plan TEXT NOT NULL DEFAULT 'basic',
    settings JSONB DEFAULT '{"timezone":"UTC","dateFormat":"YYYY-MM-DD","defaultLanguage":"en","theme":{}}',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
);

-- Company members
CREATE TABLE IF NOT EXISTS company_members (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    joined_at TEXT NOT NULL,
    invited_by TEXT,
    UNIQUE(company_id, user_id)
);

-- User groups
CREATE TABLE IF NOT EXISTS user_groups (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- User group members
CREATE TABLE IF NOT EXISTS user_group_members (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    group_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    added_by TEXT NOT NULL,
    added_at TEXT NOT NULL,
    UNIQUE(group_id, user_id)
);

-- Invite links
CREATE TABLE IF NOT EXISTS invite_links (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    created_by TEXT NOT NULL,
    email TEXT,
    token TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL,
    expires_at TEXT,
    created_at TEXT NOT NULL,
    used_at TEXT,
    used_by TEXT,
    is_active BOOLEAN DEFAULT TRUE
);
