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
    const workspaceId = uuidv7()
    const folderId = uuidv7()
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

    // Create workspace
    const [workspace] = await db.insert(schema.workspaces).values({
      id: workspaceId,
      companyId: company.id,
      name: 'Main Workspace',
      description: 'Primary workspace for projects',
      icon: 'lucide:layout-grid',
      color: '#3b82f6',
      menu: [
        {
          id: 'folder-1',
          type: 'folder',
          itemId: folderId,
          order: 0,
          children: [],
          permissions: {
            read: [user.id],
            readwrite: [user.id],
            manage: [user.id]
          }
        }
      ],
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    }).returning()

    console.log('Created workspace:', workspace.name)

    // Create folder
    const [folder] = await db.insert(schema.folders).values({
      id: folderId,
      companyId: company.id,
      workspaceId: workspace.id,
      name: 'Projects',
      icon: 'lucide:folder',
      color: '#eab308',
      orderIndex: 0,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now
    }).returning()

    console.log('Created folder:', folder.name)

    // Create invite link
    const [invite] = await db.insert(schema.inviteLinks).values({
      id: inviteId,
      companyId: company.id,
      createdBy: user.id,
      token: 'sample-invite-token-123',
      role: 'member',
      maxUses: 10,
      usedCount: 0,
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
    console.log('  Workspace: Main Workspace')

    return { 
      result: 'Database seeded successfully',
      data: {
        user: { id: user.id, email: user.email },
        company: { id: company.id, name: company.name },
        workspace: { id: workspace.id, name: workspace.name }
      }
    }
  }
})
