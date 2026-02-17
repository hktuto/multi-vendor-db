import { db } from '@nuxthub/db'
import { eq, and } from 'drizzle-orm'
import { spaceItemPermissions } from '../../../../db/schema'

// DELETE /api/space-items/[id]/permissions/[userId] - Remove permission
export default defineEventHandler(async (event) => {
  const itemId = getRouterParam(event, 'id')
  const userId = getRouterParam(event, 'userId')
  
  if (!itemId || !userId) {
    throw createError({ statusCode: 400, statusMessage: 'Item ID and User ID required' })
  }

  const { user } = await requireUserSession(event)

  try {
    const [deleted] = await db.delete(spaceItemPermissions)
      .where(and(
        eq(spaceItemPermissions.itemId, itemId),
        eq(spaceItemPermissions.userId, userId)
      ))
      .returning()

    if (!deleted) {
      throw createError({ statusCode: 404, statusMessage: 'Permission not found' })
    }

    return { success: true, deleted: deleted.id }
  } catch (error: any) {
    throw createError({ 
      statusCode: 500, 
      statusMessage: error.message || 'Failed to remove permission' 
    })
  }
})