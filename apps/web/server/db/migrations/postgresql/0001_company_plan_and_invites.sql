-- Migration: Add company plan and update invites schema
-- Created: 2026-02-16

-- 1. Add plan column to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS plan VARCHAR(24) NOT NULL DEFAULT 'basic';

-- 2. Create new invites table (replaces invite_links)
CREATE TABLE IF NOT EXISTS invites (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    invited_by UUID NOT NULL REFERENCES users(id),
    token VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'member')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,
    accepted_by UUID REFERENCES users(id),
    UNIQUE(company_id, email)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_invites_company_id ON invites(company_id);
CREATE INDEX IF NOT EXISTS idx_invites_status ON invites(status);
CREATE INDEX IF NOT EXISTS idx_invites_token ON invites(token);

-- 3. Migrate data from invite_links to invites (if exists)
-- Note: This is a one-way migration. Old invite_links data will be preserved.

-- 4. Add comment
COMMENT ON TABLE invites IS 'One invite per person - replaces invite_links';
COMMENT ON COLUMN companies.plan IS 'SaaS plan: basic, pro, enterprise';
