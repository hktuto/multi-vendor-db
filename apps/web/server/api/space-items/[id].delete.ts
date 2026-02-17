import { spaceItems } from '../../db/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { db } from '@nuxthub/db'
export default defineEventHandler(async (event) => {
  const itemId = getRouterParam(event, 'id')

  if (!itemId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Item ID is required'
    })
  }

  const { user } = await requireUserSession(event)


  // Get the item
  const item = await db.query.spaceItems.findFirst({
    where: eq(spaceItems.id, itemId)
  })

  if (!item) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Item not found'
    })
  }

  // Check space membership
  const membership = await db.query.spaceMembers.findFirst({
    where: (members, { eq, and }) => and(
      eq(members.spaceId, item.spaceId),
      eq(members.userId, user.id)
    )
  })

  if (!membership) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Access denied'
    })
  }

  // Check permissions (admin or item creator)
  const canDelete = membership.role === 'admin' || item.createdBy === user.id

  if (!canDelete) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Insufficient permissions'
    })
  }

  // For folders, move children to root level (set parentId to null)
  if (item.type === 'folder') {
    await db.update(spaceItems)
      .set({ parentId: null, updatedAt: new Date() })
      .where(eq(spaceItems.parentId, itemId))
  }

  // Soft delete the item
  const [deletedItem] = await db.update(spaceItems)
    .set({ deletedAt: new Date() })
    .where(eq(spaceItems.id, itemId))
    .returning()

  return { success: true, item: deletedItem }
})
