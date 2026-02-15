// Database types shared between server and client
// Auto-imported by Nuxt in both server and Vue contexts

import {
  users,
  userAccounts,
  companies,
  companyMembers,
  userGroups,
  userGroupMembers,
  inviteLinks,
  workspaces,
  folders
} from '@nuxthub/db/schema'

// ============================================
// USER & AUTH
// ============================================

/** User profile (public view - no sensitive data) */
export type User = typeof users.$inferSelect
/** User with all fields */
export type UserPrivate = typeof users.$inferSelect
/** Creating a new user */
export type NewUser = typeof users.$inferInsert

/** User account (auth method) */
export type UserAccount = typeof userAccounts.$inferSelect
export type NewUserAccount = typeof userAccounts.$inferInsert

// ============================================
// COMPANY
// ============================================

/** Company/Tenant */
export type Company = typeof companies.$inferSelect
export type NewCompany = typeof companies.$inferInsert

/** Company membership */
export type CompanyMember = typeof companyMembers.$inferSelect
export type NewCompanyMember = typeof companyMembers.$inferInsert

/** User group within company */
export type UserGroup = typeof userGroups.$inferSelect
export type NewUserGroup = typeof userGroups.$inferInsert

/** Group membership - includes companyId for easy querying and sync */
export type UserGroupMember = typeof userGroupMembers.$inferSelect
export type NewUserGroupMember = typeof userGroupMembers.$inferInsert

/** Invite link */
export type InviteLink = typeof inviteLinks.$inferSelect
export type NewInviteLink = typeof inviteLinks.$inferInsert

// ============================================
// WORKSPACE
// ============================================

/** Menu item in workspace navigation */
export interface MenuItem {
  id: string
  type: 'folder' | 'table' | 'view' | 'dashboard'
  itemId: string
  order: number
  children?: MenuItem[]
  permissions: {
    read: string[]
    readwrite: string[]
    manage: string[]
  }
}

/** Workspace */
export type Workspace = typeof workspaces.$inferSelect
export type NewWorkspace = typeof workspaces.$inferInsert

/** Workspace with parsed menu */
export interface WorkspaceWithMenu extends Omit<Workspace, 'menu'> {
  menu: MenuItem[]
}

// ============================================
// FOLDER
// ============================================

/** Folder */
export type Folder = typeof folders.$inferSelect
export type NewFolder = typeof folders.$inferInsert

/** Folders are flat - hierarchy is defined in workspace.menu JSONB */
export interface FolderWithChildren extends Folder {
  children?: Folder[] // Populated from menu structure, not DB relation
}

// ============================================
// API RESPONSE TYPES
// ============================================

/** Public user (safe for client) */
export type PublicUser = Omit<User, 'preferences'> & {
  preferences?: {
    theme?: string
    language?: string
  }
}

/** Company with member count */
export interface CompanyWithStats extends Company {
  memberCount: number
  workspaceCount: number
}

/** Workspace summary (for lists) */
export interface WorkspaceSummary {
  id: string
  name: string
  icon?: string
  color?: string
  folderCount: number
}

// ============================================
// FORM TYPES
// ============================================

/** User creation form */
export type UserForm = Pick<NewUser, 'email' | 'name' | 'avatarUrl'>

/** Company creation form */
export type CompanyForm = Pick<NewCompany, 'name' | 'slug'>

/** Workspace creation form */
export type WorkspaceForm = Pick<NewWorkspace, 'name' | 'description' | 'icon' | 'color'>

/** Folder creation form */
export type FolderForm = Pick<NewFolder, 'name' | 'icon' | 'color'>
// Note: parentId removed - hierarchy is in workspace.menu JSONB

// ============================================
// ROLE TYPES
// ============================================

/** Company/Group role */
export type MemberRole = 'admin' | 'member'

/** Permission level */
export type PermissionLevel = 'read' | 'readwrite' | 'manage'

// ============================================
// SETTINGS TYPES
// ============================================

/** Company settings */
export interface CompanySettings {
  timezone: string
  dateFormat: string
  defaultLanguage: string
  theme: {
    primary?: string
    sidebar?: string
    [key: string]: any
  }
}

/** User preferences */
export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system'
  language?: string
  [key: string]: any
}
