import { db, schema } from "@nuxthub/db";
import { desc, eq } from "drizzle-orm";

/**
 * PGlite Migrations Metadata
 * These define the order and checksum of migrations for client-side PGlite
 */
const PGLITE_MIGRATIONS = [
  {
    name: "0000_init_migrations",
    description: "Initialize migration tracking table",
    checksum: "sha256:init",
  },
  {
    name: "0001_initial_schema", 
    description: "Initial schema: users, companies, members, groups, invites",
    checksum: "sha256:initial_v1",
  },
  {
    name: "0002_spaces_and_items",
    description: "Replace workspaces/folders with unified spaces schema",
    checksum: "sha256:spaces_v1",
  },
];

/**
 * Migration SQL content (embedded in API for security)
 */
const MIGRATION_SQL: Record<string, string> = {
  "0000_init_migrations": `
    CREATE TABLE IF NOT EXISTS pglite_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      migration_name TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      checksum TEXT,
      success BOOLEAN DEFAULT TRUE
    );
    CREATE INDEX IF NOT EXISTS idx_pglite_migrations_name ON pglite_migrations(migration_name);
  `,
  
  "0001_initial_schema": `
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
    
    CREATE TABLE IF NOT EXISTS company_members (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      joined_at TEXT NOT NULL,
      invited_by TEXT,
      UNIQUE(company_id, user_id)
    );
    
    CREATE TABLE IF NOT EXISTS user_groups (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    
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
  `,
  
  "0002_spaces_and_items": `
    DROP TABLE IF EXISTS folders;
    DROP TABLE IF EXISTS workspaces;
    
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
    
    CREATE TABLE IF NOT EXISTS space_members (
      id TEXT PRIMARY KEY,
      space_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      joined_at TEXT NOT NULL,
      invited_by TEXT,
      UNIQUE(space_id, user_id)
    );
    
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
    
    CREATE TABLE IF NOT EXISTS space_item_permissions (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      permission TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(item_id, user_id)
    );
  `,
};

/**
 * GET /api/pglite/migrations
 * Returns list of available migrations for PGlite client
 */
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event);

  if (!session.user?.id) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  return {
    migrations: PGLITE_MIGRATIONS,
    currentVersion: "0002_spaces_and_items",
    totalCount: PGLITE_MIGRATIONS.length,
  };
});

/**
 * GET /api/pglite/migrations/:name
 * Returns specific migration SQL content
 */
export async function getMigrationByName(name: string): Promise<{ sql: string; metadata: any } | null> {
  const sql = MIGRATION_SQL[name];
  if (!sql) return null;
  
  const metadata = PGLITE_MIGRATIONS.find(m => m.name === name);
  return { sql, metadata };
}
