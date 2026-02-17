import { db } from '@nuxthub/db'
import { eq, and } from 'drizzle-orm'
import { spaceItemPermissions } from '../../../../db/schema'

// PATCH /api/space-items/[id]/permissions/[userId] - Update permission
export default defineEventHandler(async (event) => {
  const itemId = getRouterParam(event, 'id')
  const userId = getRouterParam(event, 'userId')
  
  if (!itemId || !userId) {
    throw createError({ statusCode: 400, statusMessage: 'Item ID and User ID required' })
  }

  const { user } = await requireUserSession(event)
  const body = await readBody(event)

  try {
    const [updated] = await db.update(spaceItemPermissions)
      .set({ 
        permission: body.permission,
        createdAt: new Date()
      })
      .where(and(
        eq(spaceItemPermissions.itemId, itemId),
        eq(spaceItemPermissions.userId, userId)
      ))
      .returning()

    if (!updated) {
      throw createError({ statusCode: 404, statusMessage: 'Permission not found' })
    }

    return updated
  } catch (error: any) {
    throw createError({ 
      statusCode: 500, 
      statusMessage: error.message || 'Failed to update permission' 
    })
  }
})