// API endpoint to reset and reseed database
import { db, schema } from '@nuxthub/db'
import { uuidv7 } from 'uuidv7'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Not allowed in production'
    })
  }

  console.log('🌱 Reseeding database...\n')

  const now = new Date()
  const passwordHash = await hashPassword('admin123')

  // ============== CLEAR EXISTING DATA ==============
  console.log('🗑️  Clearing existing data...')
  
  await db.delete(schema.inviteLinks)
  await db.delete(schema.spaceItems)
  await db.delete(schema.spaceMembers)
  await db.delete(schema.spaces)
  await db.delete(schema.userGroupMembers)
  await db.delete(schema.userGroups)
  await db.delete(schema.companyMembers)
  await db.delete(schema.companies)
  await db.delete(schema.userAccounts)
  await db.delete(schema.users)
  
  console.log('  ✓ All existing data cleared')

  // Test data
  const TEST_USERS = [
    { email: 'admin@example.com', name: 'Admin User', avatar: 1 },
    { email: 'john@example.com', name: 'John Smith', avatar: 2 },
    { email: 'jane@example.com', name: 'Jane Doe', avatar: 3 },
    { email: 'bob@example.com', name: 'Bob Wilson', avatar: 4 },
    { email: 'alice@example.com', name: 'Alice Chen', avatar: 5 },
  ]

  const TEST_COMPANIES = [
    { name: 'Acme Corp', slug: 'acme-corp', ownerIndex: 0 },
    { name: 'TechStart Inc', slug: 'techstart', ownerIndex: 1 },
    { name: 'Global Dynamics', slug: 'global-dynamics', ownerIndex: 0 },
  ]

  const TEST_SPACES = [
    { companyIndex: 0, name: 'Engineering', icon: '⚙️', color: '#3b82f6' },
    { companyIndex: 0, name: 'Product', icon: '📱', color: '#8b5cf6' },
    { companyIndex: 0, name: 'Marketing', icon: '📢', color: '#ec4899' },
    { companyIndex: 1, name: 'Main', icon: '🚀', color: '#10b981' },
    { companyIndex: 1, name: 'Labs', icon: '🔬', color: '#f59e0b' },
    { companyIndex: 2, name: 'Operations', icon: '🏭', color: '#6366f1' },
  ]

  // ============== CREATE USERS ==============
  console.log('👥 Creating test users...')
  const users: any[] = []

  for (const userData of TEST_USERS) {
    const userId = uuidv7()
    const [user] = await db.insert(schema.users).values({
      id: userId,
      email: userData.email,
      name: userData.name,
      avatarUrl: `https://i.pravatar.cc/150?img=${userData.avatar}`,
      preferences: { theme: 'light', language: 'en' },
      createdAt: now,
      updatedAt: now,
      isActive: true
    }).returning()

    await db.insert(schema.userAccounts).values({
      id: uuidv7(),
      userId: user.id,
      provider: 'password',
      providerAccountId: user.email,
      passwordHash: passwordHash,
      lastPasswordUpdate: now,
      metadata: {},
      createdAt: now,
      updatedAt: now
    })

    users.push(user)
    console.log(`  ✓ ${user.name} (${user.email})`)
  }

  // ============== CREATE COMPANIES ==============
  console.log('\n🏢 Creating companies...')
  const companies: any[] = []

  for (const companyData of TEST_COMPANIES) {
    const owner = users[companyData.ownerIndex]
    const [company] = await db.insert(schema.companies).values({
      id: uuidv7(),
      name: companyData.name,
      slug: companyData.slug,
      ownerId: owner.id,
      settings: {
        timezone: 'UTC',
        dateFormat: 'YYYY-MM-DD',
        defaultLanguage: 'en',
        theme: { primary: '#3b82f6', sidebar: '#1e293b' }
      },
      createdAt: now,
      updatedAt: now
    }).returning()

    companies.push(company)
    console.log(`  ✓ ${company.name} (owner: ${owner.name})`)
  }

  // ============== CREATE COMPANY MEMBERSHIPS ==============
  console.log('\n👥 Setting up company memberships...')

  await db.insert(schema.companyMembers).values({
    id: uuidv7(),
    companyId: companies[0].id,
    userId: users[0].id,
    role: 'admin',
    joinedAt: now
  })
  await db.insert(schema.companyMembers).values({
    id: uuidv7(),
    companyId: companies[0].id,
    userId: users[1].id,
    role: 'admin',
    joinedAt: now
  })
  await db.insert(schema.companyMembers).values({
    id: uuidv7(),
    companyId: companies[0].id,
    userId: users[2].id,
    role: 'member',
    joinedAt: now
  })
  console.log(`  ✓ Acme Corp memberships`)

  await db.insert(schema.companyMembers).values({
    id: uuidv7(),
    companyId: companies[1].id,
    userId: users[1].id,
    role: 'admin',
    joinedAt: now
  })
  await db.insert(schema.companyMembers).values({
    id: uuidv7(),
    companyId: companies[1].id,
    userId: users[3].id,
    role: 'admin',
    joinedAt: now
  })
  await db.insert(schema.companyMembers).values({
    id: uuidv7(),
    companyId: companies[1].id,
    userId: users[0].id,
    role: 'member',
    joinedAt: now
  })
  console.log(`  ✓ TechStart memberships`)

  await db.insert(schema.companyMembers).values({
    id: uuidv7(),
    companyId: companies[2].id,
    userId: users[0].id,
    role: 'member',
    joinedAt: now
  })
  await db.insert(schema.companyMembers).values({
    id: uuidv7(),
    companyId: companies[2].id,
    userId: users[4].id,
    role: 'admin',
    joinedAt: now
  })
  console.log(`  ✓ Global Dynamics memberships`)

  // ============== CREATE SPACES ==============
  console.log('\n🚀 Creating spaces...')
  const spaces: any[] = []

  for (const spaceData of TEST_SPACES) {
    const company = companies[spaceData.companyIndex]
    const owner = users[TEST_COMPANIES[spaceData.companyIndex].ownerIndex]

    const [space] = await db.insert(schema.spaces).values({
      id: uuidv7(),
      companyId: company.id,
      name: spaceData.name,
      description: `${spaceData.name} space for ${company.name}`,
      icon: spaceData.icon,
      color: spaceData.color,
      settings: { defaultView: 'list', sidebarCollapsed: false },
      createdBy: owner.id,
      createdAt: now,
      updatedAt: now
    }).returning()

    spaces.push(space)
    console.log(`  ✓ ${space.name} (${company.name})`)
  }

  // ============== CREATE SPACE MEMBERSHIPS ==============
  console.log('\n👥 Setting up space memberships...')

  // Engineering space members
  await db.insert(schema.spaceMembers).values({
    id: uuidv7(),
    spaceId: spaces[0].id,
    userId: users[0].id,
    role: 'admin',
    joinedAt: now,
    invitedBy: null
  })
  await db.insert(schema.spaceMembers).values({
    id: uuidv7(),
    spaceId: spaces[0].id,
    userId: users[1].id,
    role: 'editor',
    joinedAt: now,
    invitedBy: users[0].id
  })
  await db.insert(schema.spaceMembers).values({
    id: uuidv7(),
    spaceId: spaces[0].id,
    userId: users[2].id,
    role: 'viewer',
    joinedAt: now,
    invitedBy: users[0].id
  })
  console.log(`  ✓ Engineering space memberships`)

  // Product space members
  await db.insert(schema.spaceMembers).values({
    id: uuidv7(),
    spaceId: spaces[1].id,
    userId: users[0].id,
    role: 'admin',
    joinedAt: now,
    invitedBy: null
  })
  await db.insert(schema.spaceMembers).values({
    id: uuidv7(),
    spaceId: spaces[1].id,
    userId: users[2].id,
    role: 'editor',
    joinedAt: now,
    invitedBy: users[0].id
  })
  console.log(`  ✓ Product space memberships`)

  // Main space (TechStart) - all members
  await db.insert(schema.spaceMembers).values({
    id: uuidv7(),
    spaceId: spaces[3].id,
    userId: users[1].id,
    role: 'admin',
    joinedAt: now,
    invitedBy: null
  })
  await db.insert(schema.spaceMembers).values({
    id: uuidv7(),
    spaceId: spaces[3].id,
    userId: users[3].id,
    role: 'editor',
    joinedAt: now,
    invitedBy: users[1].id
  })
  await db.insert(schema.spaceMembers).values({
    id: uuidv7(),
    spaceId: spaces[3].id,
    userId: users[0].id,
    role: 'viewer',
    joinedAt: now,
    invitedBy: users[1].id
  })
  console.log(`  ✓ Main space memberships`)

  // ============== CREATE SPACE ITEMS ==============
  console.log('\n📁 Creating space items...')

  // Engineering space items
  const engFolder = await db.insert(schema.spaceItems).values({
    id: uuidv7(),
    spaceId: spaces[0].id,
    parentId: null,
    type: 'folder',
    name: 'Sprints',
    description: 'Sprint planning and tracking',
    icon: '📅',
    color: '#3b82f6',
    orderIndex: 0,
    config: { isExpanded: true },
    createdBy: users[0].id,
    createdAt: now,
    updatedAt: now
  }).returning()

  const sprintTable = await db.insert(schema.spaceItems).values({
    id: uuidv7(),
    spaceId: spaces[0].id,
    parentId: engFolder[0].id,
    type: 'table',
    name: 'Sprint 1 Tasks',
    description: 'Tasks for Sprint 1',
    icon: '📊',
    color: '#10b981',
    orderIndex: 0,
    config: { schemaId: null, defaultView: 'grid' },
    createdBy: users[0].id,
    createdAt: now,
    updatedAt: now
  }).returning()

  const bugsTable = await db.insert(schema.spaceItems).values({
    id: uuidv7(),
    spaceId: spaces[0].id,
    parentId: engFolder[0].id,
    type: 'table',
    name: 'Bug Tracker',
    description: 'Bug tracking and fixes',
    icon: '🐛',
    color: '#ef4444',
    orderIndex: 1,
    config: { schemaId: null, defaultView: 'list' },
    createdBy: users[1].id,
    createdAt: now,
    updatedAt: now
  }).returning()

  await db.insert(schema.spaceItems).values({
    id: uuidv7(),
    spaceId: spaces[0].id,
    parentId: null,
    type: 'dashboard',
    name: 'Engineering Dashboard',
    description: 'Team metrics and overview',
    icon: '📈',
    color: '#8b5cf6',
    orderIndex: 1,
    config: { widgets: [] },
    createdBy: users[0].id,
    createdAt: now,
    updatedAt: now
  })

  console.log(`  ✓ Engineering: Sprints folder + 2 tables + Dashboard`)

  // Product space items
  const roadmapFolder = await db.insert(schema.spaceItems).values({
    id: uuidv7(),
    spaceId: spaces[1].id,
    parentId: null,
    type: 'folder',
    name: 'Roadmap',
    description: 'Product roadmap and planning',
    icon: '🗺️',
    color: '#f59e0b',
    orderIndex: 0,
    config: { isExpanded: true },
    createdBy: users[0].id,
    createdAt: now,
    updatedAt: now
  }).returning()

  await db.insert(schema.spaceItems).values({
    id: uuidv7(),
    spaceId: spaces[1].id,
    parentId: roadmapFolder[0].id,
    type: 'view',
    name: 'Q1 Features',
    description: 'Q1 feature prioritization',
    icon: '👁️',
    color: '#ec4899',
    orderIndex: 0,
    config: { tableId: sprintTable[0].id, filters: [] },
    createdBy: users[2].id,
    createdAt: now,
    updatedAt: now
  })

  console.log(`  ✓ Product: Roadmap folder + Q1 Features view`)

  // Main space items (TechStart)
  await db.insert(schema.spaceItems).values({
    id: uuidv7(),
    spaceId: spaces[3].id,
    parentId: null,
    type: 'table',
    name: 'Customers',
    description: 'Customer database',
    icon: '👥',
    color: '#06b6d4',
    orderIndex: 0,
    config: { schemaId: null, defaultView: 'grid' },
    createdBy: users[1].id,
    createdAt: now,
    updatedAt: now
  })

  await db.insert(schema.spaceItems).values({
    id: uuidv7(),
    spaceId: spaces[3].id,
    parentId: null,
    type: 'dashboard',
    name: 'Startup Metrics',
    description: 'Key startup metrics',
    icon: '🎯',
    color: '#84cc16',
    orderIndex: 1,
    config: { widgets: [] },
    createdBy: users[1].id,
    createdAt: now,
    updatedAt: now
  })

  console.log(`  ✓ Main (TechStart): Customers table + Startup Metrics dashboard`)

  // ============== SUMMARY ==============
  console.log('\n' + '='.repeat(60))
  console.log('✅ Database reseeded successfully!')
  console.log('='.repeat(60))
  console.log('\n📋 Test Accounts (password: admin123):')
  console.log('  1. admin@example.com (Admin User)')
  console.log('  2. john@example.com (John Smith)')
  console.log('  3. jane@example.com (Jane Doe)')
  console.log('')
  console.log('🏢 Companies:', companies.length)
  console.log('🚀 Spaces:', spaces.length)
  console.log('📁 Space Items: 8')

  return {
    success: true,
    result: 'Database reseeded successfully',
    summary: {
      users: users.length,
      companies: companies.length,
      spaces: spaces.length,
      spaceItems: 8
    }
  }
})
