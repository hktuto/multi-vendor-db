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
CREATE INDEX "idx_space_item_columns_item" ON "space_item_columns"("item_id");--> statement-breakpoint
CREATE INDEX "idx_space_item_rows_company" ON "space_item_rows"("company_id");--> statement-breakpoint
CREATE INDEX "idx_space_item_rows_item" ON "space_item_rows"("item_id");--> statement-breakpoint
CREATE INDEX "idx_space_item_rows_space" ON "space_item_rows"("space_id");