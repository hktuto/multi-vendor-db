import { db, schema } from '@nuxthub/db'
import { uuidv7 } from 'uuidv7'
import { eq } from 'drizzle-orm'

// Test data configuration
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
  // Acme Corp spaces
  { companyIndex: 0, name: 'Engineering', icon: '⚙️', color: '#3b82f6' },
  { companyIndex: 0, name: 'Product', icon: '📱', color: '#8b5cf6' },
  { companyIndex: 0, name: 'Marketing', icon: '📢', color: '#ec4899' },
  // TechStart spaces
  { companyIndex: 1, name: 'Main', icon: '🚀', color: '#10b981' },
  { companyIndex: 1, name: 'Labs', icon: '🔬', color: '#f59e0b' },
  // Global Dynamics spaces
  { companyIndex: 2, name: 'Operations', icon: '🏭', color: '#6366f1' },
]

export default defineTask({
  meta: {
    name: 'db:seed',
    description: 'Seed database with comprehensive test data for development'
  },
  async run() {
    console.log('🌱 Seeding database with test data...\n')

    const now = new Date()
    const passwordHash = await hashPassword('admin123')

    // ============== CLEAR EXISTING DATA ==============
    console.log('🗑️  Clearing existing data...')
    
    // Delete in reverse order to avoid foreign key constraints
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

      // Create password account
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

    // Acme Corp members
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
    console.log(`  ✓ Acme Corp: ${users[0].name} (owner), ${users[1].name} (admin), ${users[2].name} (member)`)

    // TechStart members
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
    console.log(`  ✓ TechStart: ${users[1].name} (owner), ${users[3].name} (admin), ${users[0].name} (member)`)

    // Global Dynamics members
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
    console.log(`  ✓ Global Dynamics: ${users[0].name} (owner), ${users[4].name} (admin)`)

    // ============== CREATE USER GROUPS ==============
    console.log('\n👥 Creating user groups...')

    const engineeringGroup = await db.insert(schema.userGroups).values({
      id: uuidv7(),
      companyId: companies[0].id,
      name: 'Engineering Team',
      description: 'Core engineering team',
      createdBy: users[0].id,
      createdAt: now,
      updatedAt: now
    }).returning()

    await db.insert(schema.userGroupMembers).values({
      id: uuidv7(),
      companyId: companies[0].id,
      groupId: engineeringGroup[0].id,
      userId: users[0].id,
      role: 'admin',
      addedBy: users[0].id,
      addedAt: now
    })
    await db.insert(schema.userGroupMembers).values({
      id: uuidv7(),
      companyId: companies[0].id,
      groupId: engineeringGroup[0].id,
      userId: users[1].id,
      role: 'member',
      addedBy: users[0].id,
      addedAt: now
    })
    console.log(`  ✓ Engineering Team (Acme Corp)`)

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
    console.log(`  ✓ Engineering space: ${users[0].name} (admin), ${users[1].name} (editor), ${users[2].name} (viewer)`)

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
    console.log(`  ✓ Product space: ${users[0].name} (admin), ${users[2].name} (editor)`)

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
    console.log(`  ✓ Main space (TechStart): ${users[1].name} (admin), ${users[3].name} (editor), ${users[0].name} (viewer)`)

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

    console.log(`  ✓ Engineering: Sprints folder + Sprint 1 Tasks table + Bug Tracker table + Dashboard`)

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

    // ============== CREATE INVITE LINKS ==============
    console.log('\n📧 Creating invite links...')

    await db.insert(schema.inviteLinks).values({
      id: uuidv7(),
      companyId: companies[0].id,
      createdBy: users[0].id,
      email: 'newmember@example.com',
      token: 'invite-acme-member',
      role: 'member',
      isActive: true,
      createdAt: now
    })

    await db.insert(schema.inviteLinks).values({
      id: uuidv7(),
      companyId: companies[1].id,
      createdBy: users[1].id,
      email: null,
      token: 'invite-techstart-open',
      role: 'member',
      isActive: true,
      createdAt: now
    })

    console.log(`  ✓ Acme Corp: invite for newmember@example.com`)
    console.log(`  ✓ TechStart: open invite link`)

    // ============== SUMMARY ==============
    console.log('\n' + '='.repeat(60))
    console.log('✅ Database seeded successfully!')
    console.log('='.repeat(60))
    console.log('\n📋 Test Accounts (all use password: admin123):')
    console.log('')
    users.forEach((user, i) => {
      const companiesList = TEST_COMPANIES
        .map((c, ci) => ({ ...c, index: ci }))
        .filter(c => c.ownerIndex === i || (i === 1 && c.index === 0) || (i === 0 && c.index === 1))
        .map(c => c.name)
        .join(', ')
      console.log(`  ${i + 1}. ${user.name}`)
      console.log(`     Email: ${user.email}`)
      console.log(`     Companies: ${companiesList || 'None (can be invited)'}`)
      console.log('')
    })

    console.log('🏢 Companies:')
    companies.forEach((c, i) => {
      const spaceCount = spaces.filter(s => s.companyId === c.id).length
      console.log(`  • ${c.name} (${spaceCount} spaces)`)
    })

    console.log('\n🚀 Spaces:')
    spaces.forEach(s => {
      const company = companies.find(c => c.id === s.companyId)
      console.log(`  • ${s.name} (${company?.name}) - ${s.icon}`)
    })

    console.log('\n📝 Quick Test Scenarios:')
    console.log('  1. Login as admin@example.com - Full access to Acme Corp & Global Dynamics')
    console.log('  2. Login as john@example.com - Owner of TechStart, admin in Acme Corp')
    console.log('  3. Login as jane@example.com - Member in Acme Corp, editor in Product space')
    console.log('  4. Login as bob@example.com - Admin in TechStart, no access to Acme')
    console.log('  5. Test space switching between Engineering, Product, Marketing')
    console.log('  6. Test permissions: viewer cannot create items, editor can, admin can manage')
    console.log('')

    // ============== CREATE DEMO TABLE WITH COLUMNS & ROWS ==============
    console.log('\n📊 Creating demo table with columns and rows (FEAT-021)...')

    // Create "Orders" Table in Engineering space
    const ordersTable = await db.insert(schema.spaceItems).values({
      id: uuidv7(),
      spaceId: spaces[0].id,
      parentId: null,
      type: 'table',
      name: 'Orders',
      description: 'Customer orders tracking',
      icon: '📦',
      color: '#3b82f6',
      orderIndex: 2,
      config: {},
      createdBy: users[0].id,
      createdAt: now,
      updatedAt: now
    }).returning()

    // Create columns for Orders table
    const colCustomer = await db.insert(schema.spaceItemColumns).values({
      id: uuidv7(),
      itemId: ordersTable[0].id,
      name: 'Customer',
      key: 'customer_a1x2b',
      category: 'information',
      type: 'text',
      orderIndex: 0,
      config: { maxLength: 255 },
      createdAt: now,
      updatedAt: now
    }).returning()

    const colProduct = await db.insert(schema.spaceItemColumns).values({
      id: uuidv7(),
      itemId: ordersTable[0].id,
      name: 'Product',
      key: 'product_c3d4e',
      category: 'information',
      type: 'select',
      orderIndex: 1,
      config: { 
        options: [
          { id: 'p1', label: 'Laptop', color: '#3b82f6' },
          { id: 'p2', label: 'Mouse', color: '#10b981' },
          { id: 'p3', label: 'Keyboard', color: '#f59e0b' }
        ]
      },
      createdAt: now,
      updatedAt: now
    }).returning()

    const colQuantity = await db.insert(schema.spaceItemColumns).values({
      id: uuidv7(),
      itemId: ordersTable[0].id,
      name: 'Quantity',
      key: 'quantity_f5g6h',
      category: 'information',
      type: 'number',
      orderIndex: 2,
      config: { min: 1, max: 999 },
      createdAt: now,
      updatedAt: now
    }).returning()

    const colPrice = await db.insert(schema.spaceItemColumns).values({
      id: uuidv7(),
      itemId: ordersTable[0].id,
      name: 'Unit Price',
      key: 'unit_price_i7j8k',
      category: 'information',
      type: 'number',
      orderIndex: 3,
      config: { decimal: 2, min: 0 },
      createdAt: now,
      updatedAt: now
    }).returning()

    const colStatus = await db.insert(schema.spaceItemColumns).values({
      id: uuidv7(),
      itemId: ordersTable[0].id,
      name: 'Status',
      key: 'status_l9m0n',
      category: 'information',
      type: 'select',
      orderIndex: 4,
      config: {
        options: [
          { id: 'pending', label: 'Pending', color: '#f59e0b' },
          { id: 'processing', label: 'Processing', color: '#3b82f6' },
          { id: 'shipped', label: 'Shipped', color: '#10b981' },
          { id: 'cancelled', label: 'Cancelled', color: '#ef4444' }
        ]
      },
      defaultValue: 'pending',
      createdAt: now,
      updatedAt: now
    }).returning()

    const colTotal = await db.insert(schema.spaceItemColumns).values({
      id: uuidv7(),
      itemId: ordersTable[0].id,
      name: 'Total',
      key: 'total_o1p2q',
      category: 'dynamic',
      type: 'formula',
      orderIndex: 5,
      config: {
        expression: '{{quantity_f5g6h}} * {{unit_price_i7j8k}}',
        dependencies: ['quantity_f5g6h', 'unit_price_i7j8k'],
        format: { type: 'currency', symbol: '$', decimal: 2 }
      },
      createdAt: now,
      updatedAt: now
    }).returning()

    console.log(`  ✓ Orders table with ${6} columns created`)
    console.log(`    - Information: Customer, Product, Quantity, Unit Price, Status`)
    console.log(`    - Dynamic: Total (formula)`)

    // Create demo rows
    const demoRows = [
      { customer: 'ABC Corp', product: 'p1', quantity: 5, price: 1200, status: 'shipped' },
      { customer: 'XYZ Ltd', product: 'p2', quantity: 10, price: 25, status: 'processing' },
      { customer: 'TechStart Inc', product: 'p1', quantity: 3, price: 1200, status: 'pending' },
      { customer: 'Global Dynamics', product: 'p3', quantity: 8, price: 150, status: 'shipped' },
      { customer: 'Acme Corp', product: 'p2', quantity: 20, price: 25, status: 'cancelled' }
    ]

    for (const rowData of demoRows) {
      await db.insert(schema.spaceItemRows).values({
        id: uuidv7(),
        companyId: companies[0].id,
        spaceId: spaces[0].id,
        itemId: ordersTable[0].id,
        data: {
          [colCustomer[0].key]: { value: rowData.customer, type: 'text' },
          [colProduct[0].key]: { value: rowData.product, type: 'select', display: rowData.product },
          [colQuantity[0].key]: { value: rowData.quantity, type: 'number' },
          [colPrice[0].key]: { value: rowData.price, type: 'number' },
          [colStatus[0].key]: { value: rowData.status, type: 'select', display: rowData.status },
          [colTotal[0].key]: { value: rowData.quantity * rowData.price, type: 'formula', display: `$${(rowData.quantity * rowData.price).toFixed(2)}` }
        },
        createdBy: users[0].id,
        createdAt: now
      })
    }
    console.log(`  ✓ ${demoRows.length} demo rows created`)

    // Create a View based on Orders table
    const shippedView = await db.insert(schema.spaceItems).values({
      id: uuidv7(),
      spaceId: spaces[0].id,
      parentId: null,
      type: 'view',
      name: 'Shipped Orders',
      description: 'View of shipped orders only',
      icon: '✅',
      color: '#10b981',
      orderIndex: 3,
      config: {
        // View-specific config
        column_order: [colCustomer[0].id, colProduct[0].id, colQuantity[0].id, colTotal[0].id],
        filters: [
          { column: colStatus[0].key, operator: 'equals', value: 'shipped' }
        ],
        sorts: [
          { column: colTotal[0].key, direction: 'desc' }
        ],
        view_type: 'grid'
      },
      createdBy: users[0].id,
      createdAt: now,
      updatedAt: now
    }).returning()

    // View can have its own dynamic column (but stored in Orders table)
    const colDiscount = await db.insert(schema.spaceItemColumns).values({
      id: uuidv7(),
      itemId: ordersTable[0].id,  // Belongs to table, not view
      name: 'Discounted Total',
      key: 'discounted_r3s4t',
      category: 'dynamic',
      type: 'formula',
      orderIndex: 6,
      config: {
        expression: '{{total_o1p2q}} * 0.9',
        dependencies: ['total_o1p2q'],
        format: { type: 'currency', symbol: '$', decimal: 2 }
      },
      createdAt: now,
      updatedAt: now
    }).returning()

    // Update view config to include the new dynamic column
    await db.update(schema.spaceItems)
      .set({
        config: {
          column_order: [colCustomer[0].id, colProduct[0].id, colTotal[0].id, colDiscount[0].id],
          filters: [{ column: colStatus[0].key, operator: 'equals', value: 'shipped' }],
          sorts: [{ column: colTotal[0].key, direction: 'desc' }],
          view_type: 'grid'
        },
        updatedAt: now
      })
      .where(eq(schema.spaceItems.id, shippedView[0].id))

    console.log(`  ✓ View "Shipped Orders" created with filters and sorts`)
    console.log(`  ✓ View dynamic column "Discounted Total" added to Orders table`)

    return {
      result: 'Database seeded successfully',
      summary: {
        users: users.length,
        companies: companies.length,
        spaces: spaces.length,
        accounts: TEST_USERS.map(u => ({ email: u.email, password: 'admin123' }))
      }
    }
  }
})
