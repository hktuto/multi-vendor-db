-- Migration: Remove all foreign key constraints for Electric SQL compatibility
-- Electric SQL sync order is not guaranteed, so FK constraints cause errors
-- Data integrity will be enforced at application layer

-- Drop FK constraints from company_members
ALTER TABLE "company_members" DROP CONSTRAINT IF EXISTS "company_members_company_id_companies_id_fk";
ALTER TABLE "company_members" DROP CONSTRAINT IF EXISTS "company_members_user_id_users_id_fk";
ALTER TABLE "company_members" DROP CONSTRAINT IF EXISTS "company_members_invited_by_users_id_fk";

-- Drop FK constraints from invite_links
ALTER TABLE "invite_links" DROP CONSTRAINT IF EXISTS "invite_links_company_id_companies_id_fk";
ALTER TABLE "invite_links" DROP CONSTRAINT IF EXISTS "invite_links_created_by_users_id_fk";
ALTER TABLE "invite_links" DROP CONSTRAINT IF EXISTS "invite_links_used_by_users_id_fk";

-- Drop FK constraints from spaces
ALTER TABLE "spaces" DROP CONSTRAINT IF EXISTS "spaces_company_id_companies_id_fk";
ALTER TABLE "spaces" DROP CONSTRAINT IF EXISTS "spaces_created_by_users_id_fk";

-- Drop FK constraints from space_members
ALTER TABLE "space_members" DROP CONSTRAINT IF EXISTS "space_members_space_id_spaces_id_fk";
ALTER TABLE "space_members" DROP CONSTRAINT IF EXISTS "space_members_user_id_users_id_fk";
ALTER TABLE "space_members" DROP CONSTRAINT IF EXISTS "space_members_invited_by_users_id_fk";

-- Drop FK constraints from space_items
ALTER TABLE "space_items" DROP CONSTRAINT IF EXISTS "space_items_space_id_spaces_id_fk";
ALTER TABLE "space_items" DROP CONSTRAINT IF EXISTS "space_items_parent_id_space_items_id_fk";
ALTER TABLE "space_items" DROP CONSTRAINT IF EXISTS "space_items_created_by_users_id_fk";

-- Drop FK constraints from space_item_permissions
ALTER TABLE "space_item_permissions" DROP CONSTRAINT IF EXISTS "space_item_permissions_item_id_space_items_id_fk";
ALTER TABLE "space_item_permissions" DROP CONSTRAINT IF EXISTS "space_item_permissions_user_id_users_id_fk";

-- Drop FK constraints from user_groups
ALTER TABLE "user_groups" DROP CONSTRAINT IF EXISTS "user_groups_company_id_companies_id_fk";
ALTER TABLE "user_groups" DROP CONSTRAINT IF EXISTS "user_groups_created_by_users_id_fk";

-- Drop FK constraints from user_group_members
ALTER TABLE "user_group_members" DROP CONSTRAINT IF EXISTS "user_group_members_company_id_companies_id_fk";
ALTER TABLE "user_group_members" DROP CONSTRAINT IF EXISTS "user_group_members_group_id_user_groups_id_fk";
ALTER TABLE "user_group_members" DROP CONSTRAINT IF EXISTS "user_group_members_user_id_users_id_fk";
ALTER TABLE "user_group_members" DROP CONSTRAINT IF EXISTS "user_group_members_added_by_users_id_fk";

-- Drop FK constraints from user_accounts
ALTER TABLE "user_accounts" DROP CONSTRAINT IF EXISTS "user_accounts_user_id_users_id_fk";

-- Drop FK constraints from companies
ALTER TABLE "companies" DROP CONSTRAINT IF EXISTS "companies_owner_id_users_id_fk";

-- Create indexes to replace FK performance benefits
CREATE INDEX IF NOT EXISTS "idx_company_members_company_id" ON "company_members"("company_id");
CREATE INDEX IF NOT EXISTS "idx_company_members_user_id" ON "company_members"("user_id");
CREATE INDEX IF NOT EXISTS "idx_invite_links_company_id" ON "invite_links"("company_id");
CREATE INDEX IF NOT EXISTS "idx_spaces_company_id" ON "spaces"("company_id");
CREATE INDEX IF NOT EXISTS "idx_space_members_space_id" ON "space_members"("space_id");
CREATE INDEX IF NOT EXISTS "idx_space_members_user_id" ON "space_members"("user_id");
CREATE INDEX IF NOT EXISTS "idx_space_items_space_id" ON "space_items"("space_id");
CREATE INDEX IF NOT EXISTS "idx_space_items_parent_id" ON "space_items"("parent_id");
CREATE INDEX IF NOT EXISTS "idx_space_item_permissions_item_id" ON "space_item_permissions"("item_id");
CREATE INDEX IF NOT EXISTS "idx_user_groups_company_id" ON "user_groups"("company_id");
CREATE INDEX IF NOT EXISTS "idx_user_group_members_company_id" ON "user_group_members"("company_id");
CREATE INDEX IF NOT EXISTS "idx_user_group_members_group_id" ON "user_group_members"("group_id");
CREATE INDEX IF NOT EXISTS "idx_user_accounts_user_id" ON "user_accounts"("user_id");
CREATE INDEX IF NOT EXISTS "idx_companies_owner_id" ON "companies"("owner_id");