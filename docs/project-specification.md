---
document_type: project_spec
created: 2026-02-14
updated: 2026-02-14
---

# Project Specification: Dynamic Multi-Vendor Database Tool

## Overview

A **local-first, multi-tenant SaaS platform** for building dynamic database applications. Think "Airtable/Notion databases" with enterprise features like workspaces, views, dashboards, granular permissions, and automation.

## Target Users

- Small to medium businesses needing custom database solutions
- Teams requiring collaborative data management
- Companies wanting to build internal tools without coding

## Core Concepts

### Company (Tenant)
- Users create companies (multi-tenant isolation)
- **Roles**: Company Admin, User
- User Groups for organizing team members
- **Invite System**: Link-based invitations (no email/SMS in Phase 1)

### Workspace
The main container for data and visualization:
- **Tables** - Database tables with custom schemas
- **Views** - Filtered/sorted data with different visualizations
- **Dashboards** - Widget-based analytical pages
- **Folders** - Organization and permission grouping

### Views (Data Visualization)
Multiple ways to see the same data:
- Table view
- Grouped table view
- Pivot table
- Gantt chart
- Calendar
- Kanban board
- Gallery

### Permission System
Granular access control:
- **Levels**: Read, ReadWrite, Manage
- **Scope**: Applied to Folders, Tables, Views, Dashboards
- **Row-level**: Predefined query-based filtering per user/user group
- **Public Sharing**: Tables, Views, and Dashboards can be shared publicly via links

### Real-time Collaboration
Multi-user editing with conflict prevention:
- **Presence**: See who is currently editing
- **Cell Locking**: Prevent concurrent edits on same cell
- **Live Cursors**: Visual indicator of other users' positions
- **Workflow Integration**: Cell locks respected by automation workflows

### Automation (Workflows)
Event-driven automation:
- **Triggers**: Data changes, manual, cron schedule, webhooks
- **Actions**: Customizable workflow actions
- **Cell Lock Awareness**: Workflows respect cell locks during execution

### Local-First Architecture
- Client-side PGlite database
- Electric SQL for real-time sync
- Works offline, syncs when connected

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Nuxt 4 |
| Backend | Nuxt 4 (full-stack) |
| Database | PGlite (dev/test), PostgreSQL (prod) |
| Database Hosting | Nuxt Hub |
| UI Components | Nuxt UI |
| Data Sync | Electric SQL |
| Client DB | PGlite |
| File Storage | Nuxt Hub Blob |

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **User Invitations** | Link-based | No email/SMS service needed in Phase 1 |
| **File Storage** | Nuxt Hub Blob | Provider-agnostic, easy to switch later |
| **Formulas (Phase 1)** | Simple operators | Excel-like formulas in future phase |
| **Public Sharing** | Yes | Tables, Views, Dashboards shareable via links |

---

## Phase Plan

### Phase 1: MVP (5 weeks, 17 features)

**Goal**: Core platform with multi-tenant support, dynamic tables, collaboration, and deployment

| Sprint | Duration | Features | Epic | Goal |
|--------|----------|----------|------|------|
| **Sprint 1** | Week 1 | F001-F005 | Foundation | Auth, companies, invites working |
| **Sprint 2** | Week 2 | F006-F008, F038 | Core Data | Dynamic tables, CRUD, files |
| **Sprint 3** | Week 3 | F011-F014 | Views | Table view, filters, folders |
| **Sprint 4** | Week 4 | F042-F044, F016 | Collaboration | Cell locking, Kanban |
| **Sprint 5** | Week 5 | F041, F040 | Polish | Public sharing, deployment |

**MVP Success Criteria**:
1. User can sign up, create company, invite via links
2. Admin can create tables, add columns, upload files
3. Users can view data in Table and Kanban views
4. Users can filter and sort data
5. Multiple users can edit simultaneously with cell locking
6. Tables/views can be shared publicly
7. System deployed to production

### Phase 2: Enhanced Views (TBD)
- Additional view types (Calendar, Gallery, Gantt, Pivot)
- Relations between tables
- Advanced formulas
- Dashboards

