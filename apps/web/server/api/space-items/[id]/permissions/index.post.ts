import { db } from '@nuxthub/db'
import { eq, and } from 'drizzle-orm'
import { spaceItemPermissions } from '../../../../../db/schema'
import { uuidv7 } from 'uuidv7'

// POST /api/space-items/[id]/permissions - Add permission
export default defineEventHandler(async (event) => {
  const itemId = getRouterParam(event, 'id')
  
  if (!itemId) {
    throw createError({ statusCode: 400, statusMessage: 'Item ID required' })
  }

  const { user } = await requireUserSession(event)
  const body = await readBody(event)

  if (!body.userId || !body.permission) {
    throw createError({ statusCode: 400, statusMessage: 'userId and permission required' })
  }

  try {
    // Check if permission already exists
    const existing = await db.query.spaceItemPermissions.findFirst({
      where: and(
        eq(spaceItemPermissions.itemId, itemId),
        eq(spaceItemPermissions.userId, body.userId)
      )
    })

    if (existing) {
      // Update existing
      const [updated] = await db.update(spaceItemPermissions)
        .set({ 
          permission: body.permission,
          createdAt: new Date()
        })
        .where(eq(spaceItemPermissions.id, existing.id))
        .returning()
      return updated
    }

    // Create new
    const [permission] = await db.insert(spaceItemPermissions).values({
      id: uuidv7(),
      itemId: itemId,
      userId: body.userId,
      permission: body.permission,
      createdAt: new Date()
    }).returning()

    return permission
  } catch (error: any) {
    throw createError({ 
      statusCode: 500, 
      statusMessage: error.message || 'Failed to add permission' 
    })
  }
})