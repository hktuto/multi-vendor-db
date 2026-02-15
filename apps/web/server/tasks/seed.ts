import { db, schema } from '@nuxthub/db'

export default defineTask({
  meta: {
    name: 'db:seed',
    description: 'Seed database with initial data for development'
  },
  async run() {
    console.log('Seeding database...')

    // Create test user
    const [user] = await db.insert(schema.users).values({
      email: 'admin@example.com',
      name: 'Admin User',
      avatarUrl: 'https://i.pravatar.cc/150?img=1',
      preferences: {
        theme: 'light',
        language: 'en'
      },
      isActive: true
    }).returning()

    console.log('Created user:', user.email)

    // Create password account for user
    await db.insert(schema.userAccounts).values({
      userId: user.id,
      provider: 'password',
      providerAccountId: user.email,
      passwordHash: '$2a$10$YourHashedPasswordHere', // placeholder
      metadata: {}
    })

    console.log('Created password account')

    // Create company
    const [company] = await db.insert(schema.companies).values({
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
      }
    }).returning()

    console.log('Created company:', company.name)

    // Add user as company member (admin)
    await db.insert(schema.companyMembers).values({
      companyId: company.id,
      userId: user.id,
      role: 'admin'
    })

    console.log('Added user as company admin')

    // Create user group
    const [group] = await db.insert(schema.userGroups).values({
      companyId: company.id,
      name: 'Engineering',
      description: 'Engineering team members',
      createdBy: user.id
    }).returning()

    console.log('Created user group:', group.name)

    // Add user to group
    await db.insert(schema.userGroupMembers).values({
      groupId: group.id,
      userId: user.id,
      role: 'admin',
      addedBy: user.id
    })

    console.log('Added user to group')

    // Create workspace
    const [workspace] = await db.insert(schema.workspaces).values({
      companyId: company.id,
      name: 'Main Workspace',
      description: 'Primary workspace for projects',
      icon: 'lucide:layout-grid',
      color: '#3b82f6',
      menu: [
        {
          id: 'folder-1',
          type: 'folder',
          itemId: 'folder-id-placeholder',
          order: 0,
          children: [],
          permissions: {
            read: [user.id],
            readwrite: [user.id],
            manage: [user.id]
          }
        }
      ],
      createdBy: user.id
    }).returning()

    console.log('Created workspace:', workspace.name)

    // Create folder
    const [folder] = await db.insert(schema.folders).values({
      companyId: company.id,
      workspaceId: workspace.id,
      name: 'Projects',
      icon: 'lucide:folder',
      color: '#eab308',
      orderIndex: 0,
      createdBy: user.id
    }).returning()

    console.log('Created folder:', folder.name)

    // Create invite link
    const [invite] = await db.insert(schema.inviteLinks).values({
      companyId: company.id,
      createdBy: user.id,
      token: 'sample-invite-token-123',
      role: 'member',
      maxUses: 10,
      usedCount: 0,
      isActive: true
    }).returning()

    console.log('Created invite link:', invite.token)

    console.log('✅ Database seeded successfully!')
    console.log('')
    console.log('Test Account:')
    console.log('  Email: admin@example.com')
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