### Phase 3: Enterprise Features (TBD)
- Advanced permissions (user groups, row-level security)
- Automation workflows
- Import/Export, Audit Log

---

## Feature Breakdown

### EPIC 1: Foundation
| ID | Feature | Priority | Phase | Sprint | Description |
|----|---------|----------|-------|--------|-------------|
| F001 | Project Setup | 🔴 Critical | 1 | 1 | Nuxt 4 monorepo, linting, testing setup |
| F002 | Database Schema | 🔴 Critical | 1 | 1 | Core tables, multi-tenant schema design |
| F003 | Electric SQL Integration | 🔴 Critical | 1 | 1 | Sync setup, PGlite client integration |
| F004 | Auth System | 🔴 Critical | 1 | 1 | Login, signup, session management |
| F005 | Company Management | 🔴 Critical | 1 | 1 | Create company, invite users via links |

### EPIC 2: Core Data Layer
| ID | Feature | Priority | Phase | Sprint | Description |
|----|---------|----------|-------|--------|-------------|
| F006 | Dynamic Tables | 🔴 Critical | 1 | 2 | Create tables, define columns, data types |
| F007 | CRUD Operations | 🔴 Critical | 1 | 2 | Create, read, update, delete records |
| F008 | Data Types | 🟠 High | 1 | 2 | Text, number, date, select, relation, formula (simple) |
| F009 | Relations | 🟠 High | 2 | TBD | Link tables, lookup fields |
| F010 | Formulas | 🟡 Medium | 2 | TBD | Simple operators only (Phase 1) |
| F038 | File Attachments | 🟠 High | 1 | 2 | Upload and store files via Nuxt Hub Blob |

### EPIC 3: Workspace & Views
| ID | Feature | Priority | Phase | Sprint | Description |
|----|---------|----------|-------|--------|-------------|
| F011 | Workspace Management | 🔴 Critical | 1 | 3 | Create workspaces, organize items |
| F012 | Folder System | 🔴 Critical | 1 | 3 | Group tables/views/dashboards |
| F013 | Table View | 🔴 Critical | 1 | 3 | Basic grid view of data |
| F014 | Filters & Sorting | 🔴 Critical | 1 | 3 | Filter and sort data |
| F015 | Grouped Table View | 🟠 High | 2 | TBD | Group by column values |
| F016 | Kanban View | 🟠 High | 1 | 4 | Card-based view with status columns |
| F017 | Calendar View | 🟠 High | 2 | TBD | Date-based visualization |
| F018 | Gallery View | 🟠 High | 2 | TBD | Card gallery with images |
| F019 | Gantt View | 🟡 Medium | 2 | TBD | Timeline/project view |
| F020 | Pivot Table | 🟡 Medium | 2 | TBD | Cross-tabulation analysis |

### EPIC 4: Dashboards
| ID | Feature | Priority | Phase | Sprint | Description |
|----|---------|----------|-------|--------|-------------|
| F021 | Dashboard Builder | 🟠 High | 2 | TBD | Create dashboards, layout management |
| F022 | Chart Widgets | 🟠 High | 2 | TBD | Bar, line, pie charts |
| F023 | Table Widget | 🟠 High | 2 | TBD | Embed table view |
| F024 | Metric Widget | 🟠 High | 2 | TBD | Single number displays |
| F025 | List Widget | 🟡 Medium | 2 | TBD | Record lists with filters |

### EPIC 5: Permissions
| ID | Feature | Priority | Phase | Sprint | Description |
|----|---------|----------|-------|--------|-------------|
| F026 | User Groups | 🟠 High | 3 | TBD | Create groups, assign users |
| F027 | Item Permissions | 🟠 High | 3 | TBD | Read/ReadWrite/Manage on items |
| F028 | Row-Level Security | 🟠 High | 3 | TBD | Query-based row filtering |
| F029 | Permission UI | 🟠 High | 3 | TBD | Visual permission management |
| F041 | Public Sharing | 🟠 High | 1 | 5 | Share tables/views/dashboards via public links |

