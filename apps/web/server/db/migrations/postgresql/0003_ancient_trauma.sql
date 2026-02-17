CREATE TABLE "space_item_columns" (
	"id" uuid PRIMARY KEY NOT NULL,
	"item_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"key" varchar(255) NOT NULL,
	"category" varchar(20) NOT NULL,
	"type" varchar(50) NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"default_value" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "unique_item_column_key" UNIQUE("item_id","key")
);
--> statement-breakpoint
CREATE TABLE "space_item_rows" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"space_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone,
	"deleted_by" uuid,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "companies" DROP CONSTRAINT "companies_owner_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "company_members" DROP CONSTRAINT "company_members_company_id_companies_id_fk";
--> statement-breakpoint
ALTER TABLE "company_members" DROP CONSTRAINT "company_members_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "company_members" DROP CONSTRAINT "company_members_invited_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "invite_links" DROP CONSTRAINT "invite_links_company_id_companies_id_fk";
--> statement-breakpoint
ALTER TABLE "invite_links" DROP CONSTRAINT "invite_links_created_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "invite_links" DROP CONSTRAINT "invite_links_used_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "space_item_permissions" DROP CONSTRAINT "space_item_permissions_item_id_space_items_id_fk";
--> statement-breakpoint
ALTER TABLE "space_item_permissions" DROP CONSTRAINT "space_item_permissions_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "space_items" DROP CONSTRAINT "space_items_space_id_spaces_id_fk";
--> statement-breakpoint
ALTER TABLE "space_items" DROP CONSTRAINT "space_items_parent_id_space_items_id_fk";
--> statement-breakpoint
ALTER TABLE "space_items" DROP CONSTRAINT "space_items_created_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "space_members" DROP CONSTRAINT "space_members_space_id_spaces_id_fk";
--> statement-breakpoint
ALTER TABLE "space_members" DROP CONSTRAINT "space_members_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "space_members" DROP CONSTRAINT "space_members_invited_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "spaces" DROP CONSTRAINT "spaces_company_id_companies_id_fk";
--> statement-breakpoint
ALTER TABLE "spaces" DROP CONSTRAINT "spaces_created_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "user_accounts" DROP CONSTRAINT "user_accounts_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "user_group_members" DROP CONSTRAINT "user_group_members_company_id_companies_id_fk";
--> statement-breakpoint
ALTER TABLE "user_group_members" DROP CONSTRAINT "user_group_members_group_id_user_groups_id_fk";
--> statement-breakpoint
ALTER TABLE "user_group_members" DROP CONSTRAINT "user_group_members_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "user_group_members" DROP CONSTRAINT "user_group_members_added_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "user_groups" DROP CONSTRAINT "user_groups_company_id_companies_id_fk";
--> statement-breakpoint
ALTER TABLE "user_groups" DROP CONSTRAINT "user_groups_created_by_users_id_fk";
