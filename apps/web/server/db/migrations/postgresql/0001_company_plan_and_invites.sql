-- Migration: Add company plan and update invites schema
-- Created: 2026-02-16

-- 1. Add plan column to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS plan VARCHAR(24) NOT NULL DEFAULT 'basic';

-- 2. Update invite_links table - add email, remove maxUses/usedCount
-- First add new columns
ALTER TABLE invite_links ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- Add unique constraint on company_id + email (for one invite per person)
-- Note: This will fail if there are duplicate emails, handle manually if needed
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_invite_links_company_email ON invite_links(company_id, email) WHERE email IS NOT NULL;

-- 3. Remove unused columns (optional - keep for backwards compatibility or drop)
-- ALTER TABLE invite_links DROP COLUMN IF EXISTS max_uses;
-- ALTER TABLE invite_links DROP COLUMN IF EXISTS used_count;

-- 4. Add comment
COMMENT ON COLUMN companies.plan IS 'SaaS plan: basic, pro, enterprise';
COMMENT ON COLUMN invite_links.email IS 'Email of invited person (one invite per email per company)';