### EPIC 6: Real-time Collaboration
| ID | Feature | Priority | Phase | Sprint | Description |
|----|---------|----------|-------|--------|-------------|
| F042 | Presence System | 🟠 High | 1 | 4 | Show online users, live cursors |
| F043 | Cell Editing Presence | 🔴 Critical | 1 | 4 | See who is editing a cell |
| F044 | Cell Locking | 🔴 Critical | 1 | 4 | Lock cells during edit, respect workflow updates |
| F045 | Conflict Resolution | 🟠 High | 3 | TBD | Handle concurrent edit scenarios |

### EPIC 7: Automation
| ID | Feature | Priority | Phase | Sprint | Description |
|----|---------|----------|-------|--------|-------------|
| F030 | Workflow Engine | 🟡 Medium | 3 | TBD | Core automation system |
| F031 | Data Change Triggers | 🟡 Medium | 3 | TBD | On create/update/delete |
| F032 | Manual Triggers | 🟡 Medium | 3 | TBD | Button-click workflows |
| F033 | Scheduled Triggers | 🟡 Medium | 3 | TBD | Cron-based automation |
| F034 | Webhook Triggers | 🟡 Medium | 3 | TBD | External system integration |
| F035 | Actions Library | 🟡 Medium | 3 | TBD | Send email, update record, webhook, etc. |

### EPIC 8: Data Management
| ID | Feature | Priority | Phase | Sprint | Description |
|----|---------|----------|-------|--------|-------------|
| F037 | Import/Export | 🟡 Medium | 3 | TBD | CSV, Excel, JSON import/export |
| F039 | Audit Log | 🟡 Medium | 3 | TBD | Activity tracking |

### EPIC 9: DevOps & Deployment
| ID | Feature | Priority | Phase | Sprint | Description |
|----|---------|----------|-------|--------|-------------|
| F040 | Deployment | 🔴 Critical | 1 | 5 | Production deployment setup |

---

## Data Models (High-Level)

```
Company
├── Users (Company Admin, User)
├── User Groups
├── Invite Links
└── Workspaces
    ├── Folders
    │   ├── Tables
    │   │   ├── Columns (with data types including File)
    │   │   ├── Records (actual data)
    │   │   ├── File Attachments (via Nuxt Hub Blob)
    │   │   ├── Row Permissions
    │   │   └── Cell Locks (active edits)
    │   ├── Views (Table, Kanban, Calendar, etc.)
    │   │   └── Public Share Links
    │   └── Dashboards
    │       └── Public Share Links
    ├── Permissions (Folder, Item level)
    └── Collaboration State
        ├── Presence (online users, cursors)
        └── Active Cell Locks

Automation Workflows
├── Triggers (Data, Manual, Schedule, Webhook)
├── Actions
└── Cell Lock Awareness (respect locks during execution)
```

---

## Technical Specifications

### Cell Locking

**Purpose**: Prevent data conflicts when multiple users (or workflows) attempt to edit the same cell simultaneously.

**Lock Lifecycle**:
1. **Acquire Lock**: User starts editing a cell
2. **Hold Lock**: Lock maintained while editing (with timeout)
3. **Release Lock**: User saves or cancels
4. **Timeout**: Auto-release after 30 seconds of inactivity

**Lock Properties**:
```typescript
interface CellLock {
  id: string;
  tableId: string;
  recordId: string;
  columnId: string;
  lockedBy: string;
  lockedAt: DateTime;
  expiresAt: DateTime;
  lockType: 'user' | 'workflow';
}
```

### File Attachment Data Type

**Storage**: Files via Nuxt Hub Blob, metadata in database

```typescript
interface FileColumnConfig {
  type: 'file';
  allowMultiple: boolean;
  maxFileSize: number;
  allowedTypes: string[];
}

interface FileAttachment {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  url: string;
  uploadedAt: DateTime;
  uploadedBy: string;
}
```

---

*This is a living document. Features and priorities may evolve.*