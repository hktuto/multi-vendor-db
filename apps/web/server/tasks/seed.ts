import { db, schema } from '@nuxthub/db'
import { uuidv7 } from 'uuidv7'
import { eq } from 'drizzle-orm'

export default defineTask({
  meta: {
    name: 'db:seed',
    description: 'Seed database with initial data for development'
  },
  async run() {
    console.log('Seeding database...')

    // Check if test user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(schema.users.email, 'admin@example.com')
    })

    if (existingUser) {
      console.log('Test user already exists, skipping seed')
      return {
        result: 'Database already seeded',
        data: {
          user: { id: existingUser.id, email: existingUser.email }
        }
      }
    }

    const now = new Date()
    const userId = uuidv7()
    const companyId = uuidv7()
    const accountId = uuidv7()
    const memberId = uuidv7()
    const groupId = uuidv7()
    const groupMemberId = uuidv7()
    const spaceId = uuidv7()
    const spaceMemberId = uuidv7()
    const folderItemId = uuidv7()
    const tableItemId = uuidv7()
    const inviteId = uuidv7()

    // Hash password using nuxt-auth-utils
    const passwordHash = await hashPassword('admin123')

    // Create test user
    const [user] = await db.insert(schema.users).values({
      id: userId,
      email: 'admin@example.com',
      name: 'Admin User',
      avatarUrl: 'https://i.pravatar.cc/150?img=1',
      preferences: {
        theme: 'light',
        language: 'en'
      },
      createdAt: now,
      updatedAt: now,
      isActive: true
    }).returning()

    console.log('Created user:', user.email)

    // Create password account for user
    await db.insert(schema.userAccounts).values({
      id: accountId,
      userId: user.id,
      provider: 'password',
      providerAccountId: user.email,
      passwordHash: passwordHash,
      lastPasswordUpdate: now,
      metadata: {},
      createdAt: now,
      updatedAt: now
    })

    console.log('Created password account')

    // Create company
    const [company] = await db.insert(schema.companies).values({
      id: companyId,
      name: 'Acme Corp',
      slug: 'acme-corp',
      ownerId: user.id,
      settings: {
        timezone: 'UTC',
        dateFormat: 'YYYY-MM-DD',
        defaultLanguage: 'en',
        theme: {
          primary: '#3b82f6',
          sidebar: '#1e293b'
        }
      },
      createdAt: now,
      updatedAt: now
    }).returning()

    console.log('Created company:', company.name)

    // Add user as company member (admin)
    await db.insert(schema.companyMembers).values({
      id: memberId,
      companyId: company.id,
      userId: user.id,
      role: 'admin',
      joinedAt: now
    })

    console.log('Added user as company admin')

    // Create user group
    const [group] = await db.insert(schema.userGroups).values({
      id: groupId,
      companyId: company.id,
      name: 'Engineering',
      description: 'Engineering team members',
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    }).returning()

    console.log('Created user group:', group.name)

    // Add user to group
    await db.insert(schema.userGroupMembers).values({
      id: groupMemberId,
      companyId: company.id,
      groupId: group.id,
      userId: user.id,
      role: 'admin',
      addedBy: user.id,
      addedAt: now
    })

    console.log('Added user to group')

    // Create space (new unified design)
    const [space] = await db.insert(schema.spaces).values({
      id: spaceId,
      companyId: company.id,
      name: 'Main Space',
      description: 'Primary space for projects and data',
      icon: '🚀',
      color: '#3b82f6',
      settings: {
        defaultView: 'list',
        sidebarCollapsed: false
      },
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    }).returning()

    console.log('Created space:', space.name)

    // Add user as space admin
    await db.insert(schema.spaceMembers).values({
      id: spaceMemberId,
      spaceId: space.id,
      userId: user.id,
      role: 'admin',
      joinedAt: now,
      invitedBy: null
    })

    console.log('Added user as space admin')

    // Create folder item
    const [folderItem] = await db.insert(schema.spaceItems).values({
      id: folderItemId,
      spaceId: space.id,
      parentId: null,
      type: 'folder',
      name: 'Projects',
      description: 'Project folders and tables',
      icon: '📁',
      color: '#eab308',
      orderIndex: 0,
      config: {
        isExpanded: true
      },
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    }).returning()

    console.log('Created folder item:', folderItem.name)

    // Create table item inside folder
    const [tableItem] = await db.insert(schema.spaceItems).values({
      id: tableItemId,
      spaceId: space.id,
      parentId: folderItem.id,
      type: 'table',
      name: 'Project List',
      description: 'List of all projects',
      icon: '📊',
      color: '#10b981',
      orderIndex: 0,
      config: {
        schemaId: null,
        defaultView: 'grid'
      },
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    }).returning()

    console.log('Created table item:', tableItem.name)

    // Create invite link
    const [invite] = await db.insert(schema.inviteLinks).values({
      id: inviteId,
      companyId: company.id,
      createdBy: user.id,
      email: null,
      token: 'sample-invite-token-123',
      role: 'member',
      isActive: true,
      createdAt: now
    }).returning()

    console.log('Created invite link:', invite.token)

    console.log('✅ Database seeded successfully!')
    console.log('')
    console.log('Test Account:')
    console.log('  Email: admin@example.com')
    console.log('  Password: admin123')
    console.log('  Company: Acme Corp')
    console.log('  Space: Main Space')

    return { 
      result: 'Database seeded successfully',
      data: {
        user: { id: user.id, email: user.email },
        company: { id: company.id, name: company.name },
        space: { id: space.id, name: space.name }
      }
    }
  }
})
