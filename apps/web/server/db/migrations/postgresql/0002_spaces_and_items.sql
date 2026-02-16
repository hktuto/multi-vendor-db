-- Migration: Replace workspaces/folders with spaces/space_items unified design
-- Created: 2026-02-16

-- 1. Create new spaces table
CREATE TABLE IF NOT EXISTS spaces (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(7),
    settings JSONB NOT NULL DEFAULT '{}',
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_spaces_company_id ON spaces(company_id);

-- 2. Create space_members table
CREATE TABLE IF NOT EXISTS space_members (
    id UUID PRIMARY KEY,
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    invited_by UUID REFERENCES users(id),
    UNIQUE(space_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_space_members_space_id ON space_members(space_id);
CREATE INDEX IF NOT EXISTS idx_space_members_user_id ON space_members(user_id);

-- 3. Create unified space_items table
CREATE TABLE IF NOT EXISTS space_items (
    id UUID PRIMARY KEY,
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES space_items(id),
    type VARCHAR(50) NOT NULL CHECK (type IN ('folder', 'table', 'view', 'dashboard')),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(7),
    order_index INTEGER NOT NULL DEFAULT 0,
    config JSONB NOT NULL DEFAULT '{}',
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(space_id, parent_id, name)
);

CREATE INDEX IF NOT EXISTS idx_space_items_space_id ON space_items(space_id);
CREATE INDEX IF NOT EXISTS idx_space_items_parent_id ON space_items(parent_id);
CREATE INDEX IF NOT EXISTS idx_space_items_type ON space_items(type);

-- 4. Create space_item_permissions table
CREATE TABLE IF NOT EXISTS space_item_permissions (
    id UUID PRIMARY KEY,
    item_id UUID NOT NULL REFERENCES space_items(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission VARCHAR(20) NOT NULL CHECK (permission IN ('read', 'readwrite', 'manage')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE(item_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_space_item_permissions_item_id ON space_item_permissions(item_id);
CREATE INDEX IF NOT EXISTS idx_space_item_permissions_user_id ON space_item_permissions(user_id);

-- 5. Note: Old workspaces and folders tables are kept for data migration reference
-- They can be dropped after data migration is complete
-- DROP TABLE IF EXISTS folders;
-- DROP TABLE IF EXISTS workspaces;

-- Add comments
COMMENT ON TABLE spaces IS 'Spaces (formerly workspaces) within a company';
COMMENT ON TABLE space_members IS 'Membership and roles within a space';
COMMENT ON TABLE space_items IS 'Unified items: folders, tables, views, dashboards';
COMMENT ON TABLE space_item_permissions IS 'Fine-grained permissions for specific items';
