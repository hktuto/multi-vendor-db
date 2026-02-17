import { spaceItems } from '../../db/schema'
import { eq, and } from 'drizzle-orm'
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

  // Check permissions (admin or editor, or item creator)
  const canEdit = membership.role === 'admin' ||
                  membership.role === 'editor' ||
                  item.createdBy === user.id

  if (!canEdit) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Insufficient permissions'
    })
  }

  const body = await readBody(event)
  const { name, description, parentId, icon, color, config } = body

  // Build update object
  const updateData: Partial<typeof spaceItems.$inferInsert> = {
    updatedAt: new Date()
  }

  if (name !== undefined) updateData.name = name
  if (description !== undefined) updateData.description = description
  if (parentId !== undefined) updateData.parentId = parentId
  if (icon !== undefined) updateData.icon = icon
  if (color !== undefined) updateData.color = color
  if (config !== undefined) updateData.config = config

  const [updatedItem] = await db.update(spaceItems)
    .set(updateData)
    .where(eq(spaceItems.id, itemId))
    .returning()

  return updatedItem
})
